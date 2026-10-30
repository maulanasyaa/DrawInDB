import { describe, it, expect, afterEach } from 'vitest';
import { useEditorStore } from '../src/store/editorStore.js';
import {
  ARCH_NODE_TYPES,
  ARCH_DEFAULT_SIZES,
} from '../src/config/architectureTypes.js';
import {
  DIAGRAM_TYPES,
  DIAGRAM_TYPE_LIST,
  getDiagramType,
  isGraphType,
  isErdType,
} from '../src/config/diagramTypes.js';
import { EDITOR_TYPES } from '../src/config/editorTypes.jsx';
import { CONNECT_STRATEGIES } from '../src/config/connectStrategies.js';
import { seed, restore, s } from './helpers.js';

const ARCH = { type: 'architecture', name: 'Online Store System' };

afterEach(restore);

describe('registry Architecture (tipe ke-5)', () => {
  it('entri registry sesuai spek', () => {
    const t = getDiagramType('architecture');

    expect(t).not.toBe(DIAGRAM_TYPES.erd);
    expect(t).toMatchObject({
      id: 'architecture',
      label: 'Architecture',
      labelPlural: 'Architecture Diagrams',
      placeholder: 'Online Store System',
      badge: 'ARCHITECTURE',
      backLabel: 'Architecture',
      icon: expect.anything(),
      dataShape: 'graph',
      hasDbType: false,
      exports: { png: true, sql: false, json: false },
    });
  });

  it('helper mengenali tipe graph, bukan ERD', () => {
    expect(isGraphType('architecture')).toBe(true);
    expect(isErdType('architecture')).toBe(false);
  });

  it('terdaftar terakhir di DIAGRAM_TYPE_LIST (fallback getDiagramType tetap ERD)', () => {
    expect(DIAGRAM_TYPE_LIST.map((t) => t.id)).toEqual([
      'erd',
      'flowchart',
      'usecase',
      'statemachine',
      'architecture',
    ]);
    expect(getDiagramType('nope').id).toBe('erd');
  });

  it('editor config + strategi koneksi terdaftar untuk Architecture', () => {
    expect(EDITOR_TYPES.architecture).toBeTruthy();
    expect(Object.keys(EDITOR_TYPES.architecture.nodeTypes)).toEqual(['architecture']);
    expect(Object.keys(EDITOR_TYPES.architecture.edgeTypes)).toEqual(['architecture']);
    expect(CONNECT_STRATEGIES.architecture).toBeTypeOf('function');
  });
});

describe('editorStore Architecture — addArchitectureNode', () => {
  it.each(Object.values(ARCH_NODE_TYPES))('subtype %s → node graph dengan ukuran default', (subtype) => {
    seed(ARCH);
    s().addArchitectureNode(subtype, { x: 5, y: 6 });

    const node = s().nodes[0];
    expect(node.id).toMatch(/^arch-\d+-\d+$/);
    expect(node.type).toBe('architecture');
    expect(node.position).toEqual({ x: 5, y: 6 });
    expect(node.data.type).toBe(subtype);
    expect(node.style).toEqual(ARCH_DEFAULT_SIZES[subtype]);
  });

  it('field default per subtype: teknologi hanya container/database, external hanya system', () => {
    seed(ARCH);
    s().addArchitectureNode(ARCH_NODE_TYPES.PERSON, { x: 0, y: 0 });
    s().addArchitectureNode(ARCH_NODE_TYPES.SYSTEM, { x: 0, y: 0 });
    s().addArchitectureNode(ARCH_NODE_TYPES.CONTAINER, { x: 0, y: 0 });
    s().addArchitectureNode(ARCH_NODE_TYPES.DATABASE, { x: 0, y: 0 });

    const [person, system, container, database] = s().nodes.map((n) => n.data);
    expect(person).toEqual({ type: 'person', label: 'Person', description: '' });
    expect(system).toEqual({
      type: 'system',
      label: 'System',
      description: '',
      external: false,
    });
    expect(container).toEqual({
      type: 'container',
      label: 'Container',
      technology: '',
      description: '',
    });
    expect(database).toEqual({ type: 'database', label: 'Database', technology: '' });
  });

  it('boundary ditaruh di layer paling belakang (indeks 0)', () => {
    seed(ARCH);
    s().addArchitectureNode(ARCH_NODE_TYPES.SYSTEM, { x: 0, y: 0 });
    s().addArchitectureNode(ARCH_NODE_TYPES.BOUNDARY, { x: 0, y: 0 });

    expect(s().nodes.map((n) => n.data.type)).toEqual(['boundary', 'system']);
  });
});

