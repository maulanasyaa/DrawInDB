import React, { useCallback, useRef } from 'react';
import ReactFlow, { Background, Controls, useReactFlow } from 'reactflow';
import { useEditorStore } from '../../store/editorStore';
import { isGraphType } from '../../config/diagramTypes';

/**
 * Kanvas React Flow untuk tipe `tables`/`graph`. Dipindah apa adanya dari
 * `pages/Editor.jsx` supaya `Editor.jsx` tinggal merender `editorConfig.canvas`
 * (tipe non-React-Flow, mis. sequence, menyediakan kanvas sendiri).
 *
 * Harus dirender DI DALAM `ReactFlowProvider` — memakai `useReactFlow()`.
 */
export default function ReactFlowCanvas({ editorConfig }) {
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();

  const diagramType = useEditorStore((state) => state.diagramMeta?.type);
  const tables = useEditorStore((state) => state.tables);
  const relationships = useEditorStore((state) => state.relationships);
  const nodes = useEditorStore((state) => state.nodes);
  const flowEdges = useEditorStore((state) => state.flowEdges);
  const canvasState = useEditorStore((state) => state.canvasState);
  const onNodesChange = useEditorStore((state) => state.onNodesChange);
  const onEdgesChange = useEditorStore((state) => state.onEdgesChange);
  const onConnect = useEditorStore((state) => state.onConnect);
  const updateCanvas = useEditorStore((state) => state.updateCanvas);
  const setSelectedTable = useEditorStore((state) => state.setSelectedTable);

  const isNodeBased = isGraphType(diagramType);
  const addNode = editorConfig.addNode;

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

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
      if (!isNodeBased) setSelectedTable(node.id);
    },
    [setSelectedTable, isNodeBased],
  );

  const onPaneClick = useCallback(() => {
    if (!isNodeBased) setSelectedTable(null);
  }, [setSelectedTable, isNodeBased]);

  return (
    <div className="flex-1 relative flex" ref={reactFlowWrapper}>
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
        deleteKeyCode={['Backspace', 'Delete']}
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
  );
}
