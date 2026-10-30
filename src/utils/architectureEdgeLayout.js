// Perhitungan murni untuk tata letak edge Architecture (bebas React/React Flow
// supaya bisa diuji di environment node).
//
// Kenapa `pathOptions.offset` React Flow TIDAK dipakai lagi: di v11 `getPoints()`
// memakai `offset` hanya sebagai panjang stub sebelum belokan; koridor selalu
// `centerX`/`centerY` = titik tengah pasangan source-target. Dua edge dengan
// koridor sama tetap satu garis, berapa pun offset-nya, dan edge dari node
// berbeda tidak pernah "paralel" sehingga offset tak pernah berubah.
//
// Penggantinya: kisi koridor berbasis POSISI KORIDOR (bukan pasangan node).
// Semua edge yang koridornya bertumpuk diberi jarak tetap; edge lain tetap
// berbentuk smoothstep biasa.

import { Position } from 'reactflow';
import { ARCH_HANDLE_ANCHORS } from '../config/architectureTypes.js';

/** zIndex node boundary: paling belakang (di bawah node & edge lain). */
export const ARCH_BOUNDARY_Z = -2;
/** zIndex edge Architecture: di atas node (termasuk boundary). */
export const ARCH_EDGE_Z = 1;

/** Offset dasar smoothstep (bawaan React Flow). */
export const ARCH_PATH_OFFSET = 20;
/** Jarak antar koridor yang bertumpuk. */
export const ARCH_CORRIDOR_STEP = 28;

const DIR = {
  [Position.Left]: { x: -1, y: 0, axis: 'x' },
  [Position.Right]: { x: 1, y: 0, axis: 'x' },
  [Position.Top]: { x: 0, y: -1, axis: 'y' },
  [Position.Bottom]: { x: 0, y: 1, axis: 'y' },
};

/** Kunci grup: edge dianggap paralel bila source/target DAN handle-nya sama. */
export function parallelKey(edge) {
  return [
    edge.source,
    edge.sourceHandle ?? '',
    edge.target,
    edge.targetHandle ?? '',
  ].join('|');
}

// ===== geometri dasar ======================================================

/** Kotak node dari node React Flow ({ position, width, height }). */
export function nodeBox(node) {
  if (!node) return null;
  const w = node.width ?? node.style?.width ?? 0;
  const h = node.height ?? node.style?.height ?? 0;
  if (!w || !h) return null;
  return { x: node.position.x, y: node.position.y, w, h };
}

// ===== koridor =============================================================

/**
 * Koridor satu edge = nilai x (vertikal) atau nilai y (horizontal) tempat jalur
 * berjalan, dihitung dengan formula yang SAMA dengan `getPoints()` React Flow
 * v11. Edge yang koridornya bertumpuk diberi slot berbeda di kisi.
 *
 * @param {{sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,offset?}} geom
 * @returns {{ axis: 'h' | 'v', value: number }}
 */
export function corridorOf(geom) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    offset = ARCH_PATH_OFFSET,
  } = geom;
  const sDir = DIR[sourcePosition] || DIR[Position.Right];
  const tDir = DIR[targetPosition] || DIR[Position.Left];
  const gs = { x: sourceX + sDir.x * offset, y: sourceY + sDir.y * offset };
  const gt = { x: targetX + tDir.x * offset, y: targetY + tDir.y * offset };
  const mainAxis = Math.abs(gt.x - gs.x) >= Math.abs(gt.y - gs.y) ? 'x' : 'y';

  // Handle berhadapan (kanan↔kiri / atas↔bawah): satu koridor di tengah.
  if (sDir[mainAxis] * tDir[mainAxis] === -1) {
    return sDir.axis === 'x'
      ? { axis: 'v', value: (sourceX + targetX) / 2 }
      : { axis: 'h', value: (sourceY + targetY) / 2 };
  }
  // Handle sejenis: satu belokan memakai x dari source dan y dari target.
  return sDir.axis === 'x'
    ? { axis: 'h', value: (sourceY + targetY) / 2 }
    : { axis: 'v', value: (sourceX + targetX) / 2 };
}

