import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { useEditorStore } from '../../store/editorStore';
import { SM_DEFAULT_EDGE_LABEL } from '../../config/stateMachineTypes';

/**
 * Self-transition: React Flow memberi sourceX/Y == targetX/Y untuk edge
 * source===target, sehingga bezier biasa jadi garis nol. Loop digambar manual:
 * keluar dari sisi kanan node, melengkung ke atas, masuk lagi dari sisi kanan.
 */
function getSelfLoopPath(sourceX, sourceY, sourcePosition) {
  const r = 44;
  const dx = sourcePosition === 'left' ? -r : r;
  const path = [
    `M ${sourceX},${sourceY}`,
    `C ${sourceX + dx},${sourceY - r * 2.2} ${sourceX + dx},${sourceY - r * 2.2} ${sourceX},${sourceY}`,
  ].join(' ');
  return [path, sourceX + dx * 0.75, sourceY - r * 1.6];
}

export default function StateMachineEdge({
  id,
  source,
  target,
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
  const setStateMachineEdgeLabel = useEditorStore(
    (state) => state.setStateMachineEdgeLabel,
  );

  const label = data?.label ?? '';
  const isSelfLoop = source === target;

  const [edgePath, labelX, labelY] = isSelfLoop
    ? getSelfLoopPath(sourceX, sourceY, sourcePosition)
    : getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });

  const stroke = selected ? 'var(--border-focus)' : 'var(--text-primary)';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#sm-arrow-${selected ? 'sel' : 'def'})`}
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
            <input
              autoFocus
              value={label}
              onChange={(e) => setStateMachineEdgeLabel(id, e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditing(false);
              }}
              placeholder={SM_DEFAULT_EDGE_LABEL}
              className="bg-surface border border-focus text-primary text-[10px] font-medium px-2 py-0.5 rounded shadow-sm outline-none w-40 text-center"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Edit transition label"
              className={`bg-surface border text-[10px] font-medium px-2 py-0.5 rounded shadow-sm transition-colors ${
                selected ? 'border-focus' : 'border-theme hover:border-focus/60'
              } ${label ? 'text-primary' : 'text-muted italic'}`}
            >
              {label || SM_DEFAULT_EDGE_LABEL}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
