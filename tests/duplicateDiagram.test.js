import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { copyName, buildDiagramCopy } from '../src/utils/diagramCopy.js';
import { useVaultStore } from '../src/store/vaultStore.js';

describe('copyName', () => {
  it('nama bebas menjadi "<nama> (salinan)"', () => {
    expect(copyName('Login Flow', [])).toBe('Login Flow (salinan)');
  });

  it('salinan pertama sudah ada → (salinan 2), lalu (salinan 3)', () => {
    expect(copyName('Login Flow', ['Login Flow', 'Login Flow (salinan)'])).toBe('Login Flow (salinan 2)');
    expect(
      copyName('Login Flow', ['Login Flow', 'Login Flow (salinan)', 'Login Flow (salinan 2)'])
    ).toBe('Login Flow (salinan 3)');
  });

  it('tidak mengubah daftar nama yang diberikan', () => {
    const names = ['A', 'A (salinan)'];
    copyName('A', names);
    expect(names).toEqual(['A', 'A (salinan)']);
  });
});

describe('buildDiagramCopy', () => {
  const source = {
    version: '1.0',
    meta: {
      projectId: 'p1',
      name: 'Checkout',
      type: 'sequence',
      created_at: '2020-01-01T00:00:00.000Z',
      updated_at: '2020-01-01T00:00:00.000Z',
    },
    canvas: { x: 0, y: 0, zoom: 1 },
    tables: [],
    relationships: [],
    nodes: [],
    edges: [],
    participants: [{ id: 'a', name: 'A', kind: 'participant' }],
    messages: [{ id: 'm1', from: 'a', to: 'a', label: 'ping', kind: 'self' }],
    options: { showNumbers: true },
  };

  it('mengganti nama, projectId, dan timestamp saja', () => {
    const copy = buildDiagramCopy(source, {
      projectId: 'p2',
      name: 'Checkout (salinan)',
      now: '2026-10-31T00:00:00.000Z',
    });

    expect(copy.meta).toEqual({
      projectId: 'p2',
      name: 'Checkout (salinan)',
      type: 'sequence',
      created_at: '2026-10-31T00:00:00.000Z',
      updated_at: '2026-10-31T00:00:00.000Z',
    });
    expect(Object.keys(copy)).toEqual(Object.keys(source));
    expect(copy.participants).toEqual(source.participants);
    expect(copy.messages).toEqual(source.messages);
    expect(copy.options).toEqual(source.options);
  });

  it('salinan tidak berbagi referensi dengan sumber', () => {
    const copy = buildDiagramCopy(source, { projectId: 'p1', name: 'X', now: 'now' });
    copy.participants[0].name = 'diubah';
    copy.messages.push({ id: 'm2' });

    expect(source.participants[0].name).toBe('A');
    expect(source.messages).toHaveLength(1);
  });
});

/** fs palsu minimal: cukup untuk openVault + duplicateDiagram. */
function installFakeFs(seedFiles = {}) {
  const files = new Map(Object.entries(seedFiles));
  const dirs = new Set(['/vault', '/vault/.drawindb', '/vault/projects', '/vault/projects/p1']);

  globalThis.window = {
    api: {
      pathJoin: (...parts) => parts.filter(Boolean).join('/'),
      readFile: async (p) => {
        if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
        return files.get(p);
      },
      writeFile: async (p, content) => files.set(p, content),
      mkdir: async (p) => dirs.add(p),
      pathExists: async (p) =>
        files.has(p) || dirs.has(p) || [...files.keys()].some((k) => k.startsWith(`${p}/`)),
      listFiles: async (p) => {
        const names = new Set();
        for (const key of files.keys()) {
          if (key.startsWith(`${p}/`)) names.add(key.slice(p.length + 1).split('/')[0]);
        }
        for (const d of dirs) {
          if (d.startsWith(`${p}/`)) names.add(d.slice(p.length + 1).split('/')[0]);
        }
        return [...names].map((name) => ({ name, isDirectory: !files.has(`${p}/${name}`) }));
      },
      saveRecentVault: async () => true,
      getRecentVaults: async () => [],
      setCurrentVaultPath: async () => true,
    },
  };

  return files;
}

const DIAGRAMS = '/vault/projects/p1/diagrams';
const SOURCE_FILE = `${DIAGRAMS}/login_flow_flowchart.json`;

const seedVault = () => ({
  '/vault/.drawindb/config.json': JSON.stringify({ vault_name: 'v', migrated: true }),
  '/vault/projects/p1/project.json': JSON.stringify({ id: 'p1', name: 'P' }),
  [SOURCE_FILE]: JSON.stringify({
    version: '1.0',
    meta: { projectId: 'p1', name: 'Login Flow', type: 'flowchart' },
    canvas: { x: 0, y: 0, zoom: 1 },
    tables: [],
    relationships: [],
    nodes: [{ id: 'n1', type: 'flowchart', position: { x: 0, y: 0 }, data: { label: 'Start' } }],
    edges: [],
  }),
});

const diagrams = () => useVaultStore.getState().currentVault.projects[0].diagrams;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  useVaultStore.setState({ currentVault: null, isLoading: false, error: null });
  vi.restoreAllMocks();
  delete globalThis.window;
});

describe('duplicateDiagram', () => {
  it('menulis file salinan bertipe sama dan menambahkannya ke daftar', async () => {
    const files = installFakeFs(seedVault());
    await useVaultStore.getState().openVault('/vault');

    const filename = await useVaultStore.getState().duplicateDiagram('p1', 'login_flow_flowchart.json');

    expect(filename).not.toBe('login_flow_flowchart.json');
    expect(files.has(`${DIAGRAMS}/${filename}`)).toBe(true);

    const copy = JSON.parse(files.get(`${DIAGRAMS}/${filename}`));
    expect(copy.meta.name).toBe('Login Flow (salinan)');
    expect(copy.meta.type).toBe('flowchart');
    expect(copy.nodes).toEqual([
      { id: 'n1', type: 'flowchart', position: { x: 0, y: 0 }, data: { label: 'Start' } },
    ]);
    expect(diagrams()[0]).toMatchObject({ filename, name: 'Login Flow (salinan)', type: 'flowchart' });
  });

  it('dua kali duplikasi menghasilkan (salinan) lalu (salinan 2)', async () => {
    installFakeFs(seedVault());
    await useVaultStore.getState().openVault('/vault');

    await useVaultStore.getState().duplicateDiagram('p1', 'login_flow_flowchart.json');
    await useVaultStore.getState().duplicateDiagram('p1', 'login_flow_flowchart.json');

    const names = diagrams().map((d) => d.name);
    expect(new Set(names)).toEqual(
      new Set(['Login Flow', 'Login Flow (salinan)', 'Login Flow (salinan 2)'])
    );
    expect(new Set(diagrams().map((d) => d.filename)).size).toBe(3);
  });

  it('file sumber tidak berubah', async () => {
    const files = installFakeFs(seedVault());
    await useVaultStore.getState().openVault('/vault');
    const before = files.get(SOURCE_FILE);

    await useVaultStore.getState().duplicateDiagram('p1', 'login_flow_flowchart.json');

    expect(files.get(SOURCE_FILE)).toBe(before);
  });
});