/** Geser slot: 0, +1, -1, +2, -2, … (koridor berurutan menurut urutan edge). */
export function slotOffset(index) {
  if (index === 0) return 0;
  const magnitude = Math.ceil(index / 2);
  return index % 2 === 1 ? magnitude : -magnitude;
}

/**
 * Peta slot koridor untuk seluruh edge Architecture (fungsi murni, dipakai uji
 * & hook). Edge dengan koridor bertumpuk mendapat slot 0, +1, -1, +2, … sesuai
 * urutan kemunculannya di `edges`.
 *
 * @param {Array} edges  semua flowEdges
 * @param {(edge) => geom|null} geomOf  resolver geometri (node + handle)
 * @returns {Map<string, { axis: 'h'|'v', value: number, slot: number }>}
 */
export function corridorSlots(edges = [], geomOf = () => null) {
  const pointers = new Map();
  const result = new Map();
  for (const edge of edges) {
    const geom = geomOf(edge);
    if (!geom) continue;
    const corridor = corridorOf(geom);
    const key = `${corridor.axis}:${Math.round(corridor.value)}`;
    const index = pointers.get(key) ?? 0;
    pointers.set(key, index + 1);
    const slot = slotOffset(index);
    result.set(edge.id, {
      axis: corridor.axis,
      value: corridor.value + slot * ARCH_CORRIDOR_STEP,
      slot,
    });
  }
  return result;
}

/** Titik jalur (termasuk ujung source/target) untuk satu slot koridor. */
export function pathPoints(geom, slot) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    offset = ARCH_PATH_OFFSET,
  } = geom;
  const sDir = DIR[sourcePosition] || DIR[Position.Right];
  const tDir = DIR[targetPosition] || DIR[Position.Left];
  const src = { x: sourceX, y: sourceY };
  const tgt = { x: targetX, y: targetY };
  const gs = { x: sourceX + sDir.x * offset, y: sourceY + sDir.y * offset };
  const gt = { x: targetX + tDir.x * offset, y: targetY + tDir.y * offset };
  const mid = slot
    ? slot.axis === 'v'
      ? [
          { x: slot.value, y: gs.y },
          { x: slot.value, y: gt.y },
        ]
      : [
          { x: gs.x, y: slot.value },
          { x: gt.x, y: slot.value },
        ]
    : sDir.axis === 'x'
      ? [
          { x: gs.x, y: (sourceY + targetY) / 2 },
          { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 },
        ]
      : [
          { x: (sourceX + targetX) / 2, y: gs.y },
          { x: (sourceX + targetX) / 2, y: gt.y },
        ];
  return dedupe([src, gs, ...mid, gt, tgt]);
}

function dedupe(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
  }
  return out;
}

/**
 * SVG path lurus (tanpa belok membulat) — dipakai `BaseEdge`; tikungan membulat
 * diurus oleh radius yang sama untuk semua ruas supaya label tetap di koridor.
 */
export function pointsToPath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/**
 * Jalur + posisi label satu edge Architecture.
 *
 * @param {object} geom
 * @param {{axis:'h'|'v', value:number, slot:number}|undefined} slot
 * @returns {{ path: string, labelX: number, labelY: number }}
 */
export function archEdgePath(geom, slot) {
  const points = pathPoints(geom, slot);
  const middle = points[Math.floor(points.length / 2)] || points[0];
  return { path: pointsToPath(points), labelX: middle.x, labelY: middle.y };
}

// ===== slot per edge (dipakai komponen) ===================================
// Satu komponen edge hanya menerima geometrinya sendiri, jadi geometri edge
// LAIN dihitung dari store (`flowEdges` + `nodes`). Hasil di-memo per pasangan
// identitas (edges, nodes): saat node digeser, array `nodes` baru → hitung ulang.

