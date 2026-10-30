// Validasi ringan Architecture (peringatan visual, bukan blokir aksi).
// Pure: dipakai node (badge) dan test.
//
// Semua pesan berprefix "Architecture: " supaya exportImage.js cukup memakai
// satu `startsWith` untuk membuang badge peringatan dari PNG.

import { ARCH_NODE_TYPES } from '../config/architectureTypes';

const PREFIX = 'Architecture: ';

/**
 * @returns {{ nodeWarnings: Record<string, string> }}
 */
export function validateArchitecture(nodes = [], edges = []) {
  const nodeWarnings = {};

  const connected = new Set();
  const inbound = new Set();
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
    inbound.add(e.target);
  }

  for (const n of nodes) {
    const subtype = n.data?.type;
    const name = n.data?.label || subtype;

    // Boundary adalah pengelompok, bukan partisipan relasi.
    if (subtype !== ARCH_NODE_TYPES.BOUNDARY && !connected.has(n.id)) {
      nodeWarnings[n.id] = `${PREFIX}${name} has no relationships`;
      continue;
    }

    if (
      (subtype === ARCH_NODE_TYPES.CONTAINER || subtype === ARCH_NODE_TYPES.DATABASE) &&
      !n.data?.technology?.trim()
    ) {
      nodeWarnings[n.id] = `${PREFIX}${name} has no technology`;
      continue;
    }

    if (subtype === ARCH_NODE_TYPES.PERSON && inbound.has(n.id)) {
      nodeWarnings[n.id] = `${PREFIX}${name} should not receive relationships`;
    }
  }

  return { nodeWarnings };
}
