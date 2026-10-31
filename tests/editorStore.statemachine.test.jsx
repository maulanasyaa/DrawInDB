import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { useEditorStore } from '../src/store/editorStore.js';
import {
  SM_NODE_TYPES,
  SM_DEFAULT_SIZES,
} from '../src/config/stateMachineTypes.js';
import { EDITOR_TYPES, getEditorConfig } from '../src/config/editorTypes.jsx';
import { CONNECT_STRATEGIES } from '../src/config/connectStrategies.js';
import { DIAGRAM_TYPES, DIAGRAM_TYPE_LIST } from '../src/config/diagramTypes.js';
import { seed, restore, s } from './helpers.js';

const SM = { type: 'statemachine', name: 'Order Status' };

afterEach(restore);

describe('registry ↔ editor config', () => {
  it('setiap tipe di registry punya entri EDITOR_TYPES dan strategi onConnect', () => {
    for (const t of DIAGRAM_TYPE_LIST) {
      expect(EDITOR_TYPES[t.id], `EDITOR_TYPES.${t.id}`).toBeTruthy();
      expect(CONNECT_STRATEGIES[t.id], `CONNECT_STRATEGIES.${t.id}`).toBeTypeOf('function');
    }
  });

  it('tidak ada entri EDITOR_TYPES yatim (tipe tidak terdaftar di registry)', () => {
    expect(Object.keys(EDITOR_TYPES).sort()).toEqual(Object.keys(DIAGRAM_TYPES).sort());
  });

  it('config tak dikenal jatuh ke perilaku ERD', () => {
    expect(getEditorConfig(undefined)).toBe(EDITOR_TYPES.erd);
    expect(getEditorConfig('nope')).toBe(EDITOR_TYPES.erd);
    expect(getEditorConfig('statemachine')).toBe(EDITOR_TYPES.statemachine);
  });
});

describe('editorStore State Machine — addStateMachineNode', () => {
  // [subtype, width, height]
  it.each([
    [SM_NODE_TYPES.INITIAL, 40, 40],
    [SM_NODE_TYPES.STATE, 180, 72],
    [SM_NODE_TYPES.FINAL, 44, 44],
    [SM_NODE_TYPES.CHOICE, 72, 72],
  ])('subtype %s → style %ix%i', (subtype, width, height) => {
    seed(SM);
    s().addStateMachineNode(subtype, { x: 5, y: 6 });

    const n = s().nodes[0];
    expect(n.id).toMatch(/^sm-\d+-\d+$/);
    expect(n.type).toBe('statemachine');
    expect(n.position).toEqual({ x: 5, y: 6 });
    expect(n.data.type).toBe(subtype);
    expect(n.style).toEqual({ width, height });
  });

  it('state punya field entry/exit/do kosong; node lain tidak', () => {
    seed(SM);
    s().addStateMachineNode(SM_NODE_TYPES.STATE, { x: 0, y: 0 });
    s().addStateMachineNode(SM_NODE_TYPES.CHOICE, { x: 0, y: 0 });

    expect(s().nodes[0].data).toEqual({
      type: SM_NODE_TYPES.STATE,
      label: 'State',
      entry: '',
      exit: '',
      do: '',
    });
    expect(s().nodes[1].data).toEqual({ type: SM_NODE_TYPES.CHOICE, label: '' });
  });

  it('ukuran palet initial/final lebih kecil dari state', () => {
    expect(SM_DEFAULT_SIZES[SM_NODE_TYPES.INITIAL].width).toBeLessThan(
      SM_DEFAULT_SIZES[SM_NODE_TYPES.STATE].width,
    );
  });
});


describe('editorStore State Machine — transitions', () => {
  const addPair = () => {
    seed(SM);
    s().addStateMachineNode(SM_NODE_TYPES.INITIAL, { x: 0, y: 0 });
    s().addStateMachineNode(SM_NODE_TYPES.STATE, { x: 200, y: 0 });
    return s().nodes.map((n) => n.id);
  };

  it('onConnect membuat edge bertipe statemachine dengan label kosong', () => {
    const [a, b] = addPair();
    s().onConnect({ source: a, target: b });

    const e = s().flowEdges[0];
    expect(e.id).toMatch(/^sm-/);
    expect(e.type).toBe('statemachine');
    expect(e.data).toEqual({ label: '' });
    expect([e.source, e.target]).toEqual([a, b]);
  });

  it('self-transition tersimpan (tidak dibuang oleh dedupe addEdge)', () => {
    seed(SM);
    s().addStateMachineNode(SM_NODE_TYPES.STATE, { x: 0, y: 0 });
    const [a] = s().nodes.map((n) => n.id);

    // Dua transition dari state yang sama = dua edge (event berbeda).
    s().onConnect({ source: a, target: a, sourceHandle: 'right', targetHandle: 'right' });
    s().onConnect({ source: a, target: a, sourceHandle: 'right', targetHandle: 'right' });

    expect(s().flowEdges).toHaveLength(2);
    expect(s().flowEdges.every((e) => e.source === a && e.target === a)).toBe(true);
  });

  it('setStateMachineEdgeLabel menulis ke data.label', () => {
    const [a, b] = addPair();
    s().onConnect({ source: a, target: b });

    s().setStateMachineEdgeLabel(s().flowEdges[0].id, 'pay [amount > 0] / charge');

    expect(s().flowEdges[0].data.label).toBe('pay [amount > 0] / charge');
    expect(s().flowEdges[0].label).toBeUndefined();
  });

  it('hapus node ikut menghapus transition-nya', () => {
    const [a, b] = addPair();
    s().onConnect({ source: a, target: b });
    s().onConnect({ source: b, target: b });

    s().onNodesChange([{ id: b, type: 'remove' }]);

    expect(s().flowEdges).toEqual([]);
  });
});

