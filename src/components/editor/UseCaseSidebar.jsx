import React, { useState } from "react";
import { motion } from "framer-motion";
import { useReactFlow } from "reactflow";
import { useEditorStore } from "../../store/editorStore";
import {
  USECASE_SHAPES,
  USECASE_RELATIONSHIPS,
  USECASE_NODE_TYPES,
} from "../../config/useCaseTypes";
import { LuUser, LuCircle, LuSquare, LuStickyNote } from "react-icons/lu";

const NODE_ICONS = {
  [USECASE_NODE_TYPES.ACTOR]: <LuUser className="w-5 h-5" />,
  [USECASE_NODE_TYPES.USE_CASE]: <LuCircle className="w-6 h-4 scale-x-125" />,
  [USECASE_NODE_TYPES.SYSTEM_BOUNDARY]: <LuSquare className="w-5 h-5" />,
  [USECASE_NODE_TYPES.NOTE]: <LuStickyNote className="w-5 h-5" />,
};

// Preview mini untuk masing-masing relationship type
function RelPreview({ type }) {
  const stroke = "currentColor";
  switch (type) {
    case "association":
      return (
        <svg viewBox="0 0 40 12" className="w-8 h-3">
          <line
            x1="2"
            y1="6"
            x2="38"
            y2="6"
            stroke={stroke}
            strokeWidth="1.5"
          />
        </svg>
      );
    case "include":
    case "extend":
      return (
        <svg viewBox="0 0 40 12" className="w-8 h-3">
          <line
            x1="2"
            y1="6"
            x2="34"
            y2="6"
            stroke={stroke}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <path
            d="M 34 2 L 38 6 L 34 10"
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
          />
        </svg>
      );
    case "generalization":
      return (
        <svg viewBox="0 0 40 12" className="w-8 h-3">
          <line
            x1="2"
            y1="6"
            x2="30"
            y2="6"
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path
            d="M 30 2 L 38 6 L 30 10 z"
            fill="var(--bg-surface)"
            stroke={stroke}
            strokeWidth="1.5"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default function UseCaseSidebar() {
  const { project } = useReactFlow();
  const addUseCaseNode = useEditorStore((state) => state.addUseCaseNode);
  const activeRelType = useEditorStore((state) => state.usecaseRelType);
  const setUseCaseRelType = useEditorStore((state) => state.setUseCaseRelType);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onClickShape = (nodeType) => {
    const centerPosition = project({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const offset = Math.floor(Math.random() * 30);
    addUseCaseNode(nodeType, {
      x: centerPosition.x + offset,
      y: centerPosition.y + offset,
    });
  };

  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-0 left-0 bottom-0 w-[320px] bg-surface border-r border-theme flex flex-col z-20 shadow-2xl"
    >
      <div className="p-5 border-b border-theme/50 flex items-center justify-between bg-surface-2/30">
        <h2 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
          Use Case Library
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-6">
        {/* Nodes */}
        <div>
          <span className="text-[10px] font-bold text-muted uppercase tracking-[0.15em] block mb-3 px-1">
            Elements
          </span>
          <div className="grid grid-cols-2 gap-3">
            {USECASE_SHAPES.map((shape) => (
              <div
                key={shape.type}
                draggable
                onDragStart={(e) => onDragStart(e, shape.type)}
                onClick={() => onClickShape(shape.type)}
                className="group flex flex-col items-center p-4 bg-base border border-theme rounded-xl cursor-grab active:cursor-grabbing hover:border-focus hover:shadow-sm hover-lift transition-all"
                title={`${shape.desc} (Click or Drag)`}
              >
                <div className="text-muted group-hover:text-accent transition-colors mb-3 flex items-center justify-center h-6">
                  {NODE_ICONS[shape.type]}
                </div>
                <span className="text-xs font-semibold text-primary text-center">
                  {shape.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Relationships */}
        <div>
          <span className="text-[10px] font-bold text-muted uppercase tracking-[0.15em] block mb-3 px-1">
            Relationships
          </span>
          <p className="text-[10px] text-muted mb-3 px-1 leading-relaxed">
            Select a relationship type, then drag from a source handle to a
            target handle on the canvas.
          </p>
          <div className="flex flex-col gap-2">
            {USECASE_RELATIONSHIPS.map((rel) => (
              <button
                key={rel.type}
                onClick={() => setUseCaseRelType(rel.type)}
                className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-all ${
                  activeRelType === rel.type
                    ? "border-primary ring-1 ring-primary bg-surface"
                    : "border-theme bg-base hover:border-focus"
                }`}
                title={rel.desc}
              >
                <div className="text-primary shrink-0">
                  <RelPreview type={rel.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-primary">
                    {rel.name}
                  </div>
                  <div className="text-[10px] text-muted truncate">
                    {rel.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
