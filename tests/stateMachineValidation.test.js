import { describe, it, expect } from 'vitest';
import { validateStateMachine } from '../src/utils/stateMachineValidation.js';
import { SM_NODE_TYPES } from '../src/config/stateMachineTypes.js';

const n = (id, type) => ({ id, type: 'statemachine', position: { x: 0, y: 0 }, data: { type } });
const e = (id, source, target) => ({ id, source, target, type: 'statemachine', data: { label: '' } });

describe('validateStateMachine', () => {
  it('diagram valid tidak menghasilkan peringatan', () => {
    const nodes = [
      n('i', SM_NODE_TYPES.INITIAL),
      n('s', SM_NODE_TYPES.STATE),
      n('f', SM_NODE_TYPES.FINAL),
    ];
    const edges = [e('e1', 'i', 's'), e('e2', 's', 'f')];

    expect(validateStateMachine(nodes, edges)).toEqual({
      nodeWarnings: {},
      edgeWarnings: {},
    });
  });

  it('lebih dari satu initial → peringatan di setiap initial', () => {
    const nodes = [n('i1', SM_NODE_TYPES.INITIAL), n('i2', SM_NODE_TYPES.INITIAL)];
    const { nodeWarnings } = validateStateMachine(nodes, []);

    expect(nodeWarnings.i1).toMatch(/more than one initial/);
    expect(nodeWarnings.i2).toMatch(/more than one initial/);
    expect(Object.keys(nodeWarnings)).toEqual(['i1', 'i2']);
  });

  it('satu initial tidak diperingatkan', () => {
    const nodes = [n('i1', SM_NODE_TYPES.INITIAL), n('i2', SM_NODE_TYPES.INITIAL)];
    // Kontrol: dengan hanya satu initial, tidak ada peringatan initial.
    const { nodeWarnings } = validateStateMachine([nodes[0], n('s', SM_NODE_TYPES.STATE)], [
      e('e1', 'i1', 's'),
    ]);
    expect(nodeWarnings.i1).toBeUndefined();
  });

  it('state tanpa transisi masuk/keluar → peringatan', () => {
    const nodes = [n('s1', SM_NODE_TYPES.STATE), n('s2', SM_NODE_TYPES.STATE)];
    const { nodeWarnings } = validateStateMachine(nodes, [e('e1', 's1', 's2')]);

    expect(nodeWarnings.s1).toBeUndefined();
    expect(nodeWarnings.s2).toBeUndefined();

    const orphan = validateStateMachine([...nodes, n('s3', SM_NODE_TYPES.STATE)].map((x) => x), [
      e('e1', 's1', 's2'),
    ]);
    // s3 hanya punya satu sisi (tidak ada) → diperingatkan
    expect(orphan.nodeWarnings.s3).toMatch(/no incoming or outgoing/);
  });

  it('self-transition dianggap transisi masuk dan keluar', () => {
    const nodes = [n('s', SM_NODE_TYPES.STATE)];
    const { nodeWarnings } = validateStateMachine(nodes, [e('e1', 's', 's')]);

    expect(nodeWarnings.s).toBeUndefined();
  });

  it('final dengan transisi keluar → peringatan node + edge', () => {
    const nodes = [n('s', SM_NODE_TYPES.STATE), n('f', SM_NODE_TYPES.FINAL)];
    const edges = [e('e1', 's', 'f'), e('e2', 'f', 's')];
    const { nodeWarnings, edgeWarnings } = validateStateMachine(nodes, edges);

    expect(nodeWarnings.f).toMatch(/Final state cannot have outgoing/);
    expect(edgeWarnings.e2).toMatch(/leaves a final state/);
    expect(edgeWarnings.e1).toBeUndefined();
  });

  it('initial/choice tidak ikut aturan state (boleh tanpa transisi tanpa peringatan)', () => {
    const nodes = [n('i', SM_NODE_TYPES.INITIAL), n('c', SM_NODE_TYPES.CHOICE)];
    const { nodeWarnings } = validateStateMachine(nodes, []);

    expect(nodeWarnings).toEqual({});
  });
});
