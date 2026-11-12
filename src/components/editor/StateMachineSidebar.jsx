import React from "react";
import { motion } from "framer-motion";
import { useReactFlow } from "reactflow";
import { useEditorStore } from "../../store/editorStore";
import { SM_SHAPES, SM_NODE_TYPES } from "../../config/stateMachineTypes";

/** Ikon palet: bentuk mini yang meniru node aslinya (theme-aware via currentColor). */
function ShapeIcon({ type }) {
  switch (type) {
    case SM_NODE_TYPES.INITIAL:
      return <div className="w-4 h-4 rounded-full bg-current" />;
    case SM_NODE_TYPES.FINAL:
      return (
        <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-current" />
        </div>
      );
    case SM_NODE_TYPES.CHOICE:
      return <div className="w-4 h-4 border-2 border-current rotate-45" />;
    case SM_NODE_TYPES.STATE:
    default:
      return <div className="w-6 h-4 border-2 border-current rounded-[3px]" />;
  }
}

export default function StateMachineSidebar() {
  const { project } = useReactFlow();
  const addStateMachineNode = useEditorStore(
    (state) => state.addStateMachineNode,
  );

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
    addStateMachineNode(nodeType, {
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
          State Elements
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {SM_SHAPES.map((shape) => (
            <div
              key={shape.type}
              draggable
              onDragStart={(e) => onDragStart(e, shape.type)}
              onClick={() => onClickShape(shape.type)}
              className="group flex flex-col items-center p-4 bg-base border border-theme rounded-xl cursor-grab active:cursor-grabbing hover:border-focus hover:shadow-sm hover-lift transition-all"
              title={`${shape.desc} (Click or Drag)`}
            >
              <div className="text-muted group-hover:text-accent transition-colors mb-3 flex items-center justify-center h-6">
                <ShapeIcon type={shape.type} />
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
