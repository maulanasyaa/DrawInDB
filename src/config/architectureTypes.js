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
 * Ukuran kotak BENTUK visual (px) untuk subtype yang bentuknya bukan kotak
 * node penuh. Aspeknya sengaja sama dengan viewBox SVG-nya, supaya
 * `preserveAspectRatio` tidak menyisakan letterbox dan pecahan anchor di bawah
 * = koordinat SVG persis. Subtype tanpa entri → bentuknya seluruh kotak node.
 */
export const ARCH_SHAPE_SIZES = {
  [ARCH_NODE_TYPES.PERSON]: { width: 56, height: 98 }, // viewBox 40×70
  [ARCH_NODE_TYPES.DATABASE]: { width: 108, height: 72 }, // viewBox 60×40
};

const BOX_ANCHORS = {
  top: { x: 0.5, y: 0 },
  right: { x: 1, y: 0.5 },
  bottom: { x: 0.5, y: 1 },
  left: { x: 0, y: 0.5 },
};

/**
 * Anchor handle per subtype: pecahan 0..1 terhadap kotak BENTUK visual
 * (`ARCH_SHAPE_SIZES`; subtype tanpa bentuk = kotak node) — BUKAN terhadap
 * kotak node yang ikut memuat label/deskripsi. Titiknya = tengah stroke bentuk.
 */
export const ARCH_HANDLE_ANCHORS = {
  [ARCH_NODE_TYPES.PERSON]: {
    top: { x: 0.5, y: 3 / 70 }, // puncak kepala (cy 10, r 7)
    right: { x: 32 / 40, y: 26 / 70 }, // ujung lengan
    bottom: { x: 0.5, y: 64 / 70 }, // ujung kaki
    left: { x: 8 / 40, y: 26 / 70 }, // ujung lengan
  },
  [ARCH_NODE_TYPES.DATABASE]: {
    top: { x: 0.5, y: 1 / 40 }, // puncak ellipse (cy 8, ry 7)
    right: { x: 56 / 60, y: 0.5 }, // dinding silinder
    bottom: { x: 0.5, y: 39 / 40 }, // dasar arc (32 + 7)
    left: { x: 4 / 60, y: 0.5 }, // dinding silinder
  },
  [ARCH_NODE_TYPES.SYSTEM]: BOX_ANCHORS,
  [ARCH_NODE_TYPES.CONTAINER]: BOX_ANCHORS,
  [ARCH_NODE_TYPES.BOUNDARY]: BOX_ANCHORS,
};

/**
 * `style` handle React Flow. `left`/`top` + `translate(-50%,-50%)` menaruh
 * TITIK TENGAH handle tepat di anchor; `right`/`bottom` di-`auto`-kan karena
 * kelas `react-flow__handle-<pos>` memasang `-4px` di sumbu itu (dan kelasnya
 * hanya memusatkan satu sumbu, jadi transform-nya ditimpa inline).
 */
export const ARCH_HANDLE_STYLES = Object.fromEntries(
  Object.entries(ARCH_HANDLE_ANCHORS).map(([subtype, sides]) => [
    subtype,
    Object.fromEntries(
      Object.entries(sides).map(([side, { x, y }]) => [
        side,
        {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          right: 'auto',
          bottom: 'auto',
          transform: 'translate(-50%, -50%)',
        },
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
