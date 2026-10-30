// Perhitungan murni untuk tata letak edge Architecture (bebas React supaya bisa
// diuji di environment node).
//
// Alasan desain:
//  • React Flow sudah memberi titik tengah handle sebagai sourceX/Y, dan handle
//    Architecture sengaja duduk di tepi BENTUK (lihat ARCH_HANDLE_ANCHORS), jadi
//    modul ini tidak perlu (dan tidak boleh) menghitung ulang geometri node.
//  • Pemisahan edge paralel memakai PASANGAN node+handle (bukan posisi koridor):
//    A→B dan B→A harus dianggap satu grup, kalau tidak keduanya menumpuk.
//  • Jalurnya bezier, bukan polyline ortogonal.

/** zIndex node boundary: paling belakang (di bawah node & edge lain). */
export const ARCH_BOUNDARY_Z = -2;
/** zIndex edge Architecture: di atas node (termasuk boundary). */
export const ARCH_EDGE_Z = 1;

/** Jarak antar edge dalam satu grup pasangan. */
export const ARCH_SLOT_STEP = 24;
/**
 * Setengah kotak handle (`!w-3` = 12 px). React Flow memberi titik ujung di
 * TEPI LUAR kotak handle, jadi ujung path ditarik masuk sejauh ini supaya
 * garis/panah menyentuh tepi bentuk.
 */
export const ARCH_HANDLE_INSET = 6;
/** Panjang stub keluar dari sisi handle. */
export const ARCH_MIN_STUB = 40;
export const ARCH_MAX_STUB = 200;

const DIR = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

const dirOf = (position) => DIR[position] || DIR.right;
/** Normal sebuah sisi: putar arah keluar 90° (dir × kanan-tangan). */
const normalOf = (dir) => ({ x: -dir.y, y: dir.x });

/**
 * Kunci grup TAK BERARAH: pasangan node terurut + pasangan handle terurut.
 * A→B dan B→A masuk grup yang sama; pasangan handle berbeda tetap terpisah.
 */
export function pairGroupKey(edge) {
  return [
    ...[edge.source, edge.target].map(String).sort(),
    ...[edge.sourceHandle ?? '', edge.targetHandle ?? ''].sort(),
  ].join('|');
}

/**
 * Offset tegak lurus per edge (px), simetris di dalam grup dan deterministik
 * (diurutkan per id).
 *
 * Tanda ikut arah source→target: untuk A→B dan B→A normal kedua sisi memang
 * berlawanan, jadi offset yang SAMA menghasilkan busur fisik ke sisi yang
 * berlawanan. Tanpa penyesuaian tanda, dua offset berlawanan tanda justru
 * meniadakan selisih itu dan kedua kurva menumpuk persis.
 */
export function parallelOffsets(edges = []) {
  const groups = new Map();
  for (const edge of edges) {
    const key = pairGroupKey(edge);
    const list = groups.get(key);
    if (list) list.push(edge);
    else groups.set(key, [edge]);
  }

  const offsets = new Map();
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const n = sorted.length;
    sorted.forEach((edge, i) => {
      const forward = String(edge.source) <= String(edge.target);
      offsets.set(edge.id, (i - (n - 1) / 2) * ARCH_SLOT_STEP * (forward ? 1 : -1));
    });
  }
  return offsets;
}

/**
 * Jalur bezier satu edge + posisi label di titik tengah kurva (t=0.5).
 *
 * Keluar dari sisi handle: titik kontrol pertama = ujung + arah sisi × stub,
 * digeser sejauh `offset` di sepanjang normal sisi SOURCE. Normal yang sama
 * dipakai untuk kedua kontrol supaya kurva membusur ke SATU sisi (memakai
 * normal sisi target — yang biasanya berlawanan — akan menghasilkan kurva-S
 * yang memutar, bukan edge paralel).
 */
export function archEdgePath({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  offset = 0,
}) {
  const sDir = dirOf(sourcePosition);
  const tDir = dirOf(targetPosition);
  const normal = normalOf(sDir);

  // Tarik ujung ke dalam sepanjang sisi (React Flow memberi tepi luar handle).
  const sx = sourceX - sDir.x * ARCH_HANDLE_INSET;
  const sy = sourceY - sDir.y * ARCH_HANDLE_INSET;
  const tx = targetX - tDir.x * ARCH_HANDLE_INSET;
  const ty = targetY - tDir.y * ARCH_HANDLE_INSET;

  const dist = Math.hypot(tx - sx, ty - sy);
  const stub = Math.min(Math.max(dist * 0.4, ARCH_MIN_STUB), ARCH_MAX_STUB);

  const c1x = sx + sDir.x * stub + normal.x * offset;
  const c1y = sy + sDir.y * stub + normal.y * offset;
  const c2x = tx + tDir.x * stub + normal.x * offset;
  const c2y = ty + tDir.y * stub + normal.y * offset;

  // Titik kubik t=0.5 — rumus yang sama dengan getBezierEdgeCenter React Flow.
  return {
    path: `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}`,
    labelX: (sx + 3 * c1x + 3 * c2x + tx) / 8,
    labelY: (sy + 3 * c1y + 3 * c2y + ty) / 8,
  };
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
