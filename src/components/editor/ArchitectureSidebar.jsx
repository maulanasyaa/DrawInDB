import React from 'react';
import { motion } from 'framer-motion';
import { useReactFlow } from 'reactflow';
import { useEditorStore } from '../../store/editorStore';
import { ARCH_SHAPES, ARCH_NODE_TYPES } from '../../config/architectureTypes';
import { FiUser, FiBox, FiServer, FiDatabase, FiLayers } from 'react-icons/fi';

/** Ikon palet per subtype. */
const NODE_ICONS = {
  [ARCH_NODE_TYPES.PERSON]: <FiUser className="w-5 h-5" />,
  [ARCH_NODE_TYPES.SYSTEM]: <FiBox className="w-5 h-5" />,
  [ARCH_NODE_TYPES.CONTAINER]: <FiServer className="w-5 h-5" />,
  [ARCH_NODE_TYPES.DATABASE]: <FiDatabase className="w-5 h-5" />,
  [ARCH_NODE_TYPES.BOUNDARY]: <FiLayers className="w-5 h-5" />,
};

export default function ArchitectureSidebar() {
  const { project } = useReactFlow();
  const addArchitectureNode = useEditorStore(
    (state) => state.addArchitectureNode,
  );

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onClickShape = (nodeType) => {
    const centerPosition = project({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const offset = Math.floor(Math.random() * 30);
    addArchitectureNode(nodeType, {
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
          Architecture Elements
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {ARCH_SHAPES.map((shape) => (
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
