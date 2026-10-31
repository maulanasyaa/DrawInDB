import { describe, it, expect } from 'vitest';
import {
  normalizeSequence,
  emptySequence,
  estimateTextWidth,
  layoutSequence,
  pickMessageEndpoints,
  validateSequence,
} from '../src/utils/sequence.js';
import { SQ_LAYOUT } from '../src/config/sequenceTypes.js';

const P = (id, name, kind = 'participant') => ({ id, name, kind });
const M = (id, from, to, label = '', kind = 'sync') => ({ id, from, to, label, kind });

describe('normalizeSequence', () => {
  it('mengembalikan bentuk kosong untuk input kosong/undefined', () => {
    expect(normalizeSequence()).toEqual({
      participants: [],
      messages: [],
      options: { showNumbers: false },
    });
    expect(emptySequence()).toEqual(normalizeSequence({}));
  });

  it('tahan file rusak: field hilang, enum asing, entri non-objek', () => {
    const out = normalizeSequence({
      participants: [null, 'x', { id: 'p1', name: 'A', kind: 'nope' }, { name: 'B' }],
      messages: [{ from: 'p1' }, 42, { id: 'm9', from: 'p1', to: 'p-1', kind: 'bogus' }],
      options: 'rusak',
    });

    expect(out.participants).toEqual([
      { id: 'p1', name: 'A', kind: 'participant' },
      { id: 'p-1', name: 'B', kind: 'participant' },
    ]);
    expect(out.messages).toEqual([
      { id: 'm-0', from: 'p1', to: '', label: '', kind: 'sync' },
      { id: 'm9', from: 'p1', to: 'p-1', label: '', kind: 'sync' },
    ]);
    expect(out.options).toEqual({ showNumbers: false });
  });

  it('idempotent', () => {
    const once = normalizeSequence({ participants: [P('a', 'A')], messages: [M('m', 'a', 'a')] });
    expect(normalizeSequence(once)).toEqual(once);
  });

  it('opsi showNumbers hanya true bila benar-benar boolean true', () => {
    expect(normalizeSequence({ options: { showNumbers: true } }).options.showNumbers).toBe(true);
    expect(normalizeSequence({ options: { showNumbers: 'yes' } }).options.showNumbers).toBe(false);
  });

  it('pesan yang merujuk peserta hilang TIDAK dibuang (nomor urut stabil)', () => {
    const out = normalizeSequence({
      participants: [P('a', 'A')],
      messages: [M('m1', 'a', 'ghost'), M('m2', 'a', 'a')],
    });
    expect(out.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
  });
});

describe('estimateTextWidth', () => {
  it('naik monoton terhadap panjang teks, CJK lebih lebar', () => {
    expect(estimateTextWidth('abcd')).toBeGreaterThan(estimateTextWidth('ab'));
    expect(estimateTextWidth('名前')).toBeGreaterThan(estimateTextWidth('ab'));
  });
});

describe('layoutSequence', () => {
  it('0 peserta → layout valid tanpa NaN', () => {
    const l = layoutSequence({});
    expect(l.participants).toEqual([]);
    expect(l.messages).toEqual([]);
    expect(l.width).toBe(SQ_LAYOUT.MIN_WIDTH);
    expect(Number.isFinite(l.width) && Number.isFinite(l.height)).toBe(true);
  });

  it('1 peserta → satu kolom, pesan self', () => {
    const l = layoutSequence({
      participants: [P('a', 'A')],
      messages: [M('m1', 'a', 'a')],
    });
    expect(l.participants).toHaveLength(1);
    expect(l.messages[0].self).toBe(true);
    expect(l.messages[0].x2).toBeGreaterThan(l.messages[0].x1);
  });

  it('kolom berjarak sama dan urut sesuai registry peserta', () => {
    const l = layoutSequence({
      participants: [P('a', 'Actor Actor'), P('b', 'Db', 'database'), P('c', 'Ext', 'external')],
      messages: [M('m1', 'a', 'b'), M('m2', 'b', 'c')],
    });
    const [x0, x1, x2] = l.participants.map((p) => p.x);
    expect(x1 - x0).toBeCloseTo(x2 - x1, 6);
    expect(l.participants.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(Math.abs(l.pitch - (x1 - x0))).toBeLessThan(1e-6);
  });

  it('lebar kolom menyesuaikan nama terpanjang', () => {
    const short = layoutSequence({ participants: [P('a', 'A'), P('b', 'B')] });
    const long = layoutSequence({ participants: [P('a', 'A'), P('b', 'Nama Peserta Yang Panjang')] });
    expect(long.boxWidth).toBeGreaterThan(short.boxWidth);
    expect(long.pitch).toBeGreaterThan(short.pitch);
  });

  it('baris pesan berurutan dengan tinggi tetap', () => {
    const l = layoutSequence({
      participants: [P('a', 'A'), P('b', 'B')],
      messages: [M('m1', 'a', 'b', 'satu'), M('m2', 'b', 'a', 'dua'), M('m3', 'a', 'b', 'tiga')],
    });
    expect(l.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(l.messages.map((m) => m.index)).toEqual([0, 1, 2]);
    const dy = l.messages[1].y - l.messages[0].y;
    expect(dy).toBe(SQ_LAYOUT.ROW_H);
    expect(l.messages[2].y - l.messages[1].y).toBe(dy);
  });

  it('self-message digambar sebagai loop di KANAN garis hidup', () => {
    const l = layoutSequence({
      participants: [P('a', 'A'), P('b', 'B')],
      messages: [M('m1', 'a', 'a', 'self', 'self')],
    });
    const [a] = l.participants;
    const msg = l.messages[0];
    expect(msg.self).toBe(true);
    expect(msg.x1).toBe(a.x);
    expect(msg.x2).toBe(a.x + SQ_LAYOUT.SELF_W);
  });

  it('loop peserta paling kanan tidak terpotong (width ikut membesar)', () => {
    // 4 peserta supaya lebar alami melewati MIN_WIDTH — kalau tidak, keduanya
    // di-clamp dan perbandingan tidak menguji apa pun.
    const four = [P('a', 'A'), P('b', 'B'), P('c', 'C'), P('d', 'D')];
    const withSelf = layoutSequence({
      participants: four,
      messages: [M('m1', 'd', 'd', 'self', 'self')],
    });
    const without = layoutSequence({
      participants: four,
      messages: [M('m1', 'a', 'd', 'x')],
    });
    const last = withSelf.participants[withSelf.participants.length - 1];
    expect(withSelf.width).toBeGreaterThan(without.width);
    expect(withSelf.width).toBeGreaterThanOrEqual(last.x + SQ_LAYOUT.SELF_W + SQ_LAYOUT.PAD);
  });

  it('pesan kanan→kiri benar arahnya', () => {
    const l = layoutSequence({
      participants: [P('a', 'A'), P('b', 'B')],
      messages: [M('m1', 'b', 'a', 'kembali', 'return')],
    });
    const [a, b] = l.participants;
    const m = l.messages[0];
    expect(m.x1).toBe(b.x);
    expect(m.x2).toBe(a.x);
    expect(m.x1).toBeGreaterThan(m.x2);
    expect(m.self).toBe(false);
  });

  it('pesan ke peserta tak dikenal tetap ada tapi tanpa koordinat', () => {
    const l = layoutSequence({
      participants: [P('a', 'A')],
      messages: [M('m1', 'a', 'ghost'), M('m2', 'a', 'a')],
    });
    expect(l.messages).toHaveLength(2);
    expect(l.messages[0].unresolved).toBe(true);
    expect(l.messages[0].x1).toBeNull();
    expect(l.messages[1].index).toBe(1);
    expect(l.messages[1].unresolved).toBe(false);
  });

  it('garis hidup berakhir setelah baris terakhir + margin', () => {
    // 4 pesan: baris terakhir (y=240) + TAIL_PAD melewati MIN_LIFELINE.
    const l = layoutSequence({
      participants: [P('a', 'A'), P('b', 'B')],
      messages: [M('m1', 'a', 'b'), M('m2', 'a', 'b'), M('m3', 'a', 'b'), M('m4', 'a', 'b')],
    });
    const last = l.messages[l.messages.length - 1];
    expect(l.lifelineBottom).toBe(last.y + SQ_LAYOUT.TAIL_PAD);
    expect(l.lifelineTop).toBe(SQ_LAYOUT.TOP_PAD + SQ_LAYOUT.BOX_H);
    expect(l.height).toBeGreaterThan(l.lifelineBottom);
  });

  it('diagram pendek: garis hidup di-clamp ke MIN_LIFELINE', () => {
    const l = layoutSequence({
      participants: [P('a', 'A'), P('b', 'B')],
      messages: [M('m1', 'a', 'b'), M('m2', 'a', 'b')],
    });
    expect(l.lifelineBottom).toBe(l.lifelineTop + SQ_LAYOUT.MIN_LIFELINE);
  });

  it('peserta diberi top padding; lifeline mulai di bawah kotak', () => {
    const l = layoutSequence({ participants: [P('a', 'A'), P('b', 'B')] });
    expect(l.participants.map((p) => p.y)).toEqual([SQ_LAYOUT.TOP_PAD, SQ_LAYOUT.TOP_PAD]);
    expect(l.lifelineTop).toBe(SQ_LAYOUT.TOP_PAD + SQ_LAYOUT.BOX_H);
  });

  it('tanpa pesan, garis hidup tetap punya panjang minimum', () => {
    const l = layoutSequence({ participants: [P('a', 'A')] });
    expect(l.lifelineBottom - l.lifelineTop).toBeGreaterThanOrEqual(SQ_LAYOUT.MIN_LIFELINE);
  });

  it('measure bisa di-inject (tanpa DOM)', () => {
    const l = layoutSequence(
      { participants: [P('a', 'A'), P('b', 'B')] },
      { measure: () => 500 },
    );
    // boxWidth = 500 + 32 padding; pitch = boxWidth + 48 gap.
    expect(l.boxWidth).toBe(532);
    expect(l.pitch).toBe(580);
  });
});

describe('pickMessageEndpoints', () => {
  const three = [P('a', 'A'), P('b', 'B'), P('c', 'C')];

  it('tanpa konteks → dua peserta pertama', () => {
    expect(pickMessageEndpoints({ participants: three })).toEqual({ from: 'a', to: 'b' });
  });

  it('peserta terpilih jadi from, to = peserta berikutnya', () => {
    expect(pickMessageEndpoints({ participants: three }, { selectedParticipantId: 'b' })).toEqual({
      from: 'b',
      to: 'c',
    });
  });

  it('peserta terakhir → siklik ke peserta pertama', () => {
    expect(pickMessageEndpoints({ participants: three }, { selectedParticipantId: 'c' })).toEqual({
      from: 'c',
      to: 'a',
    });
  });

  it('override manual menang, termasuk self-message', () => {
    expect(pickMessageEndpoints({ participants: three }, { from: 'c', to: 'c' })).toEqual({
      from: 'c',
      to: 'c',
    });
  });

  it('id tak dikenal diabaikan', () => {
    expect(
      pickMessageEndpoints({ participants: three }, { from: 'ghost', selectedParticipantId: 'b' }),
    ).toEqual({ from: 'b', to: 'c' });
  });

  it('anchor afterId melanjutkan dari .to pesan itu', () => {
    const messages = [{ id: 'm', from: 'a', to: 'c' }];
    expect(pickMessageEndpoints({ participants: three, messages }, { afterId: 'm' })).toEqual({
      from: 'c',
      to: 'a',
    });
  });

  it('anchor .to hantu → pakai .from anchor', () => {
    const participants = [P('a', 'A'), P('b', 'B')];
    const messages = [{ id: 'm', from: 'a', to: 'ghost' }];
    expect(pickMessageEndpoints({ participants, messages }, { afterId: 'm' })).toEqual({
      from: 'a',
      to: 'b',
    });
  });

  it('satu peserta → self', () => {
    expect(pickMessageEndpoints({ participants: [P('a', 'A')] })).toEqual({ from: 'a', to: 'a' });
  });

  it('tanpa peserta → null', () => {
    expect(pickMessageEndpoints({})).toBe(null);
  });
});

describe('validateSequence', () => {
  it('menandai pesan tanpa label', () => {
    const { messageWarnings } = validateSequence({
      participants: [P('a', 'A'), P('b', 'B')],
      messages: [M('m1', 'a', 'b', '  ')],
    });
    expect(messageWarnings.m1).toBe('Sequence: Message 1 has no label');
  });

  it('menandai peserta tanpa pesan sama sekali', () => {
    const { participantWarnings } = validateSequence({
      participants: [P('a', 'A'), P('b', 'Idle')],
      messages: [M('m1', 'a', 'a', 'x')],
    });
    expect(participantWarnings.b).toBe('Sequence: Idle has no messages');
    expect(participantWarnings.a).toBeUndefined();
  });

  it('menandai pesan yang merujuk peserta tidak ada', () => {
    const { messageWarnings } = validateSequence({
      participants: [P('a', 'A')],
      messages: [M('m1', 'a', 'ghost', 'x')],
    });
    expect(messageWarnings.m1).toBe('Sequence: Message 1 references an unknown participant');
  });

  it('data kosong tidak menghasilkan peringatan', () => {
    expect(validateSequence({})).toEqual({ participantWarnings: {}, messageWarnings: {} });
  });
});
