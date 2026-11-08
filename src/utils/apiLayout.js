export const LAYOUT_GAP_X = 48;
export const LAYOUT_GAP_Y = 24;

/**
 * Setelah node `id` membesar (width×height), dorong node terhubung yang
 * berada di kanan/bawahnya agar tetap ada jarak. Hanya sumbu yang memang
 * sudah "di sisi yang sama" yang dipaksa — tetangga kiri/atas tidak disentuh.
 * Mengembalikan array node baru, atau null jika tidak ada perubahan.
 */
export function pushGrownNeighbors(nodes, edges, id, width, height) {
  const src = nodes.find((node) => node.id === id);
  if (!src) return null;
  const minX = src.position.x + width + LAYOUT_GAP_X;
  const minY = src.position.y + height + LAYOUT_GAP_Y;
  let changed = false;
  const next = nodes.map((node) => {
    if (node.id === id) return node;
    const connected = edges.some(
      (e) =>
        (e.source === id && e.target === node.id) ||
        (e.target === id && e.source === node.id),
    );
    if (!connected) return node;
    let { x, y } = node.position;
    if (node.position.x > src.position.x && x < minX) {
      x = minX;
      changed = true;
    }
    if (node.position.y > src.position.y && y < minY) {
      y = minY;
      changed = true;
    }
    return { ...node, position: { x, y } };
  });
  return changed ? next : null;
}
