import React, { useEffect } from 'react';
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { FiAlertCircle } from 'react-icons/fi';
import { useEditorStore } from '../../store/editorStore';
import {
  ARCH_NODE_TYPES,
  ARCH_MIN_SIZES,
  ARCH_RESIZABLE,
  ARCH_HANDLE_STYLES,
  ARCH_SHAPE_SIZES,
} from '../../config/architectureTypes';
import { validateArchitecture } from '../../utils/architectureValidation';

const handleBase =
  '!w-3 !h-3 !bg-canvas !border-2 !border-accent !z-50 !pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100';

/**
 * Handle di titik anchor bentuk (lihat `ARCH_HANDLE_ANCHORS`). Komponen ini
 * harus dirender di dalam wrapper selebar-lebih kotak BENTUK (`ARCH_SHAPE_SIZES`),
 * bukan di root node — kalau tidak, label/deskripsi ikut menggeser anchor.
 */
function NodeHandles({ anchors = {} }) {
  return (
    <>
      <Handle type="target" position={Position.Top} id="top" className={handleBase} style={anchors.top} />
      <Handle type="source" position={Position.Right} id="right" className={handleBase} style={anchors.right} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleBase} style={anchors.bottom} />
      <Handle type="target" position={Position.Left} id="left" className={handleBase} style={anchors.left} />
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
  // Anchor handle relatif kotak bentuk (lihat ARCH_HANDLE_ANCHORS).
  const anchors = ARCH_HANDLE_STYLES[subtype] || ARCH_HANDLE_STYLES.container;
  // Ukuran bentuk tetap; null untuk subtype yang bentuknya kotak node penuh.
  const shape = ARCH_SHAPE_SIZES[subtype];
  const updateNodeData = useEditorStore((state) => state.updateNodeData);
  const { getNodes, getEdges } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  // Bentuk berganti (subtype berubah) → posisi handle berubah tanpa perubahan
  // ukuran node, jadi batas handle harus diukur ulang manual.
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, subtype, updateNodeInternals]);

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
        <div className="relative shrink-0" style={shape}>
          <NodeHandles anchors={anchors} />

          <svg viewBox="0 0 40 70" className="w-full h-full drop-shadow-sm">
            <circle cx="20" cy="10" r="7" fill={fillColor} stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <line x1="20" y1="17" x2="20" y2="45" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1="8" y1="26" x2="32" y2="26" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1="20" y1="45" x2="10" y2="64" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1="20" y1="45" x2="30" y2="64" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

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
  // Wrapper node sudah `pointer-events: none` (store). Badan boundary juga
  // `none` supaya klik jatuh ke edge/node di atasnya; hanya HEADER (label),
  // TEPI (strip 6px), handle, dan NodeResizer yang `auto` — boundary tetap
  // bisa dipilih, dipindah, dan di-resize. `opacity` tidak dipasang di node
  // (akan ikut memudarkan edge/anak di atasnya); kepudaran ada di lapisan isi.
  if (subtype === ARCH_NODE_TYPES.BOUNDARY) {
    return (
      <div className="w-full h-full relative group">
        {resizer}

        <div
          className="absolute inset-0 rounded-lg z-0 pointer-events-none"
          style={{ backgroundColor: 'var(--bg-surface)', opacity: 0.35 }}
        />

        <div
          className={`absolute inset-0 rounded-lg border-2 border-dashed transition-colors z-0 pointer-events-none ${
            selected ? 'border-focus' : 'border-theme group-hover:border-focus/50'
          }`}
        />

        {/* Tepi: satu-satunya area badan yang menangkap klik (pilih + geser). */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-1.5 pointer-events-auto cursor-grab" />
          <div className="absolute inset-x-0 bottom-0 h-1.5 pointer-events-auto cursor-grab" />
          <div className="absolute inset-y-0 left-0 w-1.5 pointer-events-auto cursor-grab" />
          <div className="absolute inset-y-0 right-0 w-1.5 pointer-events-auto cursor-grab" />
        </div>

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
        <div className="relative shrink-0" style={shape}>
          <NodeHandles anchors={anchors} />

          <svg viewBox="0 0 60 40" className="w-full h-full drop-shadow-sm">
            <ellipse cx="30" cy="8" rx="26" ry="7" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <path
              d="M 4 8 L 4 32 A 26 7 0 0 0 56 32 L 56 8"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

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
      <NodeHandles anchors={anchors} />

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
