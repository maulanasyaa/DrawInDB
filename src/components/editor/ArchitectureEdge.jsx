import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer } from 'reactflow';
import { useEditorStore } from '../../store/editorStore';
import {
  useArchSlots,
  archEdgePath,
  shouldRenderArchEdgeLabel,
  isArchEdgePlaceholder,
} from '../../utils/architectureEdgeLayout';

/**
 * Relationship Architecture: panah dengan label dua baris opsional —
 * deskripsi (`data.label`) dan teknologi dalam kurung siku
 * (`data.technology` → "[HTTPS/JSON]"). Keduanya diedit inline.
 *
 * Label hanya digambar bila ada isi atau edge dipilih. Posisi: titik tengah
 * path, lebar maksimum + teks membungkus (tidak terpotong). Edge yang
 * koridornya bertumpuk dipisah oleh kisi slot (lihat architectureEdgeLayout.js).
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

  const geom = {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  };
  // Grafik seluruh edge + node: slot koridor dihitung lintas edge.
  const edges = useEditorStore((state) => state.flowEdges);
  const nodes = useEditorStore((state) => state.nodes);
  const slots = useArchSlots(edges, nodes);
  const slot = slots.get(id);
  const { path: edgePath, labelX, labelY } = archEdgePath(geom, slot);

  const stroke = selected ? 'var(--border-focus)' : 'var(--text-primary)';
  const showLabel = shouldRenderArchEdgeLabel({ data, selected, editing });
  const placeholder = isArchEdgePlaceholder({ data, editing });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#arch-arrow-${selected ? 'sel' : 'def'})`}
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
