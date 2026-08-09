import React from "react";
import { motion } from "framer-motion";
import { useReactFlow } from "reactflow";
import { useEditorStore } from "../../store/editorStore";
import {
  LuCircle,
  LuSquare,
  LuDiamond,
  LuFileText,
  LuArrowDownToLine,
  LuDatabase,
  LuHexagon,
} from "react-icons/lu";

const FLOWCHART_SHAPES = [
  // Flow Dasar
  {
    type: "terminal",
    name: "Terminal",
    desc: "Start / End",
    icon: <LuCircle className="w-5 h-5 scale-y-75" />,
  },
  {
    type: "process",
    name: "Process",
    desc: "Action / Step",
    icon: <LuSquare className="w-5 h-5" />,
  },
  {
    type: "decision",
    name: "Decision",
    desc: "Logic / Branch",
    icon: <LuDiamond className="w-5 h-5" />,
  },

  // I/O & Data
  {
    type: "io",
    name: "Input/Output",
    desc: "Data I/O",
    icon: (
      <div className="w-[18px] h-[14px] border-2 border-current rounded-[2px] -skew-x-12" />
    ),
  },
  {
    type: "database",
    name: "Database",
    desc: "Data Storage",
    icon: <LuDatabase className="w-5 h-5" />,
  },
  {
    type: "document",
    name: "Document",
    desc: "Output Report",
    icon: <LuFileText className="w-5 h-5" />,
  },

  // Struktural
  {
    type: "predefined",
    name: "Predefined",
    desc: "Sub-process",
    icon: (
      <div className="w-5 h-5 border-2 border-current rounded-[2px] flex items-center justify-between px-[2px]">
        <div className="w-[1px] h-full bg-current" />
        <div className="w-[1px] h-full bg-current" />
      </div>
    ),
  },
  {
    type: "loop",
    name: "Preparation",
    desc: "Loop / Init",
    icon: <LuHexagon className="w-5 h-5" />,
  },

  // Penghubung
  {
    type: "connector",
    name: "Connector",
    desc: "Jump point",
    icon: <LuCircle className="w-5 h-5" />,
  },
  {
    type: "offpage",
    name: "Off-page",
    desc: "Page link",
    icon: <LuArrowDownToLine className="w-5 h-5" />,
  },

  // Non-Flow
  {
    type: "annotation",
    name: "Annotation",
    desc: "Comment / Note",
    icon: (
      <div className="w-3 h-4 border-y-2 border-l-2 border-current rounded-l-[4px] ml-1" />
    ),
  },
];

export default function FlowchartSidebar() {
  const { project } = useReactFlow();
  const addFlowNode = useEditorStore((state) => state.addFlowNode);

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
    addFlowNode(nodeType, {
      x: centerPosition.x + offset,
      y: centerPosition.y + offset,
    });
  };

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      exit={{ x: -300 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-0 left-0 bottom-0 w-[320px] bg-surface border-r border-theme flex flex-col z-20 shadow-2xl"
    >
      <div className="p-5 border-b border-theme/50 flex items-center justify-between bg-surface-2/30">
        <h2 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
          Shapes Library
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {FLOWCHART_SHAPES.map((shape) => (
            <div
              key={shape.type}
              draggable
              onDragStart={(e) => onDragStart(e, shape.type)}
              onClick={() => onClickShape(shape.type)}
              className="group flex flex-col items-center p-4 bg-base border border-theme rounded-xl cursor-grab active:cursor-grabbing hover:border-focus hover:shadow-sm hover-lift transition-all"
              title={`${shape.desc} (Click or Drag)`}
            >
              <div className="text-muted group-hover:text-accent transition-colors mb-3 flex items-center justify-center h-6">
                {shape.icon}
              </div>
              <span className="text-xs font-semibold text-primary">
                {shape.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
