import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { FiAlertCircle } from 'react-icons/fi';
import { useEditorStore } from '../../store/editorStore';
import {
  SM_NODE_TYPES,
  SM_MIN_SIZES,
  SM_RESIZABLE,
} from '../../config/stateMachineTypes';
import { validateStateMachine } from '../../utils/stateMachineValidation';

const handleProps = {
  className:
    '!w-3 !h-3 !bg-canvas !border-2 !border-accent !z-50 !pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100',
};

/** 4 handle seperti FlowchartNode: target di atas/kiri, source di kanan/bawah. */
function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="top" {...handleProps} />
      <Handle type="source" position={Position.Right} id="right" {...handleProps} />
      <Handle type="source" position={Position.Bottom} id="bottom" {...handleProps} />
      <Handle type="target" position={Position.Left} id="left" {...handleProps} />
    </>
  );
}

function WarningBadge({ message }) {
  if (!message) return null;
  return (
    <div
      className="absolute -top-3 -right-3 text-warning text-[15px] bg-canvas rounded-full shadow-sm z-20"
      title={message}
    >
      <FiAlertCircle />
    </div>
  );
}

export default function StateMachineNode({ id, data, selected }) {
  const subtype = data?.type || SM_NODE_TYPES.STATE;
  const { getEdges, getNodes } = useReactFlow();
  const updateNodeData = useEditorStore((state) => state.updateNodeData);

  // Validasi butuh seluruh graf (aturan ">1 initial" dan "final punya transisi
  // keluar" bersifat global), jadi dihitung sekali per render.
  const { nodeWarnings } = validateStateMachine(getNodes(), getEdges());

  const onField = (field) => (e) => updateNodeData(id, { [field]: e.target.value });

  const strokeColor = selected ? 'var(--border-focus)' : 'var(--text-primary)';
  const fillColor = 'var(--bg-surface)';

  const resizer = SM_RESIZABLE[subtype] ? (
    <NodeResizer
      color="#8B5CF6"
      isVisible={selected}
      minWidth={SM_MIN_SIZES[subtype].minWidth}
      minHeight={SM_MIN_SIZES[subtype].minHeight}
      lineClassName="!border-transparent"
      handleClassName="w-2 h-2 bg-canvas border border-accent rounded-sm !z-50"
    />
  ) : null;

  // ===== initial: lingkaran terisi (pseudo-state awal) =====
  if (subtype === SM_NODE_TYPES.INITIAL) {
    return (
      <div className="w-full h-full relative group flex items-center justify-center">
        <NodeHandles />
        <div
          className={`w-3/5 h-3/5 rounded-full transition-all ${
            selected ? 'ring-2 ring-focus ring-offset-2 ring-offset-canvas' : ''
          }`}
          style={{ backgroundColor: selected ? 'var(--border-focus)' : 'var(--text-primary)' }}
        />
        <WarningBadge message={nodeWarnings[id]} />
      </div>
    );
  }

  // ===== final: bullseye =====
  if (subtype === SM_NODE_TYPES.FINAL) {
    return (
      <div className="w-full h-full relative group flex items-center justify-center">
        <NodeHandles />
        <svg viewBox="0 0 44 44" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="22" cy="22" r="12" fill={strokeColor} />
        </svg>
        <WarningBadge message={nodeWarnings[id]} />
      </div>
    );
  }

  // ===== choice: belah ketupat kecil =====
  if (subtype === SM_NODE_TYPES.CHOICE) {
    return (
      <div className="w-full h-full relative group">
        <NodeHandles />
        <svg
          viewBox="0 0 72 72"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full drop-shadow-sm"
        >
          <polygon
            points="36,4 68,36 36,68 4,36"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <WarningBadge message={nodeWarnings[id]} />
      </div>
    );
  }

  // ===== state: rounded rectangle + compartment entry/exit/do =====
  const entry = data?.entry ?? '';
  const exit = data?.exit ?? '';
  const doAction = data?.do ?? '';
  const hasCompartment = entry || exit || doAction;

  return (
    <div className="w-full h-full relative group">
      {resizer}
      <NodeHandles />

      <div
        className={`absolute inset-0 rounded-lg bg-surface flex flex-col overflow-hidden shadow-sm border transition-colors ${
          selected ? 'border-focus ring-1 ring-focus' : 'border-theme hover:border-focus/50'
        }`}
      >
        <div className="flex-1 flex items-center justify-center px-3 min-h-0">
          <textarea
            value={data?.label ?? ''}
            onChange={onField('label')}
            placeholder="State"
            rows={1}
            className="nodrag bg-transparent w-full text-center text-xs font-semibold text-primary outline-none resize-none overflow-hidden placeholder:text-muted/50"
          />
        </div>

        {/* Compartment selalu di markup supaya field bisa diisi; garis
            pemisah hanya muncul saat berisi. */}
        <div
          className={`px-2 pb-1.5 text-[10px] leading-tight flex flex-col gap-0.5 ${
            hasCompartment ? 'border-t border-theme/60 pt-1' : ''
          }`}
        >
          {[
            ['entry', entry, 'entry / ...'],
            ['exit', exit, 'exit / ...'],
            ['do', doAction, 'do / ...'],
          ].map(([field, value, placeholder]) => (
            <input
              key={field}
              value={value}
              onChange={onField(field)}
              placeholder={placeholder}
              className="nodrag bg-transparent w-full outline-none text-[10px] text-secondary placeholder:text-muted/40"
            />
          ))}
        </div>
      </div>

      <WarningBadge message={nodeWarnings[id]} />
    </div>
  );
}
