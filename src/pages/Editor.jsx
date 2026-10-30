import React, { useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { AnimatePresence } from "framer-motion";

import { useVaultStore } from "../store/vaultStore";
import { useEditorStore } from "../store/editorStore";
import { isGraphType } from "../config/diagramTypes";
import { getEditorConfig } from "../config/editorTypes.jsx";

import EditorHeader from "../components/editor/EditorHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import { useEditorShortcuts } from "../hooks/useEditorShortcuts";

function EditorContent() {
  const reactFlowWrapper = useRef(null);
  const { projectId, filename } = useParams();
  const navigate = useNavigate();
  const { project } = useReactFlow();

  useEditorShortcuts();

  const vaultPath = useVaultStore((state) => state.currentVault?.path);

  const loadDiagram = useEditorStore((state) => state.loadDiagram);
  const isLoading = useEditorStore((state) => state.isLoading);
  const diagramMeta = useEditorStore((state) => state.diagramMeta);

  const tables = useEditorStore((state) => state.tables);
  const relationships = useEditorStore((state) => state.relationships);
  const nodes = useEditorStore((state) => state.nodes);
  const flowEdges = useEditorStore((state) => state.flowEdges);

  const canvasState = useEditorStore((state) => state.canvasState);
  const isSidebarOpen = useEditorStore((state) => state.isSidebarOpen);

  const onNodesChange = useEditorStore((state) => state.onNodesChange);
  const onEdgesChange = useEditorStore((state) => state.onEdgesChange);
  const onConnect = useEditorStore((state) => state.onConnect);
  const updateCanvas = useEditorStore((state) => state.updateCanvas);

  const setSelectedTable = useEditorStore((state) => state.setSelectedTable);

  const diagramType = diagramMeta?.type;
  const editorConfig = getEditorConfig(diagramType);
  const EditorSidebar = editorConfig.sidebar;
  const EditorOverlay = editorConfig.overlays;
  const isNodeBased = isGraphType(diagramType);

  const cleanup = useEditorStore((state) => state.cleanup);

  useEffect(() => {
    if (!vaultPath) {
      navigate("/");
      return;
    }
    loadDiagram(vaultPath, projectId, filename);
  }, [vaultPath, projectId, filename, navigate, loadDiagram]);

  // Cleanup on unmount or before loading new diagram
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const addNode = editorConfig.addNode;

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (typeof type === "undefined" || !type) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(type, position);
    },
    [project, addNode],
  );

  const onNodeClick = useCallback(
    (_, node) => {
      if (!isNodeBased) {
        setSelectedTable(node.id);
      }
    },
    [setSelectedTable, isNodeBased],
  );

  const onPaneClick = useCallback(() => {
    if (!isNodeBased) {
      setSelectedTable(null);
    }
  }, [setSelectedTable, isNodeBased]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-muted">
        <LoadingSpinner text="Loading workspace..." />
      </div>
    );
  }

  const renderSidebar = () => {
    if (!isSidebarOpen) return null;
    return <EditorSidebar />;
  };


  return (
    <div className="flex flex-col h-screen w-full bg-canvas text-primary overflow-hidden relative">
      <EditorHeader />

      <div className="flex-1 relative flex" ref={reactFlowWrapper}>
        <AnimatePresence>{renderSidebar()}</AnimatePresence>

        {EditorOverlay && <EditorOverlay />}

        {editorConfig.tips}

        {/* deleteKeyCode default React Flow hanya "Backspace"; tambah Delete
            (keyboard Mac tanpa Backspace). Ini BUKAN penyebab seleksi node
            gagal — lihat onNodesChange di editorStore. */}
        <ReactFlow
          nodes={isNodeBased ? nodes : tables}
          edges={isNodeBased ? flowEdges : relationships}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          deleteKeyCode={["Backspace", "Delete"]}
          defaultEdgeOptions={editorConfig.defaultEdge}
          onInit={(instance) => {
            instance.setViewport({
              x: canvasState.x || 0,
              y: canvasState.y || 0,
              zoom: canvasState.zoom || 1,
            });
          }}
          onMoveEnd={(event, viewport) => {
            updateCanvas(viewport);
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={editorConfig.nodeTypes}
          edgeTypes={editorConfig.edgeTypes}
          minZoom={0.1}
          maxZoom={2}
          snapToGrid
          snapGrid={[12, 12]}
          className="bg-canvas"
        >
          <Background color="#555" gap={24} size={1} />
          <Controls className="!bg-surface !border-theme !fill-primary !text-primary shadow-lg" />
        </ReactFlow>
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
