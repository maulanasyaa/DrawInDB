import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, { 
  Background, ReactFlowProvider, useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useEditorStore } from '../store/editorStore';
import { useVaultStore } from '../store/vaultStore';
import { useEditorShortcuts } from '../hooks/useEditorShortcuts';
import { generateSQL } from '../utils/sqlGenerator';

import TableNode from '../components/editor/TableNode';
import Toolbar from '../components/editor/Toolbar';
import Sidebar from '../components/editor/Sidebar';
import SQLPanel from '../components/editor/SQLPanel';
import EmptyState from '../components/EmptyState';

function EditorContent() {
  const { filename } = useParams();
  const navigate = useNavigate();
  const vaultPath = useVaultStore(state => state.currentVault?.path);
  
  const isLoading = useEditorStore(state => state.isLoading);
  const diagramMeta = useEditorStore(state => state.diagramMeta);
  const loadDiagram = useEditorStore(state => state.loadDiagram);
  const addTable = useEditorStore(state => state.addTable);
  const setSelectedTable = useEditorStore(state => state.setSelectedTable);
  const setCanvasState = useEditorStore(state => state.setCanvasState);
  const toggleSidebar = useEditorStore(state => state.toggleSidebar);

  const storeTables = useEditorStore(state => state.tables);
  const storeRelationships = useEditorStore(state => state.relationships);
  const onNodesChangeStore = useEditorStore(state => state.onNodesChange);
  const onEdgesChangeStore = useEditorStore(state => state.onEdgesChange);
  const onConnectStore = useEditorStore(state => state.onConnect);
  
  const { screenToFlowPosition, getViewport } = useReactFlow();

  const [showSQLPanel, setShowSQLPanel] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  // Shortcuts
  useEditorShortcuts({
    onToggleSidebar: toggleSidebar,
    onEscape: () => {
      setSelectedTable(null);
      setShowSQLPanel(false);
      setContextMenu(null);
    }
  });

  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

  useEffect(() => {
    if (!vaultPath) {
      navigate('/');
      return;
    }
    loadDiagram(vaultPath, filename);
  }, [vaultPath, filename, navigate, loadDiagram]);

  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
    setContextMenu(null);
  }, [setSelectedTable]);

  const onDoubleClick = useCallback((event) => {
    // Only trigger if double clicking the pane, not a node or edge
    if (event.target.closest('.react-flow__node') || event.target.closest('.react-flow__edge')) {
      return;
    }
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    addTable(position);
  }, [addTable, screenToFlowPosition]);

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const handleAddTableFromMenu = () => {
    if (contextMenu) {
      const position = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y });
      addTable(position);
    }
    setContextMenu(null);
  };

  const onMoveEnd = useCallback((event, viewport) => {
    setCanvasState(viewport);
  }, [setCanvasState]);

  const onNodeDragStop = useCallback((event, node) => {
    const { tables } = useEditorStore.getState();
    const otherNodes = tables.filter((n) => n.id !== node.id);

    // Default dimensions for a TableNode
    const w1 = node.width || 260;
    const h1 = node.height || 200;

    let finalX = node.position.x;
    let finalY = node.position.y;
    let isOverlapping = true;
    let attempts = 0;

    while (isOverlapping && attempts < 50) {
      isOverlapping = false;
      for (const other of otherNodes) {
        const w2 = other.width || 260;
        const h2 = other.height || 200;

        const collideX = finalX < other.position.x + w2 && finalX + w1 > other.position.x;
        const collideY = finalY < other.position.y + h2 && finalY + h1 > other.position.y;

        if (collideX && collideY) {
          finalX += 40;
          finalY += 40;
          isOverlapping = true;
          break;
        }
      }
      attempts++;
    }

    if (attempts > 0) {
      onNodesChangeStore([{ id: node.id, type: 'position', position: { x: finalX, y: finalY } }]);
    }
  }, [onNodesChangeStore]);

  const handleToggleSQLPanel = () => {
    if (!showSQLPanel) {
      // Generate SQL right before opening
      const sql = generateSQL({
        meta: diagramMeta,
        tables: storeTables,
        relationships: storeRelationships
      });
      setGeneratedSQL(sql);
    }
    setShowSQLPanel(!showSQLPanel);
  };

  if (isLoading || !diagramMeta) {
    return <div className="flex h-screen items-center justify-center bg-base text-muted">Loading diagram...</div>;
  }

  // To make edges blue when table is selected
  const activeTableId = useEditorStore.getState().selectedTableId;
  const edgeArray = storeRelationships.map(edge => ({
    ...edge,
    style: { 
      ...edge.style, 
      stroke: (edge.source === activeTableId || edge.target === activeTableId) ? 'var(--accent)' : 'var(--text-muted)' 
    },
    animated: (edge.source === activeTableId || edge.target === activeTableId)
  }));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base">
      <Toolbar onToggleSQL={handleToggleSQLPanel} />
      <div className="flex-1 relative overflow-hidden">
        {/* Sidebar is now positioned absolutely within this relative container */}
        <Sidebar />
        
        <div className="absolute inset-0 z-0">
          {storeTables.length === 0 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-70">
              <EmptyState 
                title="Your canvas is empty" 
                description="Double-click anywhere or click '+ Add Table' to start." 
              />
            </div>
          )}
          
          <ReactFlow
            nodes={storeTables}
            edges={edgeArray}
            onNodesChange={onNodesChangeStore}
            onEdgesChange={onEdgesChangeStore}
            onConnect={onConnectStore}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            onPaneClick={onPaneClick}
            onDoubleClick={onDoubleClick}
            onPaneContextMenu={onPaneContextMenu}
            onMoveEnd={onMoveEnd}
            minZoom={0.2}
            maxZoom={3}
            snapToGrid={false}
            defaultViewport={useEditorStore.getState().canvasState}
            proOptions={{ hideAttribution: true }}
            className="bg-base"
          >
            <Background variant="dots" gap={28} size={2} color="var(--dot-color)" />
          </ReactFlow>

          {contextMenu && (
            <div 
              className="absolute bg-surface border border-theme rounded shadow-xl z-50 py-1"
              style={{ top: contextMenu.y - 56 /* Toolbar height */, left: contextMenu.x }}
            >
              <button 
                onClick={handleAddTableFromMenu}
                className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover"
              >
                Add Table Here
              </button>
            </div>
          )}

          {showSQLPanel && (
            <SQLPanel 
              sql={generatedSQL}
              diagramName={diagramMeta.name}
              dbType={diagramMeta.db_type}
              onClose={() => setShowSQLPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <EditorContent />
    </ReactFlowProvider>
  );
}
