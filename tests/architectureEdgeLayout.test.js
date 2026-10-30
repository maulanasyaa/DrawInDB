import { describe, it, expect } from 'vitest';
import {
  corridorOf,
  corridorSlots,
  slotOffset,
  pathPoints,
  archEdgePath,
  geometryOf,
  parallelKey,
  hasArchEdgeContent,
  shouldRenderArchEdgeLabel,
  isArchEdgePlaceholder,
  ARCH_PATH_OFFSET,
  ARCH_CORRIDOR_STEP,
  ARCH_BOUNDARY_Z,
  ARCH_EDGE_Z,
} from '../src/utils/architectureEdgeLayout.js';

const node = (id, x, y, w, h, subtype = 'container') => ({
  id,
  type: 'architecture',
  position: { x, y },
  width: w,
  height: h,
  data: { type: subtype, label: id },
});

const e = (id, source, target, sourceHandle = 'right', targetHandle = 'left') => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: 'architecture',
});

const geomOf = (nodes) => (edge) => geometryOf(edge, nodes);

describe('corridorOf — formula sama dengan getPoints React Flow v11', () => {
  it('kanan→kiri: koridor vertikal di tengah', () => {
    expect(
      corridorOf({
        sourceX: 120,
        sourceY: 75,
        targetX: 300,
        targetY: 60,
        sourcePosition: 'right',
        targetPosition: 'left',
      }),
    ).toEqual({ axis: 'v', value: 210 });
  });

  it('bawah→atas: koridor horizontal di tengah', () => {
    expect(
      corridorOf({
        sourceX: 400,
        sourceY: 240,
        targetX: 400,
        targetY: 300,
        sourcePosition: 'bottom',
        targetPosition: 'top',
      }),
    ).toEqual({ axis: 'h', value: 270 });
  });

  it('handle sejenis (kanan→kanan): koridor horizontal di antara y', () => {
    expect(
      corridorOf({
        sourceX: 100,
        sourceY: 50,
        targetX: 100,
        targetY: 200,
        sourcePosition: 'right',
        targetPosition: 'right',
      }),
    ).toEqual({ axis: 'h', value: 125 });
  });
});


describe('corridorSlots — edge dengan koridor bertumpuk dipisah', () => {
  // Contoh "toko online": person di kiri, web & api satu kolom, orders db di
  // bawah keduanya.
  const nodes = [
    node('person', 0, 0, 120, 150, 'person'),
    node('web', 300, 0, 220, 120),
    node('api', 300, 180, 220, 120),
    node('db', 380, 360, 180, 110, 'database'),
  ];
  const edges = [
    e('e1', 'person', 'web'),
    e('e2', 'person', 'api'),
    e('e3', 'web', 'db', 'bottom', 'top'),
    e('e4', 'api', 'db', 'bottom', 'top'),
  ];

  it('empat edge → empat jalur berbeda', () => {
    const slots = corridorSlots(edges, geomOf(nodes));
    const paths = edges.map(
      (edge) => archEdgePath(geometryOf(edge, nodes), slots.get(edge.id)).path,
    );

    expect(new Set(paths).size).toBe(4);
  });

  it('dua edge dari person (satu handle) → jalur berbeda & slot berurutan', () => {
    const slots = corridorSlots(edges, geomOf(nodes));
    const a = slots.get('e1');
    const b = slots.get('e2');
    const pa = archEdgePath(geometryOf(edges[0], nodes), a).path;
    const pb = archEdgePath(geometryOf(edges[1], nodes), b).path;

    expect(pa).not.toBe(pb);
  });

  it('web→db dan api→db tidak lagi berbagi koridor horizontal', () => {
    const slots = corridorSlots(edges, geomOf(nodes));

    expect(slots.get('e3').value).not.toBe(slots.get('e4').value);
  });

  it('edge tunggal tetap di tengah (slot 0)', () => {
    const slots = corridorSlots([edges[0]], geomOf(nodes));

    expect(slots.get('e1').slot).toBe(0);
    expect(slots.get('e1').value).toBe(corridorOf(geometryOf(edges[0], nodes)).value);
  });

  it('urutan slot stabil saat file dibuka ulang (urutan edges sama)', () => {
    const forward = corridorSlots(edges, geomOf(nodes));
    const again = corridorSlots(edges, geomOf(nodes));

    expect([...forward.entries()]).toEqual([...again.entries()]);
  });

  it('node tanpa ukuran → geometri null, edge diskip', () => {
    expect(geometryOf(e('x', 'a', 'b'), [])).toBe(null);
    expect(corridorSlots([], geomOf(nodes)).size).toBe(0);
  });
});

