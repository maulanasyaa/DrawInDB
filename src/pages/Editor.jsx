import React, { useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiInfo } from "react-icons/fi";
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

import EditorHeader from "../components/editor/EditorHeader";
import Sidebar from "../components/editor/Sidebar";
import FlowchartSidebar from "../components/editor/FlowchartSidebar";
import TableNode from "../components/editor/TableNode";
import FlowchartNode from "../components/editor/FlowchartNode";
import LoadingSpinner from "../components/LoadingSpinner";

const nodeTypes = {
  table: TableNode,
  flowchart: FlowchartNode,
};

function EditorContent() {
  const reactFlowWrapper = useRef(null);
  const { projectId, filename } = useParams();
  const navigate = useNavigate();
  const { project } = useReactFlow();

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
  const addTable = useEditorStore((state) => state.addTable);
  const addFlowNode = useEditorStore((state) => state.addFlowNode);
  const updateCanvas = useEditorStore((state) => state.updateCanvas);

  const setSelectedTable = useEditorStore((state) => state.setSelectedTable);

  const isFlowchart = diagramMeta?.type === "flowchart";

  useEffect(() => {
    if (!vaultPath) {
      navigate("/");
      return;
    }
    loadDiagram(vaultPath, projectId, filename);
  }, [vaultPath, projectId, filename, navigate, loadDiagram]);

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

      if (isFlowchart) {
        addFlowNode(type, position);
      } else {
        if (type === "table") {
          addTable(position);
        }
      }
    },
    [project, addTable, addFlowNode, isFlowchart],
  );

  const onNodeClick = useCallback(
    (_, node) => {
      if (!isFlowchart) {
        setSelectedTable(node.id);
      }
    },
    [setSelectedTable, isFlowchart],
  );

  const onPaneClick = useCallback(() => {
    if (!isFlowchart) {
      setSelectedTable(null);
    }
  }, [setSelectedTable, isFlowchart]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-muted">
        <LoadingSpinner text="Loading workspace..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-canvas text-primary overflow-hidden relative">
      <EditorHeader />

      <div className="flex-1 relative flex" ref={reactFlowWrapper}>
        <AnimatePresence>
          {isSidebarOpen &&
            (isFlowchart ? (
              <FlowchartSidebar key="flowchart-sidebar" />
            ) : (
              <Sidebar key="erd-sidebar" />
            ))}
        </AnimatePresence>

        {isFlowchart && (
          <div className="absolute bottom-6 left-150 -translate-x-1/2 z-40 bg-surface border border-theme px-5 py-2.5 rounded-full shadow-lg flex items-center gap-3 text-xs text-secondary animate-fade-in pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <FiInfo className="text-sm" />
            </div>
            <span>
              <strong className="text-primary font-medium">Tips:</strong> Drag
              the line from the <strong>Right/Bottom</strong> (Source) to the{" "}
              <strong>Left/Top</strong> (Target).
            </span>
          </div>
        )}

        <ReactFlow
          nodes={isFlowchart ? nodes : tables}
          edges={isFlowchart ? flowEdges : relationships}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          defaultEdgeOptions={{ type: "smoothstep" }}
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
          nodeTypes={nodeTypes}
          minZoom={0.1}
          maxZoom={2}
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
