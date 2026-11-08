import { describe, it, expect } from 'vitest';
import { pushGrownNeighbors } from '../src/utils/apiLayout';

const n = (id, x, y) => ({ id, position: { x, y } });

describe('pushGrownNeighbors', () => {
  const nodes = [
    n('a', 0, 0),
    n('b', 300, 0),
    n('c', 0, 150),
    n('d', -100, 0),
    n('e', 500, 300),
  ];
  const edges = [
    { source: 'a', target: 'b' },
    { source: 'a', target: 'c' },
    { source: 'a', target: 'd' },
    { source: 'a', target: 'e' },
  ];

  it('mendorong tetangga kanan/bawah saat node membesar', () => {
    const result = pushGrownNeighbors(nodes, edges, 'a', 400, 220);
    const byId = Object.fromEntries(result.map((x) => [x.id, x]));
    expect(byId.b.position.x).toBe(400 + 48);
    expect(byId.c.position.y).toBe(220 + 24);
  });

  it('tidak menyentuh tetangga kiri/atas atau node yang sudah jauh', () => {
    const result = pushGrownNeighbors(nodes, edges, 'a', 400, 220);
    const byId = Object.fromEntries(result.map((x) => [x.id, x]));
    expect(byId.d.position).toEqual({ x: -100, y: 0 });
    expect(byId.e.position).toEqual({ x: 500, y: 300 });
  });

  it('mengembalikan null jika tidak ada yang berubah', () => {
    const far = [n('a', 0, 0), n('b', 1000, 1000)];
    const e2 = [{ source: 'a', target: 'b' }];
    expect(pushGrownNeighbors(far, e2, 'a', 400, 220)).toBeNull();
  });
});
