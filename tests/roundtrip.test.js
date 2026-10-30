import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { seed, restore, s, table, col } from './helpers.js';

/**
 * Mock `window.api` in-memory. `pathJoin` cukup concat dengan '/',
 * karena semua path yang dipakai store relatif terhadap vault.
 */
function installFakeFs() {
  const files = new Map();
  globalThis.window = {
    api: {
      pathJoin: (...parts) => parts.filter(Boolean).join('/'),
      readFile: async (p) => {
        if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
        return files.get(p);
      },
      writeFile: async (p, content) => {
        files.set(p, content);
      },
    },
  };
  return files;
}

const VAULT = '/vault';
const PROJ = 'proj-1';
const FILE = 'diagram.json';

/** State "diagram kosong" setelah load, sebelum diisi. */
function seedForType(meta) {
  seed(meta, { _vaultPath: VAULT, _projectId: PROJ, _filename: FILE });
}

/** Isi state sesuai tipe, lalu simpan. */
async function buildAndSave(meta) {
  seedForType(meta);

  if (meta.type === 'erd') {
    s().addTable({ x: 0, y: 0 });
    const [t] = s().tables;
    s().updateTable(t.id, { name: 'users' });
    s().addColumn(t.id);
    const c = s().tables[0].data.columns[0];
    s().updateColumn(t.id, c.id, { name: 'id', type: 'INT', pk: true });
  } else if (meta.type === 'flowchart') {
    s().addFlowNode('terminal', { x: 0, y: 0 });
    s().addFlowNode('decision', { x: 0, y: 200 });
    const [a, b] = s().nodes.map((n) => n.id);
    s().onConnect({ source: a, target: b });
  } else {
    s().addUseCaseNode('actor', { x: 0, y: 0 });
    s().addUseCaseNode('useCase', { x: 200, y: 0 });
    const [a, b] = s().nodes.map((n) => n.id);
    s().setUseCaseRelType('include');
    s().onConnect({ source: a, target: b });
  }

  s().updateCanvas({ x: 12, y: 34, zoom: 1.25 });
  await s().saveDiagram();
}

const snapshot = () => ({
  tables: s().tables,
  relationships: s().relationships,
  nodes: s().nodes,
  flowEdges: s().flowEdges,
  canvasState: s().canvasState,
  isDirty: s().isDirty,
});

const META = {
  erd: { type: 'erd', name: 'ERD', db_type: 'postgresql' },
  flowchart: { type: 'flowchart', name: 'Flow' },
  usecase: { type: 'usecase', name: 'UC' },
};

let files;
beforeEach(() => {
  files = installFakeFs();
});
afterEach(() => {
  restore();
  delete globalThis.window;
});

describe('round-trip save → load', () => {
  it.each(['erd', 'flowchart', 'usecase'])(
    '%s: state → JSON → state identik',
    async (type) => {
      const meta = META[type];
      await buildAndSave(meta);
      const before = snapshot();

      // File benar-benar ditulis ke "disk"
      expect(files.size).toBe(1);
      expect(s().isDirty).toBe(false);

      s().cleanup();
      await s().loadDiagram(VAULT, PROJ, FILE);

      expect(snapshot()).toEqual(before);
      expect(s().diagramMeta).toMatchObject(meta);
      expect(s().isLoading).toBe(false);
      expect(s().loadError).toBe(null);
    },
  );

  it('format file tetap version/meta/canvas/tables/relationships/nodes/edges', async () => {
    await buildAndSave(META.erd);
    const raw = JSON.parse([...files.values()][0]);

    expect(Object.keys(raw).sort()).toEqual(
      ['canvas', 'edges', 'meta', 'nodes', 'relationships', 'tables', 'version'].sort(),
    );
    expect(raw.version).toBe('1.0');
    expect(raw.meta.db_type).toBe('postgresql');
    expect(raw.edges).toEqual([]);
    expect(raw.meta.updated_at).toBeTruthy();
  });

  it('loadDiagram memaksa type "table" pada tabel ERD (normalisasi format lama)', async () => {
    const p = `${VAULT}/projects/${PROJ}/diagrams/${FILE}`;
    files.set(
      p,
      JSON.stringify({
        version: '1.0',
        meta: { type: 'erd', name: 'legacy' },
        canvas: { x: 0, y: 0, zoom: 1 },
        tables: [table('t1', 'users', [col('c1', 'id', 'INT', { pk: true })])].map(
          ({ type, ...rest }) => rest, // file lama tanpa field type
        ),
        relationships: [],
      }),
    );

    seedForType(META.erd);
    await s().loadDiagram(VAULT, PROJ, FILE);

    expect(s().tables[0].type).toBe('table');
    expect(s().nodes).toEqual([]);
    expect(s().flowEdges).toEqual([]);
  });

  it('loadDiagram menormalkan canvas pan lama ke x/y', async () => {
    const p = `${VAULT}/projects/${PROJ}/diagrams/${FILE}`;
    files.set(
      p,
      JSON.stringify({
        meta: { type: 'flowchart', name: 'old' },
        canvas: { pan: { x: 7, y: 8 }, zoom: 2 },
      }),
    );

    seedForType(META.flowchart);
    await s().loadDiagram(VAULT, PROJ, FILE);

    expect(s().canvasState).toEqual({ x: 7, y: 8, zoom: 2 });
  });

  it('loadDiagram membaca file Use Case lama tanpa nodes/edges sebagai kosong', async () => {
    const p = `${VAULT}/projects/${PROJ}/diagrams/${FILE}`;
    files.set(p, JSON.stringify({ meta: { type: 'usecase', name: 'uc' } }));

    seedForType(META.usecase);
    await s().loadDiagram(VAULT, PROJ, FILE);

    expect(s()).toMatchObject({
      tables: [],
      relationships: [],
      nodes: [],
      flowEdges: [],
      canvasState: { x: 0, y: 0, zoom: 1 },
    });
  });

  it('loadDiagram gagal set loadError tanpa crash', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    seedForType(META.erd);
    await s().loadDiagram(VAULT, PROJ, 'tidak-ada.json');

    expect(s().isLoading).toBe(false);
    expect(s().loadError).toMatch(/Failed to load diagram/);
    spy.mockRestore();
  });
});
