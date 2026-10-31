import { describe, it, expect } from 'vitest';
import { validateArchitecture } from '../src/utils/architectureValidation.js';
import { ARCH_NODE_TYPES } from '../src/config/architectureTypes.js';

const n = (id, type, extra = {}) => ({
  id,
  type: 'architecture',
  position: { x: 0, y: 0 },
  data: { type, label: id, ...extra },
});
const e = (id, source, target) => ({ id, source, target, type: 'architecture' });

describe('validateArchitecture', () => {
  it('diagram valid tidak menghasilkan peringatan', () => {
    const nodes = [
      n('u', ARCH_NODE_TYPES.PERSON),
      n('s', ARCH_NODE_TYPES.SYSTEM),
      n('c', ARCH_NODE_TYPES.CONTAINER, { technology: 'React' }),
      n('d', ARCH_NODE_TYPES.DATABASE, { technology: 'PostgreSQL' }),
    ];
    const edges = [e('e1', 'u', 's'), e('e2', 's', 'c'), e('e3', 'c', 'd')];

    expect(validateArchitecture(nodes, edges)).toEqual({ nodeWarnings: {} });
  });

  it('node tanpa relasi sama sekali → peringatan', () => {
    const nodes = [n('u', ARCH_NODE_TYPES.PERSON), n('s', ARCH_NODE_TYPES.SYSTEM)];
    const { nodeWarnings } = validateArchitecture(nodes, [e('e1', 'u', 's'), e('e2', 'u', 's')]);

    expect(nodeWarnings).toEqual({});
    expect(validateArchitecture([...nodes, n('x', ARCH_NODE_TYPES.SYSTEM)], []).nodeWarnings.x).toMatch(
      /Architecture: x has no relationships/,
    );
  });

  it('container tanpa teknologi → peringatan', () => {
    const nodes = [n('s', ARCH_NODE_TYPES.SYSTEM), n('c', ARCH_NODE_TYPES.CONTAINER)];
    const { nodeWarnings } = validateArchitecture(nodes, [e('e1', 's', 'c')]);

    expect(nodeWarnings.c).toMatch(/Architecture: c has no technology/);
    expect(nodeWarnings.s).toBeUndefined();
  });

  it('teknologi berisi spasi saja dianggap kosong', () => {
    const nodes = [n('s', ARCH_NODE_TYPES.SYSTEM), n('d', ARCH_NODE_TYPES.DATABASE, { technology: '   ' })];
    const { nodeWarnings } = validateArchitecture(nodes, [e('e1', 's', 'd')]);

    expect(nodeWarnings.d).toMatch(/no technology/);
  });

  it('person dengan relasi masuk → peringatan', () => {
    const nodes = [n('u', ARCH_NODE_TYPES.PERSON), n('s', ARCH_NODE_TYPES.SYSTEM)];
    const { nodeWarnings } = validateArchitecture(nodes, [e('e1', 's', 'u')]);

    expect(nodeWarnings.u).toMatch(/Architecture: u should not receive relationships/);
    expect(nodeWarnings.s).toBeUndefined();
  });

  it('person hanya mengeluarkan relasi → tidak diperingatkan', () => {
    const nodes = [n('u', ARCH_NODE_TYPES.PERSON), n('s', ARCH_NODE_TYPES.SYSTEM)];
    const { nodeWarnings } = validateArchitecture(nodes, [e('e1', 'u', 's')]);

    expect(nodeWarnings).toEqual({});
  });

  it('person dengan dua relasi keluar (contoh toko online) → tidak diperingatkan', () => {
    const nodes = [
      n('Person', ARCH_NODE_TYPES.PERSON),
      n('web', ARCH_NODE_TYPES.CONTAINER, { technology: 'React' }),
      n('api', ARCH_NODE_TYPES.CONTAINER, { technology: 'Node.js' }),
    ];
    const edges = [e('e1', 'Person', 'web'), e('e2', 'Person', 'api')];

    expect(validateArchitecture(nodes, edges).nodeWarnings).toEqual({});
  });

  it('container berteknologi + relasi (contoh "api") → tidak diperingatkan', () => {
    const nodes = [
      n('web', ARCH_NODE_TYPES.CONTAINER, { technology: 'React' }),
      n('api', ARCH_NODE_TYPES.CONTAINER, { technology: 'Node.js' }),
      n('db', ARCH_NODE_TYPES.DATABASE, { technology: 'PostgreSQL' }),
    ];
    const edges = [e('e1', 'web', 'api'), e('e2', 'api', 'db')];

    expect(validateArchitecture(nodes, edges).nodeWarnings).toEqual({});
  });

  it('container berteknologi tanpa relasi tetap dicek relasinya (bukan teknologi)', () => {
    const nodes = [n('c', ARCH_NODE_TYPES.CONTAINER, { technology: 'React' })];

    expect(validateArchitecture(nodes, []).nodeWarnings.c).toMatch(/has no relationships/);
  });

  it('boundary tidak pernah diperingatkan (pengelompok, bukan partisipan)', () => {
    const nodes = [n('b', ARCH_NODE_TYPES.BOUNDARY)];
    const { nodeWarnings } = validateArchitecture(nodes, []);

    expect(nodeWarnings).toEqual({});
  });

  it('semua pesan berprefix "Architecture:" (dipakai filter exportImage)', () => {
    const nodes = [
      n('u', ARCH_NODE_TYPES.PERSON),
      n('s', ARCH_NODE_TYPES.SYSTEM),
      n('c', ARCH_NODE_TYPES.CONTAINER),
      n('d', ARCH_NODE_TYPES.DATABASE),
    ];
    const { nodeWarnings } = validateArchitecture(nodes, [e('e1', 's', 'u')]);

    expect(Object.keys(nodeWarnings).length).toBeGreaterThan(0);
    for (const msg of Object.values(nodeWarnings)) {
      expect(msg.startsWith('Architecture:')).toBe(true);
    }
  });
});
