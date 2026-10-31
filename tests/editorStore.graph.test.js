import { describe, it, expect, afterEach } from 'vitest';
import { USECASE_NODE_TYPES, USECASE_REL_TYPES } from '../src/config/useCaseTypes.js';
import { seed, restore, s, node } from './helpers.js';

const FLOW = { type: 'flowchart', name: 'Flow' };
const UC = { type: 'usecase', name: 'UC' };

afterEach(restore);

describe('editorStore Flowchart — addFlowNode', () => {
  // [subtype, label, width, height]
  it.each([
    ['terminal', 'Start', 160, 56],
    ['process', 'Process', 160, 64],
    ['decision', 'Decision', 160, 160],
    ['io', 'Input/Output', 160, 64],
    ['database', 'Database', 140, 80],
    ['document', 'Document', 160, 70],
    ['predefined', 'Sub-process', 160, 64],
    ['loop', 'Loop', 160, 64],
    ['connector', '', 40, 40],
    ['offpage', '1', 100, 80],
  ])(
    'subtype %s → label "%s", style %ix%i',
    (subtype, label, width, height) => {
      seed(FLOW);
      s().addFlowNode(subtype, { x: 5, y: 6 });

      const n = s().nodes[0];
      expect(n.id).toMatch(/^flow-\d+$/);
      expect(n.type).toBe('flowchart');
      expect(n.position).toEqual({ x: 5, y: 6 });
      expect(n.data).toEqual({ type: subtype, label });
      expect(n.style).toEqual({ width, height });
    },
  );

  it('annotation hanya punya width (tanpa height)', () => {
    seed(FLOW);
    s().addFlowNode('annotation', { x: 0, y: 0 });

    expect(s().nodes[0].style).toEqual({ width: 140 });
    expect(s().nodes[0].data.label).toBe('');
  });
});

describe('editorStore Flowchart — onConnect label Yes/No', () => {
  it('koneksi keluar pertama dari decision diberi label Yes, kedua No', () => {
    seed(FLOW);
    s().addFlowNode('decision', { x: 0, y: 0 });
    s().addFlowNode('process', { x: 200, y: 0 });
    s().addFlowNode('process', { x: 200, y: 200 });
    const [dec, a, b] = s().nodes.map((n) => n.id);

    s().onConnect({ source: dec, target: a });
    s().onConnect({ source: dec, target: b });

    expect(s().flowEdges.map((e) => e.label)).toEqual(['Yes', 'No']);
  });

  it('node non-decision menghasilkan label kosong', () => {
    seed(FLOW);
    s().addFlowNode('process', { x: 0, y: 0 });
    s().addFlowNode('terminal', { x: 200, y: 0 });
    const [from, to] = s().nodes.map((n) => n.id);

    s().onConnect({ source: from, target: to });

    const e = s().flowEdges[0];
    expect(e.label).toBe('');
    expect(e.type).toBe('smoothstep');
    expect(e.id).toMatch(/^e-/);
    expect(e.markerEnd).toEqual({ type: 'arrowclosed', color: '#a1a1aa' });
  });

  it('label Yes/No hanya menghitung edge dari node decision itu sendiri', () => {
    seed(FLOW);
    s().addFlowNode('decision', { x: 0, y: 0 });
    s().addFlowNode('process', { x: 200, y: 0 });
    s().addFlowNode('process', { x: 0, y: 200 });
    const [dec, a, b] = s().nodes.map((n) => n.id);

    s().onConnect({ source: a, target: b }); // edge non-decision
    s().onConnect({ source: dec, target: a });

    expect(s().flowEdges.map((e) => e.label)).toEqual(['', 'Yes']);
  });
});

