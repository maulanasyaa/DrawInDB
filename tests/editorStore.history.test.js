import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { useEditorStore } from '../src/store/editorStore.js';
import { USECASE_NODE_TYPES } from '../src/config/useCaseTypes.js';
import { restore, s, table, col, node, findCol } from './helpers.js';

const ERD = { type: 'erd', name: 'Test ERD', db_type: 'mysql' };
const FLOW = { type: 'flowchart', name: 'Flow' };
const UC = { type: 'usecase', name: 'UC' };

/**
 * Versi `seed` lokal tanpa stub `setTimeout`: test history butuh timer asli
 * (fake timers) supaya debounce 500 ms ketikan bisa diuji.
 */
function reset(meta, state = {}) {
  useEditorStore.getState().cleanup();
  let clock = 1_700_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => (clock += 2));
  useEditorStore.setState({ diagramMeta: meta, ...state });
}

const seedErd = () =>
  reset(ERD, {
    tables: [
      table('users', 'users', [col('users.id', 'id', 'INT', { pk: true })]),
      table('orders', 'orders', [
        col('orders.id', 'id', 'INT', { pk: true }),
        col('orders.user_id', 'user_id', 'INT'),
      ]),
    ],
  });

const connectUserToOrder = () =>
  s().onConnect({
    source: 'users',
    sourceHandle: 'users.id',
    target: 'orders',
    targetHandle: 'orders.user_id',
  });

const past = () => s().historyPast;
const future = () => s().historyFuture;

beforeEach(() => {
  vi.useFakeTimers();
  // Autosave memakai window.api yang tidak ada di test: error-nya disenyapkan.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  restore();
  vi.useRealTimers();
});

describe('history — ERD', () => {
  it('addTable bisa di-undo/redo', () => {
    reset(ERD);
    expect(s().canUndo()).toBe(false);

    s().addTable({ x: 0, y: 0 });
    expect(s().tables).toHaveLength(1);
    expect(past()).toHaveLength(1);

    s().undo();
    expect(s().tables).toEqual([]);
    expect(s().canUndo()).toBe(false);
    expect(s().canRedo()).toBe(true);

    s().redo();
    expect(s().tables).toHaveLength(1);
    expect(s().canRedo()).toBe(false);
  });

  it('undo menandai dirty supaya auto-save menyusul', () => {
    reset(ERD);
    s().addTable({ x: 0, y: 0 });
    useEditorStore.setState({ isDirty: false });

    s().undo();
    expect(s().isDirty).toBe(true);
  });

  it('ketikan updateColumn digabung jadi satu snapshot per burst', () => {
    seedErd();
    s().updateColumn('users', 'users.id', { name: 'i' });
    vi.advanceTimersByTime(100);
    s().updateColumn('users', 'users.id', { name: 'id' });
    vi.advanceTimersByTime(100);
    s().updateColumn('users', 'users.id', { name: 'id2' });
    vi.advanceTimersByTime(600);

    expect(findCol('users.id').name).toBe('id2');
    expect(past()).toHaveLength(1);

    s().undo();
    expect(findCol('users.id').name).toBe('id');

    s().redo();
    expect(findCol('users.id').name).toBe('id2');
  });

  it('dua burst ketikan terpisah menghasilkan dua snapshot', () => {
    seedErd();
    s().updateColumn('users', 'users.id', { name: 'a' });
    vi.advanceTimersByTime(600);
    s().updateColumn('users', 'users.id', { name: 'b' });
    vi.advanceTimersByTime(600);

    expect(past()).toHaveLength(2);
    s().undo();
    expect(findCol('users.id').name).toBe('a');
    s().undo();
    expect(findCol('users.id').name).toBe('id');
  });

  it('undo saat ketikan belum jatuh tempo tetap mengembalikan sebelum burst', () => {
    seedErd();
    s().updateColumn('users', 'users.id', { name: 'typed' });
    expect(past()).toHaveLength(0);

    s().undo();
    expect(findCol('users.id').name).toBe('id');
  });

  it('deleteTable mengembalikan tabel, relasi, dan flag FK', () => {
    seedErd();
    connectUserToOrder();
    expect(s().relationships).toHaveLength(1);
    expect(findCol('orders.user_id').fk).toBe(true);

    s().deleteTable('orders');
    expect(s().relationships).toEqual([]);

    s().undo();
    expect(s().tables.map((t) => t.id)).toEqual(['users', 'orders']);
    expect(s().relationships).toHaveLength(1);
    expect(findCol('orders.user_id').fk).toBe(true);
  });
});

