import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer } from 'reactflow';
import { useEditorStore } from '../../store/editorStore';
import {
  archEdgePath,
  parallelOffsets,
  shouldRenderArchEdgeLabel,
  isArchEdgePlaceholder,
} from '../../utils/architectureEdgeLayout';

/**
 * Relationship Architecture: bezier halus + panah + label dua baris opsional —
 * deskripsi (`data.label`) dan teknologi (`data.technology` → "[HTTPS/JSON]").
 * Keduanya diedit inline.
 *
 * • Jalur: `archEdgePath` (keluar dari sisi handle, label di titik tengah kurva).
 * • Edge pada pasangan node+handle yang sama diberi offset berbeda
 *   (`parallelOffsets`) — termasuk pasangan dua arah A→B dan B→A.
 * • Panah: `<marker>` dideklarasikan DI DALAM grup edge ini, jadi berada di
 *   dokumen SVG yang sama dengan path pemakainya dan dikelola React (tidak
 *   bergantung pada injeksi DOM / `setTimeout` seperti overlay marker lama).
 */
export default function ArchitectureEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) {
  const [editing, setEditing] = useState(false);
  const setArchitectureEdgeData = useEditorStore(
    (state) => state.setArchitectureEdgeData,
  );
  const label = data?.label ?? '';
  const technology = data?.technology ?? '';

  // Offset hanya bergantung pada daftar edge (bukan posisi node), jadi drag
  // node tidak memicu render ulang edge.
  const edges = useEditorStore((state) => state.flowEdges);
  const offset = parallelOffsets(edges).get(id) ?? 0;

  const { path: edgePath, labelX, labelY } = archEdgePath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    offset,
  });

  const stroke = selected ? 'var(--border-focus)' : 'var(--text-primary)';
  const markerId = `arch-arrow-${id}-${selected ? 'sel' : 'def'}`;
  const showLabel = shouldRenderArchEdgeLabel({ data, selected, editing });
  const placeholder = isArchEdgePlaceholder({ data, editing });

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          {/* style (bukan atribut presentasi) supaya var() pasti ter-resolve. */}
          <path
            d="M 1 1 L 10 6 L 1 11"
            fill="none"
            style={{ stroke, strokeWidth: selected ? 1.8 : 1.6 }}
          />
        </marker>
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{ stroke, strokeWidth: selected ? 2 : 1.5, fill: 'none' }}
      />

      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`nodrag nopan ${
              placeholder ? 'arch-edge-placeholder' : ''
            }`}
            data-arch-placeholder={placeholder ? 'true' : undefined}
          >
            {editing ? (
              <div className="flex flex-col gap-1 bg-surface border border-focus rounded p-1 shadow-sm">
                <input
                  autoFocus
                  value={label}
                  onChange={(e) => setArchitectureEdgeData(id, { label: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
                  placeholder="Description"
                  className="bg-transparent text-primary text-[10px] font-medium outline-none w-40 text-center placeholder:text-muted/50"
                />
                <input
                  value={technology}
                  onChange={(e) =>
                    setArchitectureEdgeData(id, { technology: e.target.value })
                  }
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
                  onBlur={() => setEditing(false)}
                  placeholder="[technology]"
                  className="bg-transparent text-secondary text-[10px] outline-none w-40 text-center placeholder:text-muted/50"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Edit relationship label"
                className={`bg-surface border text-[10px] font-medium px-2 py-0.5 rounded shadow-sm transition-colors max-w-[160px] whitespace-normal break-words leading-tight ${
                  selected ? 'border-focus' : 'border-theme hover:border-focus/60'
                } ${placeholder ? 'text-muted italic' : 'text-primary'}`}
              >
                {label && <span className="block text-center">{label}</span>}
                {technology && (
                  <span className="block text-center text-[9px] text-muted">
                    [{technology}]
                  </span>
                )}
                {placeholder && (
                  <span className="block text-center">Description [technology]</span>
                )}
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
