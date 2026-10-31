/**
 * Item terbaru lintas project untuk daftar "Continue" di Home.
 * Murni: tidak menyentuh disk, store, atau IPC. Diagram dan dokumen digabung
 * karena bagi user keduanya tujuan yang sama.
 *
 * Catatan: `updated_at` di memori baru disegarkan saat vault dibuka ulang
 * (saveDiagram tidak memberi tahu vaultStore), jadi urutan bisa basi dalam
 * satu sesi. Cukup untuk v1.
 */
export function collectRecentWork(vault, limit = 6) {
  const projects = vault?.projects ?? [];

  return projects
    .flatMap((project) => [
      ...(project.diagrams ?? []).map((d) => ({
        kind: "diagram",
        projectId: project.id,
        projectName: project.name,
        filename: d.filename,
        name: d.name,
        type: d.type,
        dbType: d.db_type,
        updatedAt: d.updated_at,
      })),
      ...(project.documents ?? []).map((d) => ({
        kind: "document",
        projectId: project.id,
        projectName: project.name,
        filename: d.filename,
        name: d.name,
        type: d.type,
        updatedAt: d.updated_at,
      })),
    ])
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, limit);
}
