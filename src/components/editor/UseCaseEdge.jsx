import React from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "reactflow";
import { USECASE_REL_TYPES } from "../../config/useCaseTypes";

export default function UseCaseEdge(props) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  } = props;

  const relType = data?.relType || USECASE_REL_TYPES.ASSOCIATION;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const stroke = selected ? "var(--border-focus)" : "var(--text-primary)";
  const strokeWidth = selected ? 2 : 1.5;

  let dashArray = "none";
  let showLabel = false;
  let labelText = "";
  let markerEnd;

  switch (relType) {
    case USECASE_REL_TYPES.INCLUDE:
      dashArray = "6 4";
      showLabel = true;
      labelText = "«include»";
      markerEnd = `url(#uc-openarrow-${selected ? "sel" : "def"})`;
      break;
    case USECASE_REL_TYPES.EXTEND:
      dashArray = "6 4";
      showLabel = true;
      labelText = "«extend»";
      markerEnd = `url(#uc-openarrow-${selected ? "sel" : "def"})`;
      break;
    case USECASE_REL_TYPES.GENERALIZATION:
      dashArray = "none";
      markerEnd = `url(#uc-triangle-${selected ? "sel" : "def"})`;
      break;
    case USECASE_REL_TYPES.ASSOCIATION:
    default:
      dashArray = "none";
      markerEnd = undefined;
      break;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth,
          strokeDasharray: dashArray,
          fill: "none",
        }}
      />

      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan bg-surface border border-theme text-primary text-[10px] italic font-medium px-2 py-0.5 rounded shadow-sm"
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
