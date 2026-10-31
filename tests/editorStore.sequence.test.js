import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { useEditorStore } from '../src/store/editorStore.js';
import { normalizeSequence } from '../src/utils/sequence.js';
import { restore, s } from './helpers.js';

const SEQ = { type: 'sequence', name: 'Login Flow' };

/**
 * Seed lokal dengan timer ASLI + fake timers: test butuh debounce 500 ms
 * ketikan (`commitHistory('typing')`). `helpers.seed` men-stub setTimeout
 * jadi no-op sehingga burst tidak pernah jatuh tempo.
 */
function reset(meta = SEQ, state = {}) {
  useEditorStore.getState().cleanup();
  let clock = 1_700_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => (clock += 2));
  useEditorStore.setState({ diagramMeta: meta, ...state });
}

const past = () => s().historyPast;

const VAULT = '/vault';
const PROJ = 'proj-1';
const FILE = 'login_sequence.json';
const SAVE_CTX = { _vaultPath: VAULT, _projectId: PROJ, _filename: FILE };

/** Dua peserta + satu pesan; mengembalikan id keduanya. */
function seedPair(state = {}) {
  reset(SEQ, state);
  s().addSequenceParticipant('actor');
  s().addSequenceParticipant('database');
  const [a, b] = s().participants.map((p) => p.id);
  s().addSequenceMessage({ from: a, to: b, label: 'login' });
  return { a, b, msg: s().messages[0].id };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  restore();
  vi.useRealTimers();
});

describe('editorStore Sequence — participants', () => {
  it('tambah peserta = satu snapshot berisi default', () => {
    reset();
    s().addSequenceParticipant();
    expect(s().participants).toHaveLength(1);
    expect(s().participants[0]).toMatchObject({ name: 'Participant', kind: 'participant' });
    expect(past()).toHaveLength(1);
  });

  it('rename digabung jadi satu snapshot per burst ketikan', () => {
    reset();
    s().addSequenceParticipant();
    const { id } = s().participants[0];
    const before = past().length;

    s().updateSequenceParticipant(id, { name: 'A' });
    s().updateSequenceParticipant(id, { name: 'Al' });
    s().updateSequenceParticipant(id, { name: 'Ali' });
    vi.advanceTimersByTime(600);

    expect(past()).toHaveLength(before + 1);
    s().undo();
    expect(s().participants[0].name).toBe('Participant');
  });

  it('reorder = satu snapshot, tidak melewati batas', () => {
    reset();
    s().addSequenceParticipant();
    s().addSequenceParticipant();
    s().addSequenceParticipant();
    const ids = s().participants.map((p) => p.id);
    const before = past().length;

    s().moveSequenceParticipant(ids[0], 1);
    expect(s().participants.map((p) => p.id)).toEqual([ids[1], ids[0], ids[2]]);
    expect(past()).toHaveLength(before + 1);

    // ids[1] sekarang di posisi 0: naik lagi harus no-op (tanpa snapshot).
    s().moveSequenceParticipant(ids[1], -1);
    expect(past()).toHaveLength(before + 1);
    s().undo();
    expect(s().participants.map((p) => p.id)).toEqual(ids);
  });

  it('hapus peserta menghapus pesannya dalam SATU snapshot; undo memulihkan keduanya', () => {
    const { a, b, msg } = seedPair();
    const before = past().length;

    s().deleteSequenceParticipant(b);

    expect(s().participants.map((p) => p.id)).toEqual([a]);
    expect(s().messages).toEqual([]);
    expect(past()).toHaveLength(before + 1); // bukan dua entri

    s().undo();
    expect(s().participants.map((p) => p.id)).toEqual([a, b]);
    expect(s().messages.map((m) => m.id)).toEqual([msg]);

    s().redo();
    expect(s().participants).toHaveLength(1);
    expect(s().messages).toEqual([]);
  });
});

