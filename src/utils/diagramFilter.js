import { getDiagramType } from '../config/diagramTypes';

/**
 * Filter diagram berdasarkan nama atau label tipe (registry), case-insensitive,
 * spasi di tepi query diabaikan. Query kosong → array apa adanya.
 * Murni: tidak menyentuh store/disk, tidak memutasi input.
 */
export function filterDiagrams(diagrams, query) {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return diagrams;

  return diagrams.filter(
    (d) =>
      (d.name ?? '').toLowerCase().includes(q) ||
      getDiagramType(d.type).label.toLowerCase().includes(q),
  );
}
