import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useVaultStore } from '../src/store/vaultStore.js';
import { createPrdDoc } from '../src/utils/prd.js';

const VAULT = '/vault';
const PROJ = 'proj-1';
const BASE = `${VAULT}/projects/${PROJ}`;

/**
 * Virtual fs: file = Map entry, folder = tercatat di `dirs` atau tersirat
 * dari prefix path file. Cukup untuk openVault + CRUD dokumen.
 */
function installFakeFs(seedFiles = {}) {
  const files = new Map(Object.entries(seedFiles));
  const dirs = new Set([VAULT, `${VAULT}/.drawindb`, `${VAULT}/projects`, BASE]);

  const api = {
    pathJoin: (...parts) => parts.filter(Boolean).join('/'),
    readFile: async (p) => {
      if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
      return files.get(p);
    },
    writeFile: async (p, content) => {
      files.set(p, content);
    },
    deleteFile: async (p) => {
      if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
      files.delete(p);
    },
    deleteDirectory: async (p) => {
      dirs.delete(p);
      for (const key of [...files.keys()]) {
        if (key.startsWith(`${p}/`)) files.delete(key);
      }
    },
    // Dipakai action hapus: pindah ke Trash OS, hapus file atau isi folder.
    trashPath: async (p) => {
      const exists =
        files.has(p) || dirs.has(p) || [...files.keys()].some((k) => k.startsWith(`${p}/`));
      if (!exists) throw new Error(`ENOENT: ${p}`);
      files.delete(p);
      dirs.delete(p);
      for (const key of [...files.keys()]) {
        if (key.startsWith(`${p}/`)) files.delete(key);
      }
    },
    mkdir: async (p) => {
      dirs.add(p);
    },
    pathExists: async (p) =>
      files.has(p) || dirs.has(p) || [...files.keys()].some((k) => k.startsWith(`${p}/`)),
    listFiles: async (p) => {
      const names = new Set();
      for (const key of files.keys()) {
        if (!key.startsWith(`${p}/`)) continue;
        const rest = key.slice(p.length + 1);
        names.add(rest.split('/')[0]);
      }
      for (const d of dirs) {
        if (d.startsWith(`${p}/`)) names.add(d.slice(p.length + 1).split('/')[0]);
      }
      return [...names].map((name) => ({
        name,
        isDirectory: !files.has(`${p}/${name}`),
      }));
    },
    saveRecentVault: async () => true,
    getRecentVaults: async () => [],
    setCurrentVaultPath: async () => true,
  };

  globalThis.window = { api };
  return { files, dirs, api };
}

const config = () => ({ [`${VAULT}/.drawindb/config.json`]: JSON.stringify({ vault_name: 'vault', migrated: true }) });
const projectMeta = () => ({ [`${BASE}/project.json`]: JSON.stringify({ id: PROJ, name: 'Project' }) });

const vault = () => useVaultStore.getState().currentVault;
const documents = () => vault().projects.find((p) => p.id === PROJ).documents;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  useVaultStore.setState({ currentVault: null, isLoading: false, error: null });
  vi.restoreAllMocks();
  delete globalThis.window;
});

describe('openVault — documents', () => {
  it('project lama tanpa docs/ tetap terbuka dengan documents: []', async () => {
    installFakeFs({ ...config(), ...projectMeta() });
    await useVaultStore.getState().openVault(VAULT);

    expect(useVaultStore.getState().error).toBeNull();
    expect(vault().projects).toHaveLength(1);
    expect(vault().projects[0].documents).toEqual([]);
    expect(vault().projects[0].diagrams).toEqual([]);
  });

  it('membaca dokumen dan mengabaikan file rusak / non-json / dotfile', async () => {
    const doc = createPrdDoc(PROJ, 'Checkout PRD');
    installFakeFs({
      ...config(),
      ...projectMeta(),
      [`${BASE}/docs/checkout.json`]: JSON.stringify(doc),
      [`${BASE}/docs/broken.json`]: '{ bukan json',
      [`${BASE}/docs/notes.txt`]: 'abaikan',
      [`${BASE}/docs/.DS_Store`]: 'x',
    });

    await useVaultStore.getState().openVault(VAULT);

    expect(useVaultStore.getState().error).toBeNull();
    expect(documents()).toHaveLength(1);
    expect(documents()[0]).toMatchObject({
      filename: 'checkout.json',
      name: 'Checkout PRD',
      type: 'prd',
    });
  });

  it('meta dokumen minimal tetap diberi nama dari filename', async () => {
    installFakeFs({
      ...config(),
      ...projectMeta(),
      [`${BASE}/docs/old_doc.json`]: JSON.stringify({ sections: [], stories: [] }),
    });

    await useVaultStore.getState().openVault(VAULT);

    expect(documents()[0]).toMatchObject({ name: 'old doc', type: 'prd' });
  });

  it('daftar diagram project lama tidak berubah', async () => {
    installFakeFs({
      ...config(),
      ...projectMeta(),
      [`${BASE}/diagrams/auth_erd.json`]: JSON.stringify({
        meta: { name: 'Auth', type: 'erd', updated_at: '2026-01-01T00:00:00.000Z' },
      }),
    });

    await useVaultStore.getState().openVault(VAULT);

    expect(vault().projects[0].diagrams).toEqual([
      expect.objectContaining({ filename: 'auth_erd.json', name: 'Auth', type: 'erd' }),
    ]);
  });
});

