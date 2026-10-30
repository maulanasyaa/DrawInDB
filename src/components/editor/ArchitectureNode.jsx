import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { FiAlertCircle } from 'react-icons/fi';
import { useEditorStore } from '../../store/editorStore';
import {
  ARCH_NODE_TYPES,
  ARCH_MIN_SIZES,
  ARCH_RESIZABLE,
} from '../../config/architectureTypes';
import { validateArchitecture } from '../../utils/architectureValidation';

const handleProps = {
  className:
    '!w-3 !h-3 !bg-canvas !border-2 !border-accent !z-50 !pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100',
};

/** 4 handle per node: target di atas/kiri, source di kanan/bawah. */
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

/** Textarea auto-tinggi untuk edit inline. */
function AutoTextarea({ value, onChange, placeholder, className = '' }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      className={`nodrag bg-transparent outline-none resize-none overflow-hidden placeholder:text-muted/50 ${className}`}
      onInput={(e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
    />
  );
}

export default function ArchitectureNode({ id, data, selected }) {
  const subtype = data?.type || ARCH_NODE_TYPES.CONTAINER;
  const updateNodeData = useEditorStore((state) => state.updateNodeData);
  const { getNodes, getEdges } = useReactFlow();

  // Validasi global (butuh seluruh graf), dihitung sekali per render.
  const { nodeWarnings } = validateArchitecture(getNodes(), getEdges());

  const onField = (field) => (e) => updateNodeData(id, { [field]: e.target.value });

  const strokeColor = selected ? 'var(--border-focus)' : 'var(--text-primary)';
  const fillColor = 'var(--bg-surface)';

  const resizer = ARCH_RESIZABLE[subtype] ? (
    <NodeResizer
      color="#8B5CF6"
      isVisible={selected}
      minWidth={ARCH_MIN_SIZES[subtype].minWidth}
      minHeight={ARCH_MIN_SIZES[subtype].minHeight}
      lineClassName="!border-transparent"
      handleClassName="w-2 h-2 bg-canvas border border-accent rounded-sm !z-50"
    />
  ) : null;

  // ===== person: ikon orang + nama + deskripsi =====
  if (subtype === ARCH_NODE_TYPES.PERSON) {
    return (
      <div className="w-full h-full relative group flex flex-col items-center">
        <NodeHandles />

        <svg viewBox="0 0 40 70" preserveAspectRatio="xMidYMid meet" className="w-1/2 h-3/5 drop-shadow-sm">
          <circle cx="20" cy="10" r="7" fill={fillColor} stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <line x1="20" y1="17" x2="20" y2="45" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line x1="8" y1="26" x2="32" y2="26" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line x1="20" y1="45" x2="10" y2="64" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line x1="20" y1="45" x2="30" y2="64" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="w-full flex flex-col items-center px-2 min-h-0">
          <AutoTextarea
            value={data?.label ?? ''}
            onChange={onField('label')}
            placeholder="Person"
            className="w-full text-center text-xs font-semibold text-primary"
          />
          <AutoTextarea
            value={data?.description ?? ''}
            onChange={onField('description')}
            placeholder="Description"
            className="w-full text-center text-[10px] text-secondary"
          />
        </div>

        <WarningBadge message={nodeWarnings[id]} />
      </div>
    );
  }

  // ===== boundary: kotak garis putus-putus berjudul (pengelompok) =====
  if (subtype === ARCH_NODE_TYPES.BOUNDARY) {
    return (
      <div className="w-full h-full relative group">
        {resizer}

        <div
          className={`absolute inset-0 border-2 border-dashed rounded-lg transition-colors z-0 pointer-events-auto ${
            selected ? 'border-focus' : 'border-theme hover:border-focus/50'
          }`}
          style={{
            backgroundColor: 'var(--bg-surface)',
            opacity: 0.35,
          }}
        />

        <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center pointer-events-none z-10">
          <AutoTextarea
            value={data?.label ?? ''}
            onChange={onField('label')}
            placeholder="Boundary"
            className="pointer-events-auto w-[90%] text-center text-xs uppercase tracking-widest font-semibold text-primary"
          />
        </div>

        <WarningBadge message={nodeWarnings[id]} />
      </div>
    );
  }

  // ===== database: silinder + nama + teknologi =====
  if (subtype === ARCH_NODE_TYPES.DATABASE) {
    return (
      <div className="w-full h-full relative group flex flex-col items-center justify-center gap-1">
        <NodeHandles />

        <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid meet" className="w-2/3 h-1/2 drop-shadow-sm">
          <ellipse cx="30" cy="8" rx="26" ry="7" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path
            d="M 4 8 L 4 32 A 26 7 0 0 0 56 32 L 56 8"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="w-full flex flex-col items-center px-2">
          <AutoTextarea
            value={data?.label ?? ''}
            onChange={onField('label')}
            placeholder="Database"
            className="w-full text-center text-xs font-semibold text-primary"
          />
          <AutoTextarea
            value={data?.technology ?? ''}
            onChange={onField('technology')}
            placeholder="Technology"
            className="w-full text-center text-[10px] italic text-secondary"
          />
        </div>

        <WarningBadge message={nodeWarnings[id]} />
      </div>
    );
  }

  // ===== system / container: kotak + nama (+ teknologi) + deskripsi =====
  const isContainer = subtype === ARCH_NODE_TYPES.CONTAINER;
  const isExternal = isContainer ? false : Boolean(data?.external);

  return (
    <div className="w-full h-full relative group">
      <NodeHandles />

      <div
        className={`absolute inset-0 rounded-lg flex flex-col justify-center px-3 gap-0.5 overflow-hidden shadow-sm border transition-colors ${
          selected
            ? 'border-focus ring-1 ring-focus'
            : isExternal
              ? 'border-dashed border-muted/60 hover:border-focus/50'
              : 'border-theme hover:border-focus/50'
        }`}
        style={{ backgroundColor: isExternal ? 'var(--bg-surface-2)' : fillColor }}
      >
        <AutoTextarea
          value={data?.label ?? ''}
          onChange={onField('label')}
          placeholder={isContainer ? 'Container' : 'System'}
          className="w-full text-center text-xs font-semibold text-primary"
        />

        {isContainer ? (
          <AutoTextarea
            value={data?.technology ?? ''}
            onChange={onField('technology')}
            placeholder="Technology"
            className="w-full text-center text-[10px] italic text-secondary"
          />
        ) : (
          <AutoTextarea
            value={data?.description ?? ''}
            onChange={onField('description')}
            placeholder="Description"
            className="w-full text-center text-[10px] text-secondary"
          />
        )}

        {isExternal && (
          <div className="text-center text-[9px] uppercase tracking-widest text-muted">
            External
          </div>
        )}
      </div>

      <WarningBadge message={nodeWarnings[id]} />
    </div>
  );
}