describe('editorStore Sequence — messages', () => {
  it('pesan butuh peserta; ditambahkan di akhir secara default', () => {
    reset();
    s().addSequenceMessage({}, null);
    expect(s().messages).toEqual([]);

    s().addSequenceParticipant();
    s().addSequenceParticipant();
    s().addSequenceMessage({}, null);
    s().addSequenceMessage({}, null);

    expect(s().messages).toHaveLength(2);
    expect(s().messages[0].from).toBe(s().participants[0].id);
    expect(s().messages[0].to).toBe(s().participants[1].id);
    expect(s().messages.every((m) => m.kind === 'sync')).toBe(true);
  });

  it('peserta terpilih menjadi from default; tidak self saat peserta >= 2', () => {
    reset();
    s().addSequenceParticipant();
    s().addSequenceParticipant();
    s().addSequenceParticipant();
    const [, b, c] = s().participants.map((p) => p.id);

    s().setSelectedSequenceItem({ type: 'participant', id: b });
    s().addSequenceMessage({}, null);

    expect(s().messages[0]).toMatchObject({ from: b, to: c });
  });

  it('tambah setelah pesan terpilih melanjutkan arah balasan', () => {
    const { a, b, msg } = seedPair(); // a → b
    s().addSequenceMessage({}, msg);

    expect(s().messages[1]).toMatchObject({ from: b, to: a });
  });

  it('afterId menyisipkan tepat setelah pesan terpilih', () => {
    const { a, b, msg } = seedPair();
    s().addSequenceMessage({ from: b, to: a, label: 'balasan' }, msg);

    expect(s().messages.map((m) => m.label)).toEqual(['login', 'balasan']);
    expect(s().messages[1]).toMatchObject({ from: b, to: a });
  });

  it('label digabung per burst, reorder satu snapshot, hapus satu snapshot', () => {
    const { msg } = seedPair();
    const before = past().length;

    s().updateSequenceMessage(msg, { label: 'log' });
    s().updateSequenceMessage(msg, { label: 'login!' });
    vi.advanceTimersByTime(600);
    expect(past()).toHaveLength(before + 1);

    const a = s().participants[0].id;
    const b = s().participants[1].id;
    s().addSequenceMessage({ from: b, to: a }, null);
    const extra = s().messages[1].id;
    expect(past()).toHaveLength(before + 2); // add pesan = satu snapshot

    s().moveSequenceMessage(extra, -1);
    expect(s().messages.map((m) => m.id)).toEqual([extra, msg]);
    expect(past()).toHaveLength(before + 3);

    s().deleteSequenceMessage(msg);
    expect(s().messages.map((m) => m.id)).toEqual([extra]);
    expect(past()).toHaveLength(before + 4);
    expect(s().messages.some((m) => m.from === a && m.to === b)).toBe(false);
  });

  it('toggleSequenceNumbers tidak menambah history tapi menandai dirty', () => {
    seedPair();
    const before = past().length;

    s().toggleSequenceNumbers();
    expect(s().sequenceOptions.showNumbers).toBe(true);
    expect(s().isDirty).toBe(true);
    expect(past()).toHaveLength(before);

    s().toggleSequenceNumbers();
    expect(s().sequenceOptions.showNumbers).toBe(false);
  });

  it('seleksi di luar history', () => {
    seedPair();
    const before = past().length;
    s().setSelectedSequenceItem({ type: 'participant', id: s().participants[0].id });

    expect(s().selectedSequenceItem.type).toBe('participant');
    expect(past()).toHaveLength(before);
  });

  it('seleksi ikut dibersihkan saat item terpilih dihapus', () => {
    const { b } = seedPair();
    s().setSelectedSequenceItem({ type: 'participant', id: b });
    s().deleteSequenceParticipant(b);
    expect(s().selectedSequenceItem).toBe(null);
  });
});