describe('createDocument', () => {
  beforeEach(async () => {
    installFakeFs({ ...config(), ...projectMeta() });
    await useVaultStore.getState().openVault(VAULT);
  });

  it('membuat folder docs/, menulis file, dan memperbarui daftar', async () => {
    const filename = await useVaultStore.getState().createDocument(PROJ, 'My PRD');

    expect(filename).toBe('my_prd.json');
    const saved = JSON.parse(await readFileRaw(`${BASE}/docs/my_prd.json`));
    expect(saved.meta).toMatchObject({ name: 'My PRD', type: 'prd', projectId: PROJ });
    expect(saved.sections).toHaveLength(7);
    expect(documents()).toEqual([expect.objectContaining({ filename: 'my_prd.json', name: 'My PRD' })]);
  });

  it('nama bentrok diberi suffix _1', async () => {
    await useVaultStore.getState().createDocument(PROJ, 'My PRD');
    const second = await useVaultStore.getState().createDocument(PROJ, 'My PRD');

    expect(second).toBe('my_prd_1.json');
    expect(documents()).toHaveLength(2);
  });

  it('sanitasi nama file: tanpa path traversal', async () => {
    const filename = await useVaultStore.getState().createDocument(PROJ, '../../etc/passwd');

    expect(filename).toBe('etc_passwd.json');
  });
});

describe('renameDocument', () => {
  beforeEach(async () => {
    installFakeFs({ ...config(), ...projectMeta() });
    await useVaultStore.getState().openVault(VAULT);
    await useVaultStore.getState().createDocument(PROJ, 'Old Name');
  });

  it('mengubah meta.name di file dan di daftar', async () => {
    await useVaultStore.getState().renameDocument(PROJ, 'old_name.json', 'New Name');

    const saved = JSON.parse(await readFileRaw(`${BASE}/docs/old_name.json`));
    expect(saved.meta.name).toBe('New Name');
    expect(documents()[0]).toMatchObject({ filename: 'old_name.json', name: 'New Name' });
  });
});

describe('deleteDocument', () => {
  beforeEach(async () => {
    installFakeFs({ ...config(), ...projectMeta() });
    await useVaultStore.getState().openVault(VAULT);
    await useVaultStore.getState().createDocument(PROJ, 'Doomed');
  });

  it('menghapus file dan entri daftar', async () => {
    await useVaultStore.getState().deleteDocument(PROJ, 'doomed.json');

    expect(documents()).toEqual([]);
    expect(await readFileRaw(`${BASE}/docs/doomed.json`)).toBeUndefined();
  });
});

describe('deleteProject', () => {
  it('memindahkan folder project (beserta docs/) ke Trash', async () => {
    installFakeFs({
      ...config(),
      ...projectMeta(),
      [`${BASE}/docs/a.json`]: '{}',
      [`${BASE}/diagrams/d.json`]: '{}',
    });
    await useVaultStore.getState().openVault(VAULT);

    const calls = [];
    const original = globalThis.window.api.trashPath;
    globalThis.window.api.trashPath = async (p) => {
      calls.push(p);
      return original(p);
    };

    await useVaultStore.getState().deleteProject(PROJ);

    expect(calls).toEqual([BASE]);
    expect(await readFileRaw(`${BASE}/docs/a.json`)).toBeUndefined();
    expect(vault().projects).toEqual([]);
  });
});

describe('deleteDiagram', () => {
  const DIAGRAM = `${BASE}/diagrams/auth_erd.json`;

  function seedDiagram() {
    installFakeFs({
      ...config(),
      ...projectMeta(),
      [DIAGRAM]: JSON.stringify({ meta: { name: 'Auth', type: 'erd' } }),
    });
  }

  it('memindahkan file diagram ke Trash dan menghapus baris', async () => {
    seedDiagram();
    await useVaultStore.getState().openVault(VAULT);
    expect(vault().projects[0].diagrams).toHaveLength(1);

    const calls = [];
    const original = globalThis.window.api.trashPath;
    globalThis.window.api.trashPath = async (p) => {
      calls.push(p);
      return original(p);
    };

    await useVaultStore.getState().deleteDiagram(PROJ, 'auth_erd.json');

    expect(calls).toEqual([DIAGRAM]);
    expect(vault().projects[0].diagrams).toEqual([]);
    expect(await readFileRaw(DIAGRAM)).toBeUndefined();
  });

  it('melempar error dan membiarkan state utuh kalau Trash ditolak', async () => {
    seedDiagram();
    await useVaultStore.getState().openVault(VAULT);
    const before = vault();

    globalThis.window.api.trashPath = async () => {
      throw new Error("Error invoking remote method 'fs:trashPath': Error: Access denied: nope");
    };

    await expect(useVaultStore.getState().deleteDiagram(PROJ, 'auth_erd.json')).rejects.toThrow(
      'Access denied: nope',
    );

    expect(vault()).toBe(before);
    expect(vault().projects[0].diagrams).toHaveLength(1);
    expect(useVaultStore.getState().error).toBeNull();
  });
});

async function readFileRaw(p) {
  try {
    return await globalThis.window.api.readFile(p);
  } catch {
    return undefined;
  }
}
