// Architecture (gaya C4 Context/Container): konstanta terpusat, bebas JSX.

export const ARCH_NODE_TYPES = {
  PERSON: 'person',
  SYSTEM: 'system',
  CONTAINER: 'container',
  DATABASE: 'database',
  BOUNDARY: 'boundary',
};

/** Subtype yang boleh di-resize (hanya boundary). */
export const ARCH_RESIZABLE = { [ARCH_NODE_TYPES.BOUNDARY]: true };

export const ARCH_DEFAULT_SIZES = {
  [ARCH_NODE_TYPES.PERSON]: { width: 120, height: 150 },
  [ARCH_NODE_TYPES.SYSTEM]: { width: 200, height: 100 },
  [ARCH_NODE_TYPES.CONTAINER]: { width: 220, height: 120 },
  [ARCH_NODE_TYPES.DATABASE]: { width: 180, height: 110 },
  [ARCH_NODE_TYPES.BOUNDARY]: { width: 520, height: 360 },
};

export const ARCH_DEFAULT_LABELS = {
  [ARCH_NODE_TYPES.PERSON]: 'Person',
  [ARCH_NODE_TYPES.SYSTEM]: 'System',
  [ARCH_NODE_TYPES.CONTAINER]: 'Container',
  [ARCH_NODE_TYPES.DATABASE]: 'Database',
  [ARCH_NODE_TYPES.BOUNDARY]: 'System Boundary',
};

/** Field tambahan per subtype (selain `type` + `label`). */
export const ARCH_DEFAULT_FIELDS = {
  [ARCH_NODE_TYPES.PERSON]: { description: '' },
  [ARCH_NODE_TYPES.SYSTEM]: { description: '', external: false },
  [ARCH_NODE_TYPES.CONTAINER]: { technology: '', description: '' },
  [ARCH_NODE_TYPES.DATABASE]: { technology: '' },
  [ARCH_NODE_TYPES.BOUNDARY]: {},
};

export const ARCH_MIN_SIZES = {
  [ARCH_NODE_TYPES.BOUNDARY]: { minWidth: 240, minHeight: 180 },
};

/** Urutan palet di sidebar. */
export const ARCH_SHAPES = [
  { type: ARCH_NODE_TYPES.PERSON, name: 'Person', desc: 'User / actor' },
  { type: ARCH_NODE_TYPES.SYSTEM, name: 'System', desc: 'Software system' },
  { type: ARCH_NODE_TYPES.CONTAINER, name: 'Container', desc: 'App / service' },
  { type: ARCH_NODE_TYPES.DATABASE, name: 'Database', desc: 'Data store' },
  { type: ARCH_NODE_TYPES.BOUNDARY, name: 'Boundary', desc: 'System scope' },
];

/** Placeholder label relationship: "Description [technology]". */
export const ARCH_DEFAULT_EDGE_LABEL = 'Description [technology]';