describe('editorStore Flowchart — onNodesChange', () => {
  it('hapus node ikut menghapus flowEdge yang menyentuhnya', () => {
    seed(FLOW);
    s().addFlowNode('process', { x: 0, y: 0 });
    s().addFlowNode('process', { x: 200, y: 0 });
    const [a, b] = s().nodes.map((n) => n.id);
    s().onConnect({ source: a, target: b });
    expect(s().flowEdges).toHaveLength(1);

    s().onNodesChange([{ id: a, type: 'remove' }]);

    expect(s().nodes.map((n) => n.id)).toEqual([b]);
    expect(s().flowEdges).toEqual([]);
  });

  // Regresi: early-return U1 membuang change `select` sehingga node hasil
  // klik-lepas tak pernah selected dan Delete tak punya target.
  it('change select diterapkan ke state tanpa menyentuh history/dirty', () => {
    seed(FLOW, { nodes: [node('n1', 'process')] });

    s().onNodesChange([{ id: 'n1', type: 'select', selected: true }]);

    expect(s().nodes[0].selected).toBe(true);
    expect(s().historyPast).toEqual([]);
    expect(s().isDirty).toBe(false);

    s().onNodesChange([{ id: 'n1', type: 'select', selected: false }]);
    expect(s().nodes[0].selected).toBe(false);
  });
});

describe('editorStore Use Case', () => {
  it('addUseCaseNode memakai ukuran + label default per subtype', () => {
    seed(UC);
    s().addUseCaseNode(USECASE_NODE_TYPES.ACTOR, { x: 1, y: 2 });

    const n = s().nodes[0];
    expect(n.id).toMatch(/^uc-\d+-\d+$/);
    expect(n.type).toBe('usecase');
    expect(n.position).toEqual({ x: 1, y: 2 });
    expect(n.data).toEqual({ type: USECASE_NODE_TYPES.ACTOR, label: 'Actor' });
    expect(n.style).toEqual({ width: 80, height: 130 });
  });

  it('systemBoundary ditaruh di layer paling belakang (indeks 0)', () => {
    seed(UC);
    s().addUseCaseNode(USECASE_NODE_TYPES.ACTOR, { x: 0, y: 0 });
    s().addUseCaseNode(USECASE_NODE_TYPES.SYSTEM_BOUNDARY, { x: 0, y: 0 });

    expect(s().nodes.map((n) => n.data.type)).toEqual([
      USECASE_NODE_TYPES.SYSTEM_BOUNDARY,
      USECASE_NODE_TYPES.ACTOR,
    ]);
  });

  it('onConnect memakai type usecase + relType aktif', () => {
    seed(UC);
    s().addUseCaseNode(USECASE_NODE_TYPES.ACTOR, { x: 0, y: 0 });
    s().addUseCaseNode(USECASE_NODE_TYPES.USE_CASE, { x: 200, y: 0 });
    const [a, b] = s().nodes.map((n) => n.id);

    s().onConnect({ source: a, target: b });
    expect(s().flowEdges[0]).toMatchObject({
      type: 'usecase',
      data: { relType: USECASE_REL_TYPES.ASSOCIATION },
    });

    s().setUseCaseRelType(USECASE_REL_TYPES.INCLUDE);
    s().onConnect({ source: b, target: a });
    expect(s().flowEdges[1].data).toEqual({
      relType: USECASE_REL_TYPES.INCLUDE,
    });
    expect(s().flowEdges[1].id).toMatch(/^uce-/);
  });

  it('replaceUseCaseGraph mengganti nodes + edges', () => {
    seed(UC);
    s().addUseCaseNode(USECASE_NODE_TYPES.ACTOR, { x: 0, y: 0 });
    const canvas = { x: 5, y: 5, zoom: 1.5 };

    s().replaceUseCaseGraph({
      nodes: [{ id: 'n1', type: 'usecase', position: { x: 0, y: 0 }, data: {} }],
      edges: [{ id: 'e1', source: 'n1', target: 'n1' }],
      canvasState: canvas,
    });

    expect(s().nodes.map((n) => n.id)).toEqual(['n1']);
    expect(s().flowEdges.map((e) => e.id)).toEqual(['e1']);
    expect(s().canvasState).toEqual(canvas);
  });
});
