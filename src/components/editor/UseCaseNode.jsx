import React, { useState, useEffect, useRef } from "react";
import { Handle, Position } from "reactflow";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import { useEditorStore } from "../../store/editorStore";
import {
  USECASE_NODE_TYPES,
  USECASE_MIN_SIZES,
} from "../../config/useCaseTypes";

const handleClass =
  "!w-3 !h-3 !bg-canvas !border-2 !border-accent !z-50 !pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100";

export default function UseCaseNode({ id, data, selected }) {
  const subtype = data?.type || USECASE_NODE_TYPES.USE_CASE;
  const [label, setLabel] = useState(data?.label ?? "");
  const updateNodeData = useEditorStore((state) => state.updateNodeData);
  const textareaRef = useRef(null);

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

  const min = USECASE_MIN_SIZES[subtype] || { minWidth: 100, minHeight: 60 };
  const strokeColor = selected ? "var(--border-focus)" : "var(--text-primary)";

  // ============================================================
  // ACTOR — Stick figure UML
  // ============================================================
  if (subtype === USECASE_NODE_TYPES.ACTOR) {
    return (
      <div className="w-full h-full relative group flex flex-col items-center">
        <NodeResizer
          color="#8B5CF6"
          isVisible={selected}
          minWidth={min.minWidth}
          minHeight={min.minHeight}
          lineClassName="!border-transparent"
          handleClassName="w-2 h-2 bg-canvas border border-accent rounded-sm !z-50"
          keepAspectRatio
        />

        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className={handleClass}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className={handleClass}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className={handleClass}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className={handleClass}
        />

        <div className="flex-1 w-full flex items-center justify-center pb-6">
          <svg
            viewBox="0 0 40 70"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full drop-shadow-sm"
          >
            {/* Head */}
            <circle
              cx="20"
              cy="10"
              r="7"
              fill="var(--bg-surface)"
              stroke={strokeColor}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {/* Body */}
            <line
              x1="20"
              y1="17"
              x2="20"
              y2="45"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* Arms */}
            <line
              x1="4"
              y1="27"
              x2="36"
              y2="27"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* Legs */}
            <line
              x1="20"
              y1="45"
              x2="6"
              y2="65"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="20"
              y1="45"
              x2="34"
              y2="65"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* Label bawah */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full flex justify-center pointer-events-none z-10">
          <textarea
            ref={textareaRef}
            className="bg-transparent font-medium text-primary outline-none resize-none overflow-hidden pointer-events-auto nodrag text-center text-xs w-[120%] max-w-[180px]"
            value={label}
            onChange={handleLabelChange}
            placeholder="Actor"
            rows={1}
          />
        </div>
      </div>
    );
  }

  // ============================================================
  // USE CASE — Ellipse
  // ============================================================
  if (subtype === USECASE_NODE_TYPES.USE_CASE) {
    return (
      <div className="w-full h-full relative group">
        <NodeResizer
          color="#8B5CF6"
          isVisible={selected}
          minWidth={min.minWidth}
          minHeight={min.minHeight}
          lineClassName="!border-transparent"
          handleClassName="w-2 h-2 bg-canvas border border-accent rounded-sm !z-50"
        />

        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className={handleClass}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className={handleClass}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className={handleClass}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className={handleClass}
        />

        <div className="absolute inset-0 z-0 overflow-visible drop-shadow-sm">
          <svg
            viewBox="0 0 160 80"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <ellipse
              cx="80"
              cy="40"
              rx="78"
              ry="38"
              fill="var(--bg-surface)"
              stroke={strokeColor}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
          <textarea
            ref={textareaRef}
            className="bg-transparent font-medium text-primary outline-none resize-none overflow-hidden pointer-events-auto nodrag w-[80%] text-center text-xs placeholder:text-transparent"
            value={label}
            onChange={handleLabelChange}
            placeholder="Use Case"
            rows={1}
          />
        </div>
      </div>
    );
  }

  // ============================================================
  // SYSTEM BOUNDARY — Rectangle dengan title bar
  // ============================================================
  if (subtype === USECASE_NODE_TYPES.SYSTEM_BOUNDARY) {
    return (
      <div className="w-full h-full relative group">
        <NodeResizer
          color="#8B5CF6"
          isVisible={selected}
          minWidth={min.minWidth}
          minHeight={min.minHeight}
          lineClassName="!border-transparent"
          handleClassName="w-2 h-2 bg-canvas border border-accent rounded-sm !z-50"
        />

        {/* Container rectangle — transparent supaya use case di atasnya kelihatan */}
        <div
          className={`absolute inset-0 border-2 rounded-lg transition-colors z-0 pointer-events-auto ${
            selected ? "border-focus" : "border-theme hover:border-focus/50"
          }`}
          style={{
            backgroundColor: "var(--bg-surface)",
            opacity: 0.35,
          }}
        />

        {/* Title bar */}
        <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center pointer-events-none z-10 border-b border-theme/40">
          <textarea
            ref={textareaRef}
            className="bg-transparent font-semibold text-primary outline-none resize-none overflow-hidden pointer-events-auto nodrag w-[90%] text-center text-xs uppercase tracking-widest placeholder:text-muted/60"
            value={label}
            onChange={handleLabelChange}
            placeholder="System"
            rows={1}
          />
        </div>
      </div>
    );
  }

  // ============================================================
  // NOTE — reuse Flowchart annotation style
  // ============================================================
  if (subtype === USECASE_NODE_TYPES.NOTE) {
    return (
      <div className="w-full min-h-[50px] relative group flex">
        <NodeResizer
          color="#8B5CF6"
          isVisible={selected}
          minWidth={min.minWidth}
          minHeight={min.minHeight}
          lineClassName="!border-transparent"
          handleClassName="w-2 h-2 bg-canvas border border-accent rounded-sm !z-50"
        />

        <div className="absolute inset-y-0 left-0 w-4 border-y-2 border-l-2 border-muted/50 border-dashed rounded-l-lg pointer-events-none z-0" />

        <div className="relative z-10 w-full flex items-center pl-6 py-2 pointer-events-none">
          <textarea
            ref={textareaRef}
            className="bg-transparent font-medium text-primary outline-none resize-none overflow-hidden pointer-events-auto nodrag w-full text-left text-sm placeholder:text-muted/50"
            value={label}
            onChange={handleLabelChange}
            placeholder="Add note..."
            rows={1}
          />
        </div>
      </div>
    );
  }

  return null;
}