describe('editorStore Sequence — persistensi', () => {
  function installFakeFs() {
    const files = new Map();
    globalThis.window = {
      api: {
        pathJoin: (...p) => p.filter(Boolean).join('/'),
        readFile: async (p) => {
          if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
          return files.get(p);
        },
        writeFile: async (p, content) => files.set(p, content),
      },
    };
    return files;
  }

  const VAULT = '/vault';
  const PROJ = 'proj-1';
  const FILE = 'login_sequence.json';

  afterEach(() => {
    delete globalThis.window;
  });

  it('round-trip: state → JSON → state identik, field sequence hanya untuk sequence', async () => {
    const files = installFakeFs();
    seedPair(SAVE_CTX);
    s().toggleSequenceNumbers();
    s().updateCanvas({ x: 4, y: 5, zoom: 1 });

    const before = {
      participants: s().participants,
      messages: s().messages,
      sequenceOptions: s().sequenceOptions,
    };

    await s().saveDiagram();
    const raw = JSON.parse([...files.values()][0]);

    expect(raw.meta.type).toBe('sequence');
    expect(raw.participants).toEqual(before.participants);
    expect(raw.messages).toEqual(before.messages);
    expect(raw.options).toEqual({ showNumbers: true });
    expect(raw.tables).toEqual([]);
    expect(raw.nodes).toEqual([]);

    s().cleanup();
    await s().loadDiagram(VAULT, PROJ, FILE);

    expect({
      participants: s().participants,
      messages: s().messages,
      sequenceOptions: s().sequenceOptions,
    }).toEqual(before);
    expect(s().loadError).toBe(null);
  });

  it('file sequence rusak/field hilang tidak crash dan dinormalisasi', async () => {
    const files = installFakeFs();
    files.set(
      `${VAULT}/projects/${PROJ}/diagrams/${FILE}`,
      JSON.stringify({
        meta: { type: 'sequence', name: 'Broken' },
        participants: [null, { name: 'A' }, { id: 'b', name: 'B', kind: 'nope' }],
        messages: [{ from: 'b', to: 'ghost' }, 'x'],
        options: 'rusak',
      }),
    );

    reset({ type: 'sequence', name: 'Broken' });
    await s().loadDiagram(VAULT, PROJ, FILE);

    expect(s().loadError).toBe(null);
    // Id pengganti memakai indeks SETELAH entri rusak dibuang.
    expect(s().participants).toEqual([
      { id: 'p-0', name: 'A', kind: 'participant' },
      { id: 'b', name: 'B', kind: 'participant' },
    ]);
    expect(s().messages).toEqual([
      { id: 'm-0', from: 'b', to: 'ghost', label: '', kind: 'sync' },
    ]);
    expect(s().sequenceOptions).toEqual({ showNumbers: false });
  });

  it('loadDiagram diagram non-sequence mengosongkan state sequence', async () => {
    const files = installFakeFs();
    files.set(
      `${VAULT}/projects/${PROJ}/diagrams/${FILE}`,
      JSON.stringify({ meta: { type: 'flowchart', name: 'Flow' }, nodes: [], edges: [] }),
    );

    seedPair(); // state sequence terisi
    await s().loadDiagram(VAULT, PROJ, FILE);

    expect(s().participants).toEqual([]);
    expect(s().messages).toEqual([]);
    expect(s().sequenceOptions).toEqual({ showNumbers: false });
  });

  it('cleanup basi (load lama) tidak menghapus konteks simpan', async () => {
    const files = installFakeFs();
    const path = `${VAULT}/projects/${PROJ}/diagrams/${FILE}`;
    files.set(
      path,
      JSON.stringify({
        meta: { type: 'sequence', name: 'Login Flow' },
        participants: [],
        messages: [],
        options: { showNumbers: false },
      }),
    );

    reset();
    await s().loadDiagram(VAULT, PROJ, FILE); // mount 1
    const stale = s()._loadToken;
    await s().loadDiagram(VAULT, PROJ, FILE); // mount 2 (StrictMode)

    s().cleanup(stale); // cleanup mount 1 — harus diabaikan

    expect(s()._vaultPath).toBe(VAULT);
    expect(s()._loadToken).toBe(stale + 1);

    s().addSequenceParticipant();
    await s().saveDiagram();

    expect(JSON.parse(files.get(path)).participants).toHaveLength(1);
  });

  it('cleanup dengan token terbaru tetap membersihkan state', async () => {
    const files = installFakeFs();
    files.set(
      `${VAULT}/projects/${PROJ}/diagrams/${FILE}`,
      JSON.stringify({ meta: { type: 'sequence', name: 'Login Flow' } }),
    );

    reset();
    await s().loadDiagram(VAULT, PROJ, FILE);
    s().cleanup(s()._loadToken);

    expect(s().diagramMeta).toBe(null);
    expect(s()._vaultPath).toBe(null);
    expect(s()._pendingSave).toBe(null);
  });

  it('cleanup mengosongkan seluruh state sequence', async () => {
    seedPair();
    s().setSelectedSequenceItem({ type: 'message', id: s().messages[0].id });
    s().toggleSequenceNumbers();

    s().cleanup();

    expect(s().participants).toEqual([]);
    expect(s().messages).toEqual([]);
    expect(s().sequenceOptions).toEqual({ showNumbers: false });
    expect(s().selectedSequenceItem).toBe(null);
  });
});

describe('normalizeSequence — dipakai store saat load', () => {
  it('idempotent terhadap output load', () => {
    const once = normalizeSequence({
      participants: [{ id: 'a', name: 'A', kind: 'actor' }],
      messages: [{ id: 'm', from: 'a', to: 'a', label: 'x', kind: 'self' }],
    });
    expect(normalizeSequence(once)).toEqual(once);
  });
});
