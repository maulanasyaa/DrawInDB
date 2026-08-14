// Use Case Diagram: konstanta terpusat agar tidak ada magic string bertebaran.

export const USECASE_NODE_TYPES = {
  ACTOR: "actor",
  USE_CASE: "useCase",
  SYSTEM_BOUNDARY: "systemBoundary",
  NOTE: "note",
};

export const USECASE_REL_TYPES = {
  ASSOCIATION: "association",
  INCLUDE: "include",
  EXTEND: "extend",
  GENERALIZATION: "generalization",
};

export const USECASE_SHAPES = [
  {
    type: USECASE_NODE_TYPES.ACTOR,
    name: "Actor",
    desc: "User / External system",
  },
  {
    type: USECASE_NODE_TYPES.USE_CASE,
    name: "Use Case",
    desc: "System function",
  },
  {
    type: USECASE_NODE_TYPES.SYSTEM_BOUNDARY,
    name: "System Boundary",
    desc: "System scope",
  },
  {
    type: USECASE_NODE_TYPES.NOTE,
    name: "Note",
    desc: "Annotation / comment",
  },
];

export const USECASE_RELATIONSHIPS = [
  {
    type: USECASE_REL_TYPES.ASSOCIATION,
    name: "Association",
    desc: "Actor ↔ Use Case",
  },
  {
    type: USECASE_REL_TYPES.INCLUDE,
    name: "Include",
    desc: "«include» dashed arrow",
  },
  {
    type: USECASE_REL_TYPES.EXTEND,
    name: "Extend",
    desc: "«extend» dashed arrow",
  },
  {
    type: USECASE_REL_TYPES.GENERALIZATION,
    name: "Generalization",
    desc: "Hollow triangle",
  },
];

export const USECASE_DEFAULT_SIZES = {
  [USECASE_NODE_TYPES.ACTOR]: { width: 80, height: 130 },
  [USECASE_NODE_TYPES.USE_CASE]: { width: 160, height: 80 },
  [USECASE_NODE_TYPES.SYSTEM_BOUNDARY]: { width: 480, height: 340 },
  [USECASE_NODE_TYPES.NOTE]: { width: 180, height: 90 },
};

export const USECASE_DEFAULT_LABELS = {
  [USECASE_NODE_TYPES.ACTOR]: "Actor",
  [USECASE_NODE_TYPES.USE_CASE]: "Use Case",
  [USECASE_NODE_TYPES.SYSTEM_BOUNDARY]: "System",
  [USECASE_NODE_TYPES.NOTE]: "Note...",
};

export const USECASE_MIN_SIZES = {
  [USECASE_NODE_TYPES.ACTOR]: { minWidth: 50, minHeight: 90 },
  [USECASE_NODE_TYPES.USE_CASE]: { minWidth: 100, minHeight: 60 },
  [USECASE_NODE_TYPES.SYSTEM_BOUNDARY]: { minWidth: 200, minHeight: 150 },
  [USECASE_NODE_TYPES.NOTE]: { minWidth: 120, minHeight: 60 },
};