describe('geometryOf + pathPoints — panah menyentuh tepi bentuk', () => {
  const db = node('db', 380, 360, 180, 110, 'database');
  const web = node('web', 300, 0, 220, 120);

  it('handle top database di puncak silinder, bukan tepi kotak tengah', () => {
    const g = geometryOf(e('e', 'web', 'db', 'bottom', 'top'), [web, db]);

    expect(g.targetX).toBe(380 + 0.25 * 180);
    expect(g.targetY).toBe(360);
    expect(g.targetPosition).toBe('top');
  });

  it('handle left/right database di dinding silinder atas', () => {
    const left = geometryOf(e('e', 'web', 'db', 'right', 'left'), [web, db]);
    const right = geometryOf(e('e', 'db', 'web', 'right', 'left'), [web, db]);

    expect(left.targetX).toBe(380 + 0.1667 * 180);
    expect(left.targetY).toBeCloseTo(360 + 110 * 0.08);
    expect(right.sourceX).toBe(380 + 0.8333 * 180);
    expect(right.sourceY).toBeCloseTo(360 + 110 * 0.08);
  });

  it('handle bottom database di dasar silinder, bukan tepi kotak', () => {
    const g = geometryOf(e('e', 'db', 'web', 'bottom', 'top'), [web, db]);

    expect(g.sourceX).toBe(380 + 0.75 * 180);
    expect(g.sourceY).toBeCloseTo(360 + 110 * 0.52);
    expect(g.sourceY).not.toBe(470);
  });

  it('subtype tanpa anchor khusus memakai tengah tepi kotak', () => {
    const g = geometryOf(e('e', 'web', 'db', 'right', 'left'), [web, db]);

    // Container tidak punya entri anchor → tepi kanan kotak, tengah tinggi.
    expect(g.sourceX).toBe(520);
    expect(g.sourceY).toBe(60);
    // Database memakai dinding silinder (16.67% leb... bukan tepi kotak).
    expect(g.targetX).toBeCloseTo(410, 1);
  });

  it('path mulai & berakhir di titik handle', () => {
    const g = geometryOf(e('e', 'web', 'db', 'bottom', 'top'), [web, db]);
    const points = pathPoints(g, { axis: 'h', value: 300, slot: 1 });

    expect(points[0]).toEqual({ x: g.sourceX, y: g.sourceY });
    expect(points[points.length - 1]).toEqual({ x: g.targetX, y: g.targetY });
  });

  it('path tanpa slot juga ortogonal (tidak ada segmen diagonal)', () => {
    const g = geometryOf(e('e', 'web', 'db', 'bottom', 'top'), [web, db]);
    const points = pathPoints(g, undefined);
    const orthogonal = points.every(
      (p, i) => i === 0 || p.x === points[i - 1].x || p.y === points[i - 1].y,
    );

    // db.top ada di x 25% (455) sedangkan web.bottom di x 410 → butuh dua
    // belokan; yang penting tidak ada garis miring.
    expect(orthogonal).toBe(true);
  });

  it('archEdgePath mengembalikan path ortogonal + angka label', () => {
    const g = geometryOf(e('e', 'web', 'db', 'bottom', 'top'), [web, db]);
    const { path, labelX, labelY } = archEdgePath(g, { axis: 'h', value: 300, slot: 1 });
    const points = pathPoints(g, { axis: 'h', value: 300, slot: 1 });
    const orthogonal = points.every(
      (p, i) => i === 0 || p.x === points[i - 1].x || p.y === points[i - 1].y,
    );

    expect(path.startsWith('M ')).toBe(true);
    expect(orthogonal).toBe(true);
    expect([labelX, labelY].every((n) => typeof n === 'number')).toBe(true);
  });
});

describe('konstanta layer', () => {
  it('boundary paling belakang, edge di atas node', () => {
    expect(ARCH_BOUNDARY_Z).toBeLessThan(0);
    expect(ARCH_EDGE_Z).toBeGreaterThan(0);
    expect(ARCH_PATH_OFFSET).toBe(20);
  });
});

describe('architectureEdgeLayout — label & placeholder', () => {
  it('konten = label atau teknologi (trim)', () => {
    expect(hasArchEdgeContent({ label: 'Makes order' })).toBe(true);
    expect(hasArchEdgeContent({ technology: 'HTTPS' })).toBe(true);
    expect(hasArchEdgeContent({ label: '   ', technology: '' })).toBe(false);
    expect(hasArchEdgeContent(undefined)).toBe(false);
  });

  it('edge kosong tidak dipilih → placeholder tidak dirender', () => {
    expect(
      shouldRenderArchEdgeLabel({ data: { label: '', technology: '' }, selected: false }),
    ).toBe(false);
    expect(
      isArchEdgePlaceholder({ data: { label: '', technology: '' }, editing: false }),
    ).toBe(true);
  });

  it('edge kosong dipilih → placeholder dirender & ditandai', () => {
    const data = { label: '', technology: '' };
    expect(shouldRenderArchEdgeLabel({ data, selected: true })).toBe(true);
    expect(isArchEdgePlaceholder({ data, editing: false })).toBe(true);
  });

  it('edge berisi → label dirender, bukan placeholder', () => {
    const data = { label: 'Makes order', technology: 'HTTPS/JSON' };
    expect(shouldRenderArchEdgeLabel({ data, selected: false })).toBe(true);
    expect(isArchEdgePlaceholder({ data, editing: false })).toBe(false);
  });

  it('sedang edit → bukan placeholder (input, bukan teks placeholder)', () => {
    const data = { label: '', technology: '' };
    expect(shouldRenderArchEdgeLabel({ data, selected: false, editing: true })).toBe(true);
    expect(isArchEdgePlaceholder({ data, editing: true })).toBe(false);
  });

  it('parallelKey membedakan handle', () => {
    expect(parallelKey(e('a', 'p', 'w', 'right', 'left'))).not.toBe(
      parallelKey(e('b', 'p', 'w', 'bottom', 'top')),
    );
  });
});

describe('slotOffset — urutan slot 0, +1, -1, +2, -2', () => {
  it('berurutan tanpa angka pencilan', () => {
    expect([0, 1, 2, 3, 4, 5].map(slotOffset)).toEqual([0, 1, -1, 2, -2, 3]);
  });
});
