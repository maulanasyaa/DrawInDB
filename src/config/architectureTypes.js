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

/**
 * Anchor handle per subtype: koordinat PENUH (x, y) pecahan 0..1 terhadap kotak
 * node, per sisi. Satu-satunya sumber angka — dipakai `ARCH_HANDLE_STYLES`
 * (style handle React Flow) dan `geometryOf()` (ujung edge). Handle bawaan
 * React Flow selalu menempel di tepi KOTAK node; subtype yang bentuknya bukan
 * kotak penuh perlu kedua sumbu.
 *
 * Database: silinder `viewBox 0 0 60 40` dirender 2/3 × 1/2 kotak, rata tengah
 * → x 30..150 (16.67%..83.33%), y 2..57 dari 180×110.
 *  • top    → puncak ellipse (y 0), x 25%
 *  • bottom → dasar silinder (y 52%), x 75%
 *  • left / right → dinding silinder (x 16.67% / 83.33%), y 8% (puncak ellipse)
 */
export const ARCH_HANDLE_ANCHORS = {
  [ARCH_NODE_TYPES.PERSON]: {
    top: { x: 0.5, y: 0.02 },
    bottom: { x: 0.5, y: 1 },
    left: { x: 0.35, y: 0.25 },
    right: { x: 0.65, y: 0.25 },
  },
  [ARCH_NODE_TYPES.BOUNDARY]: {
    top: { x: 0.5, y: 0 },
    bottom: { x: 0.5, y: 1 },
    left: { x: 0, y: 0.5 },
    right: { x: 1, y: 0.5 },
  },
  [ARCH_NODE_TYPES.DATABASE]: {
    top: { x: 0.25, y: 0 },
    bottom: { x: 0.75, y: 0.52 },
    left: { x: 0.1667, y: 0.08 },
    right: { x: 0.8333, y: 0.08 },
  },
};

/**
 * `style` handle React Flow: kedua sumbu eksplisit (menimpa `-4px`/`50%` kelas
 * bawaan `react-flow__handle-<pos>`), supaya titik handle tepat di tepi bentuk.
 */
export const ARCH_HANDLE_STYLES = Object.fromEntries(
  Object.entries(ARCH_HANDLE_ANCHORS).map(([subtype, sides]) => [
    subtype,
    Object.fromEntries(
      Object.entries(sides).map(([side, { x, y }]) => [
        side,
        { left: `${x * 100}%`, top: `${y * 100}%` },
      ]),
    ),
  ]),
);

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