describe('editorStore Architecture — relationships', () => {
  const addPair = () => {
    seed(ARCH);
    s().addArchitectureNode(ARCH_NODE_TYPES.PERSON, { x: 0, y: 0 });
    s().addArchitectureNode(ARCH_NODE_TYPES.SYSTEM, { x: 200, y: 0 });
    return s().nodes.map((n) => n.id);
  };

  it('onConnect membuat edge bertipe architecture dengan label + teknologi kosong', () => {
    const [a, b] = addPair();
    s().onConnect({ source: a, target: b });

    const edge = s().flowEdges[0];
    expect(edge.id).toMatch(/^arch-/);
    expect(edge.type).toBe('architecture');
    expect(edge.data).toEqual({ label: '', technology: '' });
    expect([edge.source, edge.target]).toEqual([a, b]);
  });

  it('self-loop ditolak tanpa menambah edge maupun history', () => {
    const [a] = addPair();
    const before = s().historyPast.length;

    s().onConnect({ source: a, target: a });

    expect(s().flowEdges).toEqual([]);
    expect(s().historyPast).toHaveLength(before);
  });

  it('dua relationship antara pasangan node sama tetap tersimpan (tanpa dedupe)', () => {
    const [a, b] = addPair();
    s().onConnect({ source: a, target: b });
    s().onConnect({ source: a, target: b });

    expect(s().flowEdges).toHaveLength(2);
    expect(new Set(s().flowEdges.map((e) => e.id)).size).toBe(2);
  });

  it('setArchitectureEdgeData mengubah label & teknologi tanpa menghapus field lain', () => {
    const [a, b] = addPair();
    s().onConnect({ source: a, target: b });
    const edgeId = s().flowEdges[0].id;

    s().setArchitectureEdgeData(edgeId, { label: 'Mengirim order' });
    s().setArchitectureEdgeData(edgeId, { technology: 'HTTPS/JSON' });

    expect(s().flowEdges[0].data).toEqual({
      label: 'Mengirim order',
      technology: 'HTTPS/JSON',
    });
  });

  it('hapus node ikut menghapus relationship yang menyentuhnya', () => {
    const [a, b] = addPair();
    s().onConnect({ source: a, target: b });

    s().onNodesChange([{ id: a, type: 'remove' }]);

describe('editorStore Architecture — undo/redo', () => {
  it('satu snapshot per add, termasuk boundary', () => {
    seed(ARCH);
    s().addArchitectureNode(ARCH_NODE_TYPES.SYSTEM, { x: 0, y: 0 });
    s().addArchitectureNode(ARCH_NODE_TYPES.BOUNDARY, { x: 0, y: 0 });

    expect(s().historyPast).toHaveLength(2);

    s().undo();
    expect(s().nodes.map((n) => n.data.type)).toEqual(['system']);
    s().undo();
    expect(s().nodes).toEqual([]);

    s().redo();
    s().redo();
    expect(s().nodes.map((n) => n.data.type)).toEqual(['boundary', 'system']);
  });

  it('connect = satu snapshot; undo membuang relationship saja', () => {
    seed(ARCH);
    s().addArchitectureNode(ARCH_NODE_TYPES.PERSON, { x: 0, y: 0 });
    s().addArchitectureNode(ARCH_NODE_TYPES.SYSTEM, { x: 200, y: 0 });
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

  it('hapus node lewat change remove bisa di-undo', () => {
    seed(ARCH);
    s().addArchitectureNode(ARCH_NODE_TYPES.SYSTEM, { x: 0, y: 0 });
    const [id] = s().nodes.map((n) => n.id);

    s().onNodesChange([{ id, type: 'remove' }]);
    expect(s().nodes).toEqual([]);

    s().undo();
    expect(s().nodes.map((n) => n.id)).toEqual([id]);
  });
});

describe('editorStore Architecture — round-trip save/load', () => {
  afterEach(() => {
    delete globalThis.window;
  });

  it('nodes + edges (parent boundary, teknologi, label) identik setelah save → load', async () => {
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
    const FILE = 'store_architecture.json';

    seed(ARCH, { _vaultPath: VAULT, _projectId: PROJ, _filename: FILE });
    s().addArchitectureNode(ARCH_NODE_TYPES.BOUNDARY, { x: 0, y: 0 });
    s().addArchitectureNode(ARCH_NODE_TYPES.PERSON, { x: 40, y: 40 });
    s().addArchitectureNode(ARCH_NODE_TYPES.CONTAINER, { x: 240, y: 40 });
    s().addArchitectureNode(ARCH_NODE_TYPES.DATABASE, { x: 400, y: 40 });

    const [boundary, person, container, database] = s().nodes.map((n) => n.id);
    s().onConnect({ source: person, target: container, sourceHandle: 'right', targetHandle: 'left' });
    s().onConnect({ source: container, target: database });
    s().setArchitectureEdgeData(s().flowEdges[0].id, {
      label: 'Mengirim order',
      technology: 'HTTPS/JSON',
    });
    s().setArchitectureEdgeData(s().flowEdges[1].id, { technology: 'SQL' });
    s().updateNodeData(container, { label: 'Web App', technology: 'React' });
    s().updateNodeData(database, { technology: 'PostgreSQL' });
    s().updateNodeData(boundary, { label: 'Online Store' });

    await s().saveDiagram();
    const raw = JSON.parse([...files.values()][0]);

    expect(raw.meta.type).toBe('architecture');
    expect(raw.nodes).toHaveLength(4);
    expect(raw.edges).toHaveLength(2);
    expect(raw.tables).toEqual([]);
    expect(raw.relationships).toEqual([]);

    const before = { nodes: s().nodes, flowEdges: s().flowEdges };
    s().cleanup();
    await s().loadDiagram(VAULT, PROJ, FILE);

    expect({ nodes: s().nodes, flowEdges: s().flowEdges }).toEqual(before);
    expect(s().diagramMeta.type).toBe('architecture');
    expect(s().loadError).toBe(null);
  });
});


    expect(s().nodes.map((n) => n.id)).toEqual([b]);
    expect(s().flowEdges).toEqual([]);
  });
});
