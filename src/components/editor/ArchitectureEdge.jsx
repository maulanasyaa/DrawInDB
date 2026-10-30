import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow';
import { useEditorStore } from '../../store/editorStore';

/**
 * Relationship Architecture: panah dengan label dua baris opsional —
 * deskripsi (`data.label`) dan teknologi dalam kurung siku
 * (`data.technology` → "[HTTPS/JSON]"). Keduanya diedit inline.
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

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const stroke = selected ? 'var(--border-focus)' : 'var(--text-primary)';

  const display = (
    <>
      {label && <span className="block">{label}</span>}
      {technology && <span className="block text-[9px] text-muted">[{technology}]</span>}
      {!label && !technology && (
        <span className="block italic text-muted">Description [technology]</span>
      )}
    </>
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#arch-arrow-${selected ? 'sel' : 'def'})`}
        style={{ stroke, strokeWidth: selected ? 2 : 1.5, fill: 'none' }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
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
                onChange={(e) => setArchitectureEdgeData(id, { technology: e.target.value })}
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
              className={`bg-surface border text-[10px] font-medium px-2 py-0.5 rounded shadow-sm transition-colors ${
                selected ? 'border-focus' : 'border-theme hover:border-focus/60'
              } ${label || technology ? 'text-primary' : 'text-muted italic'}`}
            >
              {display}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
