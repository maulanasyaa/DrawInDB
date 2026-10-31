// Salinan diagram: fungsi murni, tanpa disk/IPC. Dipakai vaultStore.duplicateDiagram.

/**
 * Nama salinan: "<nama> (salinan)", lalu "(salinan 2)", "(salinan 3)", …
 * `existingNames` = nama semua diagram di project (folder diagrams/ datar,
 * bukan per tipe), supaya dua salinan tidak memakai nama tampilan sama.
 */
export function copyName(name, existingNames = []) {
  const taken = new Set(existingNames);
  const base = `${name} (salinan)`;
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${name} (salinan ${n})`)) n++;
  return `${name} (salinan ${n})`;
}

/**
 * Objek diagram baru dari objek hasil JSON.parse. Hanya `meta` yang berubah;
 * seluruh isi (tables/relationships, nodes/edges, participants/messages/options)
 * disalin utuh sehingga berlaku untuk semua tipe di registry tanpa percabangan.
 */
export function buildDiagramCopy(source, { projectId, name, now = new Date().toISOString() }) {
  const copy = structuredClone(source);
  copy.meta = { ...copy.meta, projectId, name, created_at: now, updated_at: now };
  return copy;
}