/**
 * Anchor handle per side — satu sumber angka dengan `ARCH_HANDLE_STYLES`
 * (config). `left`/`right` = pecahan di sepanjang tepi tegak (y);
 * `top`/`bottom` = pecahan di sepanjang tepi mendatar (x).
 */
const HANDLE_ANCHOR = ARCH_HANDLE_ANCHORS;

/**
 * Geometri satu edge dari node (posisi + ukuran + anchor handle subtype).
 * Hanya modul ini yang perlu tahu selisih handle↔kotak.
 */
export function geometryOf(edge, nodes = []) {
  const source = nodes.find((n) => n.id === edge.source);
  const target = nodes.find((n) => n.id === edge.target);
  const sb = nodeBox(source);
  const tb = nodeBox(target);
  if (!sb || !tb) return null;
  const s = handlePoint(sb, source.data?.type, edge.sourceHandle || 'right');
  const t = handlePoint(tb, target.data?.type, edge.targetHandle || 'left');
  return {
    sourceX: s.x,
    sourceY: s.y,
    targetX: t.x,
    targetY: t.y,
    sourcePosition: s.position,
    targetPosition: t.position,
  };
}

const POSITION_BY_HANDLE = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/**
 * Titik handle pada kotak node, memperhitungkan anchor subtype.
 * `left`/`right` bergeser sepanjang tepi tegak (y); `top`/`bottom` sepanjang
 * tepi mendatar (x). Sisi lain tetap di tepi kotak.
 */
/**
 * Titik handle pada kotak node. Memakai `ARCH_HANDLE_ANCHORS` (sumber yang sama
 * dengan `style` handle), jadi ujung edge selalu tepat di titik handle yang
 * terlihat.
 */
function handlePoint(box, subtype, handleId) {
  const side = handleId.split('-')[0];
  const anchor = HANDLE_ANCHOR[subtype]?.[side];
  // Fallback (subtype tanpa anchor, mis. container/system): tepi kotak itu
  // sendiri. `right` = sisi kanan, `bottom` = sisi bawah, dst.
  const fx = anchor?.x ?? (side === 'right' ? 1 : side === 'left' ? 0 : 0.5);
  const fy = anchor?.y ?? (side === 'bottom' ? 1 : side === 'top' ? 0 : 0.5);
  return {
    x: box.x + box.w * fx,
    y: box.y + box.h * fy,
    position: POSITION_BY_HANDLE[side] || Position.Right,
  };
}

/** Cache satu entri: render beruntun dengan array sama tidak menghitung ulang. */
let _slotCache = { edges: null, nodes: null, slots: new Map() };

/**
 * Peta slot koridor untuk semua edge Architecture, di-memo per identitas
 * (edges, nodes). Dipakai komponen edge; fungsi murni `corridorSlots` dipakai
 * uji.
 */
export function useArchSlots(edges = [], nodes = []) {
  if (_slotCache.edges === edges && _slotCache.nodes === nodes) return _slotCache.slots;
  const slots = corridorSlots(edges, (edge) => geometryOf(edge, nodes));
  _slotCache = { edges, nodes, slots };
  return slots;
}

/** Label edge dengan isi? (label atau teknologi). */
export function hasArchEdgeContent(data) {
  return Boolean(data?.label?.trim() || data?.technology?.trim());
}

/**
 * Label hanya digambar bila ada isi, atau saat edge dipilih/diedit
 * (placeholder). Edge kosong & tidak dipilih → tidak ada elemen sama sekali.
 */
export function shouldRenderArchEdgeLabel({ data, selected, editing } = {}) {
  return Boolean(editing || selected || hasArchEdgeContent(data));
}

/** Placeholder: bukan label sebenarnya, tidak boleh ikut Export PNG. */
export function isArchEdgePlaceholder({ data, editing } = {}) {
  return !editing && !hasArchEdgeContent(data);
}