describe('history — Flowchart / Use Case', () => {
  it('addFlowNode + onConnect bisa di-undo/redo', () => {
    reset(FLOW);
    s().addFlowNode('process', { x: 0, y: 0 });
    s().addFlowNode('terminal', { x: 200, y: 0 });
    const [a, b] = s().nodes.map((n) => n.id);
    s().onConnect({ source: a, target: b });
    expect(s().flowEdges).toHaveLength(1);
    expect(past()).toHaveLength(3);

    s().undo(); // batalkan connect
    expect(s().flowEdges).toEqual([]);
    expect(s().nodes).toHaveLength(2);

    s().undo(); // batalkan node kedua
    expect(s().nodes).toHaveLength(1);

    s().redo();
    expect(s().nodes).toHaveLength(2);
  });

  it('addUseCaseNode + onConnect bisa di-undo', () => {
    reset(UC);
    s().addUseCaseNode(USECASE_NODE_TYPES.ACTOR, { x: 0, y: 0 });
    s().addUseCaseNode(USECASE_NODE_TYPES.USE_CASE, { x: 200, y: 0 });
    const [a, b] = s().nodes.map((n) => n.id);
    s().onConnect({ source: a, target: b });
    expect(s().flowEdges).toHaveLength(1);

    s().undo();
    expect(s().flowEdges).toEqual([]);
    expect(s().nodes).toHaveLength(2);
  });

  it('updateNodeData (label) digabung jadi satu snapshot', () => {
    reset(FLOW, { nodes: [node('n1', 'process')] });
    s().updateNodeData('n1', { label: 'L' });
    s().updateNodeData('n1', { label: 'La' });
    s().updateNodeData('n1', { label: 'Lab' });
    vi.advanceTimersByTime(600);

    expect(past()).toHaveLength(1);
    s().undo();
    expect(s().nodes[0].data.label).toBe('process');
    expect(s().canUndo()).toBe(false);
    s().undo(); // no-op, tidak crash
    expect(s().nodes[0].data.label).toBe('process');
  });
});

describe('history — aturan stack', () => {
  it('stack dibatasi 100 entri', () => {
    reset(FLOW);
    for (let i = 0; i < 105; i++) s().addFlowNode('process', { x: i, y: 0 });

    expect(s().nodes).toHaveLength(105);
    expect(past()).toHaveLength(100);
  });

  it('aksi baru mengosongkan stack future', () => {
    reset(FLOW);
    s().addFlowNode('process', { x: 0, y: 0 });
    s().undo();
    expect(s().canRedo()).toBe(true);

    s().addFlowNode('terminal', { x: 100, y: 0 });
    expect(s().canRedo()).toBe(false);
    expect(future()).toEqual([]);
  });

  it('drag digabung jadi satu snapshot, selection tidak dicatat', () => {
    reset(FLOW, { nodes: [node('n1', 'process')] });

    s().onNodesChange([{ id: 'n1', type: 'select', selected: true }]);
    expect(past()).toHaveLength(0);
    expect(s().isDirty).toBe(false);

    s().onNodesChange([{ id: 'n1', type: 'position', position: { x: 0, y: 0 }, dragging: true }]);
    s().onNodesChange([{ id: 'n1', type: 'position', position: { x: 12, y: 0 }, dragging: true }]);
    s().onNodesChange([{ id: 'n1', type: 'position', position: { x: 24, y: 24 }, dragging: false }]);
    expect(past()).toHaveLength(1);
    expect(s().nodes[0].position).toEqual({ x: 24, y: 24 });

    s().undo();
    expect(s().nodes[0].position).toEqual({ x: 0, y: 0 });
    s().redo();
    expect(s().nodes[0].position).toEqual({ x: 24, y: 24 });

    // drag kedua = entri baru (endpoint pre-drag = posisi akhir drag pertama)
    s().undo();
    s().onNodesChange([{ id: 'n1', type: 'position', position: { x: 0, y: 0 }, dragging: true }]);
    s().onNodesChange([{ id: 'n1', type: 'position', position: { x: 0, y: 48 }, dragging: false }]);
    expect(past()).toHaveLength(1);
    expect(s().nodes[0].position).toEqual({ x: 0, y: 48 });
  });

  it('resize (dimensions) dicatat karena ukuran tersimpan di file', () => {
    reset(FLOW, { nodes: [node('n1', 'process')] });
    s().onNodesChange([{ id: 'n1', type: 'dimensions', dimensions: { width: 300, height: 120 } }]);
    expect(past()).toHaveLength(1);

    s().undo();
    expect(s().nodes[0].width).toBeUndefined();
  });

  it('pan/zoom tidak masuk history', () => {
    reset(FLOW);
    s().updateCanvas({ x: 5, y: 5, zoom: 2 });
    expect(past()).toHaveLength(0);
    expect(s().canvasState).toEqual({ x: 5, y: 5, zoom: 2 });
  });

  it('loadDiagram mereset history', async () => {
    globalThis.window = {
      api: {
        pathJoin: (...p) => p.join('/'),
        readFile: async () => JSON.stringify({ meta: FLOW, tables: [], nodes: [], edges: [] }),
        writeFile: async () => {},
      },
    };
    try {
      reset(FLOW);
      s().addFlowNode('process', { x: 0, y: 0 });
      s().undo();
      expect(past().length + future().length).toBeGreaterThan(0);

      await s().loadDiagram('/v', 'p', 'f.json');

      expect(s().historyPast).toEqual([]);
      expect(s().historyFuture).toEqual([]);
    } finally {
      delete globalThis.window;
    }
  });

  it('cleanup mereset history dan membuang ketikan menggantung', () => {
    seedErd();
    s().updateColumn('users', 'users.id', { name: 'x' });

    s().cleanup();

    expect(s().historyPast).toEqual([]);
    expect(s().historyFuture).toEqual([]);
    // Timer burst yang dibuang tidak boleh menyuntik entri setelah reset.
    vi.advanceTimersByTime(1000);
    expect(s().historyPast).toEqual([]);
  });
});