describe('editorStore State Machine — undo/redo', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('tambah node = satu snapshot per aksi', () => {
    seed(SM);
    s().addStateMachineNode(SM_NODE_TYPES.STATE, { x: 0, y: 0 });
    s().addStateMachineNode(SM_NODE_TYPES.FINAL, { x: 200, y: 0 });
    expect(s().historyPast).toHaveLength(2);

    s().undo();
    expect(s().nodes.map((n) => n.data.type)).toEqual([SM_NODE_TYPES.STATE]);
    s().undo();
    expect(s().nodes).toEqual([]);

    s().redo();
    s().redo();
    expect(s().nodes.map((n) => n.data.type)).toEqual([
      SM_NODE_TYPES.STATE,
      SM_NODE_TYPES.FINAL,
    ]);
  });

  it('connect = satu snapshot; undo membuang transition saja', () => {
    seed(SM);
    s().addStateMachineNode(SM_NODE_TYPES.INITIAL, { x: 0, y: 0 });
    s().addStateMachineNode(SM_NODE_TYPES.STATE, { x: 200, y: 0 });
    const [a, b] = s().nodes.map((n) => n.id);
    const pastBefore = s().historyPast.length;

    s().onConnect({ source: a, target: b });
    expect(s().historyPast).toHaveLength(pastBefore + 1);

    s().undo();
    expect(s().flowEdges).toEqual([]);
    expect(s().nodes).toHaveLength(2);

    s().redo();
    expect(s().flowEdges).toHaveLength(1);
  });

  it('koneksi ERD yang ditolak tidak menambah history', () => {
    seed(
      { type: 'erd', name: 'E' },
      {
        tables: [
          { id: 't1', type: 'table', position: { x: 0, y: 0 }, data: { name: 't1', columns: [] } },
        ],
      },
    );

    // Kolom tidak ada → strategi ERD menolak.
    s().onConnect({ source: 't1', sourceHandle: 'missing', target: 't1', targetHandle: 'missing' });

    expect(s().historyPast).toEqual([]);
    expect(s().relationships).toEqual([]);
  });
});

describe('editorStore State Machine — round-trip save/load', () => {
  afterEach(() => {
    delete globalThis.window;
  });

  it('nodes + edges (termasuk self-transition) identik setelah save → load', async () => {
    const files = new Map();
    globalThis.window = {
      api: {
        pathJoin: (...p) => p.filter(Boolean).join('/'),
        readFile: async (p) => {
          if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
          return files.get(p);
        },
        writeFile: async (p, c) => files.set(p, c),
      },
    };
    const VAULT = '/vault';
    const PROJ = 'proj-1';
    const FILE = 'order_statemachine.json';

    seed(SM, { _vaultPath: VAULT, _projectId: PROJ, _filename: FILE });
    s().addStateMachineNode(SM_NODE_TYPES.INITIAL, { x: 0, y: 0 });
    s().addStateMachineNode(SM_NODE_TYPES.STATE, { x: 200, y: 0 });
    s().addStateMachineNode(SM_NODE_TYPES.FINAL, { x: 400, y: 0 });
    const [init, state, fin] = s().nodes.map((n) => n.id);
    s().onConnect({ source: init, target: state });
    s().onConnect({ source: state, target: state, sourceHandle: 'right', targetHandle: 'right' });
    s().onConnect({ source: state, target: fin });
    s().setStateMachineEdgeLabel(s().flowEdges[0].id, 'create');
    s().updateNodeData(state, { entry: 'reserve()', exit: 'release()', do: 'notify()' });

    await s().saveDiagram();
    const raw = JSON.parse([...files.values()][0]);

    expect(raw.meta.type).toBe('statemachine');
    expect(raw.nodes).toHaveLength(3);
    expect(raw.edges).toHaveLength(3);
    expect(raw.tables).toEqual([]);
    expect(raw.relationships).toEqual([]);

    const before = { nodes: s().nodes, flowEdges: s().flowEdges };
    s().cleanup();
    await s().loadDiagram(VAULT, PROJ, FILE);

    expect({ nodes: s().nodes, flowEdges: s().flowEdges }).toEqual(before);
    expect(s().diagramMeta.type).toBe('statemachine');
    expect(s().loadError).toBe(null);
  });
});
