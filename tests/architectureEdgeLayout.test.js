import { describe, it, expect } from 'vitest';
import {
  pairGroupKey,
  parallelOffsets,
  archEdgePath,
  hasArchEdgeContent,
  shouldRenderArchEdgeLabel,
  isArchEdgePlaceholder,
  ARCH_SLOT_STEP,
  ARCH_MIN_STUB,
  ARCH_MAX_STUB,
  ARCH_HANDLE_INSET,
  ARCH_BOUNDARY_Z,
  ARCH_EDGE_Z,
} from '../src/utils/architectureEdgeLayout.js';
const e = (id, source, target, sourceHandle = 'right', targetHandle = 'left') => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: 'architecture',
});

// Handle sesuai posisi kotak: A kanan, B kiri (A di kiri B).
const forward = {
  sourceX: 100,
  sourceY: 50,
  sourcePosition: 'right',
  targetX: 300,
  targetY: 50,
  targetPosition: 'left',
};
const backward = {
  sourceX: 300,
  sourceY: 50,
  sourcePosition: 'left',
  targetX: 100,
  targetY: 50,
  targetPosition: 'right',
};

/** Dua titik kontrol kubik dari string path: [c1x, c1y, c2x, c2y]. */
const controlsOf = (path) => path.split(' C ')[1].split(' ').map(Number);

describe('pairGroupKey — grup tak berarah', () => {
  it('A→B dan B→A satu grup', () => {
    expect(pairGroupKey(e('a', 'A', 'B'))).toBe(pairGroupKey(e('b', 'B', 'A', 'left', 'right')));
  });

  it('pasangan handle berbeda tetap terpisah', () => {
    expect(pairGroupKey(e('a', 'A', 'B', 'right', 'left'))).not.toBe(
      pairGroupKey(e('b', 'A', 'B', 'bottom', 'top')),
    );
  });

  it('pasangan node berbeda terpisah', () => {
    expect(pairGroupKey(e('a', 'A', 'B'))).not.toBe(pairGroupKey(e('b', 'A', 'C')));
  });
});

describe('parallelOffsets', () => {
  it('edge tunggal → offset 0 (kurva bezier biasa)', () => {
    expect(parallelOffsets([e('a', 'A', 'B')]).get('a')).toBe(0);
  });

  it('dua edge searah → simetris terhadap 0', () => {
    const offsets = parallelOffsets([e('a', 'A', 'B'), e('b', 'A', 'B')]);

    expect(offsets.get('a')).toBe(-ARCH_SLOT_STEP / 2);
    expect(offsets.get('b')).toBe(ARCH_SLOT_STEP / 2);
  });

  it('A→B dan B→A (dua arah) → jalur fisik terpisah', () => {
    const edges = [e('a', 'A', 'B'), e('b', 'B', 'A', 'left', 'right')];
    const offsets = parallelOffsets(edges);
    const pa = archEdgePath({ ...forward, offset: offsets.get('a') });
    const pb = archEdgePath({ ...backward, offset: offsets.get('b') });

    // Normal kedua sisi berlawanan; tanpa koreksi tanda kedua kurva menumpuk.
    expect(pa.path).not.toBe(pb.path);
    expect(pa.labelY).not.toBe(pb.labelY);
    expect(Math.abs(pa.labelY - pb.labelY)).toBeGreaterThan(ARCH_SLOT_STEP / 2);
  });

  it('pasangan node berbeda tidak saling menggeser', () => {
    const offsets = parallelOffsets([
      e('a', 'A', 'B'),
      e('b', 'A', 'B'),
      e('c', 'A', 'C'),
    ]);

    expect(offsets.get('c')).toBe(0);
    expect(offsets.get('a')).toBe(-ARCH_SLOT_STEP / 2);
  });

  it('deterministik terhadap urutan array', () => {
    const edges = [e('a', 'A', 'B'), e('b', 'A', 'B'), e('c', 'A', 'B')];
    const first = parallelOffsets(edges);
    const second = parallelOffsets([...edges].reverse());

    for (const edge of edges) {
      expect(second.get(edge.id)).toBe(first.get(edge.id));
    }
    // Tiga edge: -step, 0, +step.
    expect([first.get('a'), first.get('b'), first.get('c')]).toEqual([
      -ARCH_SLOT_STEP,
      0,
      ARCH_SLOT_STEP,
    ]);
  });
});

describe('archEdgePath', () => {
  it('mulai & berakhir di tepi bentuk (handle ditarik masuk ARCH_HANDLE_INSET)', () => {
    const { path } = archEdgePath(forward);
    // source kanan → titik masuk = sourceX - inset; target kiri → targetX + inset.
    const sx = forward.sourceX - ARCH_HANDLE_INSET;
    const tx = forward.targetX + ARCH_HANDLE_INSET;

    expect(path.startsWith(`M ${sx} ${forward.sourceY} C `)).toBe(true);
    expect(path.endsWith(`${tx} ${forward.targetY}`)).toBe(true);
  });

  it('offset 0 → keluar tegak lurus dari sisi handle', () => {
    const [c1x, c1y] = controlsOf(archEdgePath(forward).path);

    // Sisi kanan: tidak ada komponen vertikal, hanya menjauh di sumbu x.
    expect(c1y).toBe(forward.sourceY);
    expect(c1x).toBeGreaterThan(forward.sourceX - ARCH_HANDLE_INSET);
  });

  it('label di titik kubik t=0.5 (sama dengan getBezierEdgeCenter)', () => {
    const [c1x, c1y, c2x, c2y] = controlsOf(archEdgePath(forward).path);
    const { labelX, labelY } = archEdgePath(forward);
    const sx = forward.sourceX - ARCH_HANDLE_INSET;
    const tx = forward.targetX + ARCH_HANDLE_INSET;

    expect(labelX).toBe((sx + 3 * c1x + 3 * c2x + tx) / 8);
    expect(labelY).toBe((forward.sourceY + 3 * c1y + 3 * c2y + forward.targetY) / 8);
  });

  it('offset menggeser kurva & label, bukan ujungnya', () => {
    const plain = archEdgePath(forward);
    const shifted = archEdgePath({ ...forward, offset: 24 });

    // Kedua titik kontrol bergeser penuh, jadi titik tengah (bobot 3/8 + 3/8)
    // hanya bergeser 0,75 × offset — cukup memisahkan dua edge paralel.
    expect(shifted.path).not.toBe(plain.path);
    expect(shifted.labelY).toBeCloseTo(plain.labelY + 24 * 0.75);
    expect(shifted.labelX).toBe(plain.labelX);
  });

  it('stub: minimum untuk jarak dekat, maksimum untuk jarak jauh', () => {
    const sx = forward.sourceX - ARCH_HANDLE_INSET;
    const near = archEdgePath({ ...forward, targetX: 120 }); // 32 px
    const far = archEdgePath({ ...forward, targetX: 1000 }); // 912 px

    expect(controlsOf(near.path)[0]).toBe(sx + ARCH_MIN_STUB);
    expect(controlsOf(far.path)[0]).toBe(sx + ARCH_MAX_STUB);
  });
});

describe('konstanta layer', () => {
  it('boundary paling belakang, edge di atas node', () => {
    expect(ARCH_BOUNDARY_Z).toBeLessThan(0);
    expect(ARCH_EDGE_Z).toBeGreaterThan(0);
  });
});

describe('label & placeholder', () => {
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
});
