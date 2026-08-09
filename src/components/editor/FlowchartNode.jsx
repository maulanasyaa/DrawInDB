import React, { useState, useEffect, useRef } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import { FiAlertCircle } from "react-icons/fi";
import { useEditorStore } from "../../store/editorStore";

export default function FlowchartNode({ id, data, selected }) {
  const [label, setLabel] = useState(
    data.label !== undefined ? data.label : "",
  );
  const [isGracePeriod, setIsGracePeriod] = useState(true);
  const { getEdges } = useReactFlow();
  const updateNodeData = useEditorStore((state) => state.updateNodeData);
  const textareaRef = useRef(null);
  const isAnnotation = data.type === "annotation";

  useEffect(() => {
    const timer = setTimeout(() => setIsGracePeriod(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [label]);

  const handleLabelChange = (e) => {
    const newLabel = e.target.value;
    setLabel(newLabel);
    updateNodeData(id, { label: newLabel });
  };

  const edges = getEdges();
  const isOrphan = !edges.some((e) => e.source === id || e.target === id);
  const isEmpty = !label || label.trim() === "";
  const outgoingEdges = edges.filter((e) => e.source === id).length;
  const isDecisionIncomplete = data.type === "decision" && outgoingEdges < 2;

  let warningMessage = null;
  if (!isGracePeriod && !isAnnotation) {
    if (isEmpty) warningMessage = "Label cannot be empty";
    else if (isOrphan) warningMessage = "Node is not connected to any process";
    else if (isDecisionIncomplete)
      warningMessage = "Decision should have at least 2 outputs (Yes/No)";
  }

  // Kelas dasar untuk node HTML murni (Terminal, Process, Predefined, Connector)
  const baseClasses = `absolute inset-0 bg-surface flex items-center justify-center transition-all shadow-sm z-0 border
    ${selected ? "ring-1 ring-focus border-focus" : "border-theme hover:border-focus/50"}`;

  // Kumpulan bentuk SVG untuk geometri kompleks (menjaga border tetap utuh dan bereaksi pada Light/Dark mode)
  const renderShape = () => {
    const svgClasses = `fill-surface transition-all ${selected ? "stroke-focus" : "stroke-theme hover:stroke-focus/50"}`;

    switch (data.type) {
      case "decision":
        return (
          <div className="absolute inset-0 z-0 overflow-visible drop-shadow-sm">
            <svg
              viewBox="0 0 160 160"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <polygon
                points="80,2 158,80 80,158 2,80"
                className={
                  selected
                    ? "fill-surface stroke-focus"
                    : "fill-surface stroke-warning"
                }
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        );
      case "io":
        return (
          <div className="absolute inset-0 z-0 overflow-visible drop-shadow-sm">
            <svg
              viewBox="0 0 160 64"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <polygon
                points="24,2 158,2 136,62 2,62"
                className={
                  selected
                    ? "fill-surface stroke-focus"
                    : "fill-surface stroke-teal-500"
                }
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        );
      case "loop":
        return (
          <div className="absolute inset-0 z-0 overflow-visible drop-shadow-sm">
            <svg
              viewBox="0 0 160 64"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <polygon
                points="24,2 136,2 158,32 136,62 24,62 2,32"
                className={svgClasses}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        );
      case "database":
        return (
          <div className="absolute inset-0 overflow-visible z-0 drop-shadow-sm">
            <svg
              viewBox="0 0 140 80"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <path
                d="M 2 15 L 2 65 C 2 85, 138 85, 138 65 L 138 15"
                className={
                  selected
                    ? "fill-surface stroke-focus"
                    : "fill-surface stroke-warning"
                }
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <ellipse
                cx="70"
                cy="15"
                rx="68"
                ry="13"
                className={
                  selected
                    ? "fill-surface stroke-focus"
                    : "fill-surface stroke-warning"
                }
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        );
      case "document":
        return (
          <div className="absolute inset-0 overflow-visible z-0 drop-shadow-sm">
            <svg
              viewBox="0 0 160 70"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <path
                d="M 2 2 L 158 2 L 158 55 Q 120 75, 80 55 T 2 55 Z"
                className={svgClasses}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        );
      case "offpage":
        return (
          <div className="absolute inset-0 z-0 overflow-visible drop-shadow-sm">
            <svg
              viewBox="0 0 100 80"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <polygon
                points="2,2 98,2 98,48 50,78 2,48"
                className={svgClasses}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        );
      case "terminal":
        return <div className={`${baseClasses} rounded-full`} />;
      case "predefined":
        return (
          <div
            className={`${baseClasses} rounded-sm border-x-[12px] border-x-surface-2`}
          />
        );
      case "connector":
        return <div className={`${baseClasses} rounded-full`} />;
      case "process":
      default:
        return <div className={`${baseClasses} rounded-sm`} />;
    }
  };

  const handleProps = {
    className:
      "!w-3 !h-3 !bg-canvas !border-2 !border-accent !z-50 !pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100",
  };

  const getVisualOffset = () => {
    if (data.type === "database") return "pt-4";
    if (data.type === "offpage") return "pb-3";
    return "";
  };

  return (
    <div
      className={`w-full relative group flex ${!isAnnotation ? "h-full" : "min-h-[50px]"}`}
    >
      {/*
        NodeResizer:
        Menambahkan 'lineClassName="!border-transparent"' akan menghilangkan
        garis ungu jelek pembungkus kotak, menyisakan hanya titik resize-nya saja.
      */}
      <NodeResizer
        color="#8B5CF6"
        isVisible={selected}
        minWidth={isAnnotation ? 100 : data.type === "connector" ? 40 : 120}
        minHeight={isAnnotation ? 40 : data.type === "connector" ? 40 : 50}
        lineClassName="!border-transparent"
        handleClassName="w-2 h-2 bg-canvas border border-accent rounded-sm !z-50"
      />

      {!isAnnotation && (
        <>
          {renderShape()}
          <Handle
            type="target"
            position={Position.Top}
            id="top"
            {...handleProps}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            {...handleProps}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            {...handleProps}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            {...handleProps}
          />
        </>
      )}

      {isAnnotation && (
        <div className="absolute inset-y-0 left-0 w-4 border-y-2 border-l-2 border-muted/50 border-dashed rounded-l-lg pointer-events-none z-0" />
      )}

      <div
        className={
          isAnnotation
            ? "relative z-10 w-full flex items-center pl-6 py-2 pointer-events-none"
            : `absolute inset-0 z-10 flex items-center justify-center p-2 pointer-events-none ${getVisualOffset()}`
        }
      >
        <textarea
          ref={textareaRef}
          className={`bg-transparent font-medium text-primary outline-none resize-none overflow-hidden pointer-events-auto nodrag
            ${isAnnotation ? "w-full text-left text-sm placeholder:text-muted/50" : "w-[85%] text-center text-xs placeholder:text-transparent"}`}
          value={label}
          onChange={handleLabelChange}
          placeholder={
            isAnnotation
              ? "Add note..."
              : data.type === "connector"
                ? ""
                : "Type"
          }
          rows={1}
        />
      </div>

      {warningMessage && (
        <div
          className="absolute -top-3 -right-3 text-warning text-[15px] bg-canvas rounded-full shadow-sm z-20"
          title={warningMessage}
        >
          <FiAlertCircle />
        </div>
      )}
    </div>
  );
}
