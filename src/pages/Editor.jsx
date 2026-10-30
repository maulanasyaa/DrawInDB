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
import { isGraphType } from "../config/diagramTypes";

import EditorHeader from "../components/editor/EditorHeader";
import Sidebar from "../components/editor/Sidebar";
import FlowchartSidebar from "../components/editor/FlowchartSidebar";
import UseCaseSidebar from "../components/editor/UseCaseSidebar";
import TableNode from "../components/editor/TableNode";
import FlowchartNode from "../components/editor/FlowchartNode";
import UseCaseNode from "../components/editor/UseCaseNode";
import UseCaseEdge from "../components/editor/UseCaseEdge";
import LoadingSpinner from "../components/LoadingSpinner";

import UseCaseMarkers from "../components/editor/UseCaseMarkers";
import { useEditorShortcuts } from "../hooks/useEditorShortcuts";

const nodeTypes = {
  table: TableNode,
  flowchart: FlowchartNode,
  usecase: UseCaseNode,
};

const edgeTypes = {
  usecase: UseCaseEdge,
};

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
  const addTable = useEditorStore((state) => state.addTable);
  const addFlowNode = useEditorStore((state) => state.addFlowNode);
  const addUseCaseNode = useEditorStore((state) => state.addUseCaseNode);
  const updateCanvas = useEditorStore((state) => state.updateCanvas);

  const setSelectedTable = useEditorStore((state) => state.setSelectedTable);

  const diagramType = diagramMeta?.type;
  const isFlowchart = diagramType === "flowchart";
  const isUseCase = diagramType === "usecase";
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

      if (isUseCase) {
        addUseCaseNode(type, position);
      } else if (isFlowchart) {
        addFlowNode(type, position);
      } else {
        if (type === "table") {
          addTable(position);
        }
      }
    },
    [project, addTable, addFlowNode, addUseCaseNode, isFlowchart, isUseCase],
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
    if (isUseCase) return <UseCaseSidebar key="usecase-sidebar" />;
    if (isFlowchart) return <FlowchartSidebar key="flowchart-sidebar" />;
    return <Sidebar key="erd-sidebar" />;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-canvas text-primary overflow-hidden relative">
      <EditorHeader />

      <div className="flex-1 relative flex" ref={reactFlowWrapper}>
        <AnimatePresence>{renderSidebar()}</AnimatePresence>

        {isUseCase && <UseCaseMarkers />}

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

        {isUseCase && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface border border-theme px-5 py-2.5 rounded-full shadow-lg flex items-center gap-3 text-xs text-secondary animate-fade-in pointer-events-none max-w-[560px]">
            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <FiInfo className="text-sm" />
            </div>
            <span>
              <strong className="text-primary font-medium">Tips:</strong> Pick a
              relationship type in the sidebar, then drag from a node handle to
              another node.
            </span>
          </div>
        )}

        <ReactFlow
          nodes={isNodeBased ? nodes : tables}
          edges={isNodeBased ? flowEdges : relationships}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          defaultEdgeOptions={
            isUseCase ? { type: "usecase" } : { type: "smoothstep" }
          }
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
          edgeTypes={edgeTypes}
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
