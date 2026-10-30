// State Machine (UML state diagram): konstanta terpusat, bebas JSX.

export const SM_NODE_TYPES = {
  INITIAL: 'initial',
  STATE: 'state',
  FINAL: 'final',
  CHOICE: 'choice',
};

/** Subtype yang boleh di-resize (hanya state). */
export const SM_RESIZABLE = { [SM_NODE_TYPES.STATE]: true };

export const SM_DEFAULT_SIZES = {
  [SM_NODE_TYPES.INITIAL]: { width: 40, height: 40 },
  [SM_NODE_TYPES.STATE]: { width: 180, height: 72 },
  [SM_NODE_TYPES.FINAL]: { width: 44, height: 44 },
  [SM_NODE_TYPES.CHOICE]: { width: 72, height: 72 },
};

export const SM_DEFAULT_LABELS = {
  [SM_NODE_TYPES.INITIAL]: '',
  [SM_NODE_TYPES.STATE]: 'State',
  [SM_NODE_TYPES.FINAL]: '',
  [SM_NODE_TYPES.CHOICE]: '',
};

export const SM_MIN_SIZES = {
  [SM_NODE_TYPES.STATE]: { minWidth: 120, minHeight: 60 },
};

/** Urutan palet di sidebar. */
export const SM_SHAPES = [
  { type: SM_NODE_TYPES.INITIAL, name: 'Initial', desc: 'Pseudo-state entry' },
  { type: SM_NODE_TYPES.STATE, name: 'State', desc: 'State with entry/exit/do' },
  { type: SM_NODE_TYPES.CHOICE, name: 'Choice', desc: 'Decision pseudo-state' },
  { type: SM_NODE_TYPES.FINAL, name: 'Final', desc: 'Terminal state' },
];

/** Label transition default: "event [guard] / action". */
export const SM_DEFAULT_EDGE_LABEL = 'event [guard] / action';
