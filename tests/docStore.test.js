import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDocStore } from '../src/store/docStore.js';
import { useVaultStore } from '../src/store/vaultStore.js';
import { createPrdDoc } from '../src/utils/prd.js';

const VAULT = '/vault';
const PROJ = 'proj-1';
const FILE = 'my_prd.json';
const DOC_PATH = `${VAULT}/projects/${PROJ}/docs/${FILE}`;

let files;

function installFakeFs() {
  files = new Map();
  globalThis.window = {
    api: {
      pathJoin: (...parts) => parts.filter(Boolean).join('/'),
      readFile: async (p) => {
        if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
        return files.get(p);
      },
      writeFile: async (p, content) => {
        files.set(p, content);
      },
    },
  };
  return files;
}

const seedVault = () =>
  useVaultStore.setState({
    currentVault: {
      path: VAULT,
      name: 'vault',
      projects: [
        {
          id: PROJ,
          name: 'Project',
          diagrams: [],
          documents: [{ filename: FILE, name: 'My PRD', type: 'prd', updated_at: '' }],
        },
      ],
    },
  });

const d = () => useDocStore.getState();

function seedDocFile(doc = createPrdDoc(PROJ, 'My PRD')) {
  files.set(DOC_PATH, JSON.stringify(doc));
  return doc;
}

beforeEach(() => {
  installFakeFs();
  useDocStore.getState().cleanup();
  seedVault();
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  useDocStore.getState().cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete globalThis.window;
  useVaultStore.setState({ currentVault: null });
});

describe('loadDoc', () => {
  it('memuat dan menormalkan dokumen', async () => {
    seedDocFile({ meta: { name: 'X' }, sections: [{ key: 'nfr', title: 'NFR', content: 'a' }] });
    await d().loadDoc(VAULT, PROJ, FILE);

    expect(d().isLoading).toBe(false);
    expect(d().notFound).toBe(false);
    expect(d().doc.sections).toHaveLength(7);
    expect(d().doc.meta.name).toBe('X');
  });

  it('file hilang/rusak → notFound, tidak crash', async () => {
    await d().loadDoc(VAULT, PROJ, FILE);
    expect(d().notFound).toBe(true);
    expect(d().doc).toBeNull();
    expect(d().loadError).toMatch(/ENOENT/);

    files.set(DOC_PATH, '{ bukan json');
    await d().loadDoc(VAULT, PROJ, FILE);
    expect(d().notFound).toBe(true);
  });

  it('menerima nama file ber-titik tapi tetap menolak traversal', async () => {
    files.set(`${VAULT}/projects/${PROJ}/docs/v1.0_spec.json`, JSON.stringify(createPrdDoc(PROJ, 'Spec')));
    await d().loadDoc(VAULT, PROJ, 'v1.0_spec.json');
    expect(d().notFound).toBe(false);
    expect(d().doc.meta.name).toBe('Spec');
  });

  it('menolak filename dari URL yang bukan <slug>.json', async () => {
    for (const bad of ['../../project.json', 'a/b.json', '..\\x.json', '.hidden.json', 'x.txt', '']) {
      await d().loadDoc(VAULT, PROJ, bad);
      expect(d().notFound, bad).toBe(true);
      expect(d().doc, bad).toBeNull();
    }
    // File sah tidak tersentuh.
    expect(files.size).toBe(0);
  });

  it('menyimpan konteks vault/project/filename', async () => {
    seedDocFile();
    await d().loadDoc(VAULT, PROJ, FILE);
    expect(d()._vaultPath).toBe(VAULT);
    expect(d()._projectId).toBe(PROJ);
    expect(d()._filename).toBe(FILE);
  });
});

describe('edit + autosave', () => {
  beforeEach(async () => {
    seedDocFile();
    await d().loadDoc(VAULT, PROJ, FILE);
  });

  it('setSectionContent menandai dirty dan menjadwalkan simpan', async () => {
    const before = files.get(DOC_PATH);
    const target = d().doc.sections[0];
    d().setSectionContent(target.id, 'isi baru');

    expect(d().isDirty).toBe(true);
    expect(d().doc.sections[0].content).toBe('isi baru');
    expect(files.get(DOC_PATH)).toBe(before); // belum tersimpan
  });

  it('setelah 1500 ms file tertulis dan dirty bersih', async () => {
    const target = d().doc.sections[0];
    d().setSectionContent(target.id, 'isi baru');
    await vi.advanceTimersByTimeAsync(1500);

    const saved = JSON.parse(files.get(DOC_PATH));
    expect(saved.sections[0].content).toBe('isi baru');
    expect(d().isDirty).toBe(false);
  });

  it('setSectionTitle mengubah judul', () => {
    const target = d().doc.sections[1];
    d().setSectionTitle(target.id, 'Judul Baru');
    expect(d().doc.sections[1].title).toBe('Judul Baru');
  });

  it('edit kedua sebelum timer habis hanya menyimpan sekali (debounce)', async () => {
    let writes = 0;
    const originalWrite = globalThis.window.api.writeFile;
    globalThis.window.api.writeFile = async (p, c) => {
      writes++;
      return originalWrite(p, c);
    };

    const id = d().doc.sections[0].id;
    d().setSectionContent(id, 'a');
    await vi.advanceTimersByTimeAsync(1000);
    d().setSectionContent(id, 'ab');
    await vi.advanceTimersByTimeAsync(1500);

    expect(writes).toBe(1);
    expect(JSON.parse(files.get(DOC_PATH)).sections[0].content).toBe('ab');
  });

  it('simpan memperbarui meta daftar dokumen di vaultStore tanpa spinner', async () => {
    const id = d().doc.sections[0].id;
    d().setSectionContent(id, 'x');
    await vi.advanceTimersByTimeAsync(1500);

    const listed = useVaultStore
      .getState()
      .currentVault.projects[0].documents.find((x) => x.filename === FILE);
    expect(listed.updated_at).toBeTruthy();
    expect(useVaultStore.getState().isLoading).toBe(false);
  });
});

describe('flush', () => {
  it('menyimpan segera tanpa menunggu debounce', async () => {
    seedDocFile();
    await d().loadDoc(VAULT, PROJ, FILE);
    d().setSectionContent(d().doc.sections[0].id, 'segera');
    expect(d().isDirty).toBe(true);

    await d().flush();

    expect(d().isDirty).toBe(false);
    expect(JSON.parse(files.get(DOC_PATH)).sections[0].content).toBe('segera');
  });

  it('tidak menulis apa pun kalau tidak dirty', async () => {
    seedDocFile();
    await d().loadDoc(VAULT, PROJ, FILE);
    const before = files.get(DOC_PATH);

    await d().flush();

    expect(files.get(DOC_PATH)).toBe(before);
  });
});

describe('stories', () => {
  beforeEach(async () => {
    seedDocFile();
    await d().loadDoc(VAULT, PROJ, FILE);
  });

  it('addStory menambah cerita default', () => {
    d().addStory();
    expect(d().doc.stories).toHaveLength(1);
    expect(d().doc.stories[0]).toMatchObject({ priority: 'should', status: 'todo', links: [] });
  });

  it('addStory menerima patch awal dan id unik', () => {
    d().addStory({ actor: 'admin' });
    d().addStory({ actor: 'buyer' });
    const [a, b] = d().doc.stories;
    expect(a.actor).toBe('admin');
    expect(a.id).not.toBe(b.id);
  });

  it('updateStory mengabaikan enum tak dikenal', () => {
    d().addStory({ priority: 'must' });
    const id = d().doc.stories[0].id;

    d().updateStory(id, { want: 'pay', priority: 'urgent', status: 'selesai' });

    expect(d().doc.stories[0]).toMatchObject({ want: 'pay', priority: 'must', status: 'todo' });
  });

  it('deleteStory', () => {
    d().addStory();
    const id = d().doc.stories[0].id;
    d().deleteStory(id);
    expect(d().doc.stories).toEqual([]);
  });

  it('moveStory menukar posisi dan menahan di batas', () => {
    d().addStory({ actor: 'a' });
    d().addStory({ actor: 'b' });
    d().addStory({ actor: 'c' });
    const [a, b] = d().doc.stories.map((s) => s.id);

    d().moveStory(b, -1);
    expect(d().doc.stories.map((s) => s.actor)).toEqual(['b', 'a', 'c']);

    d().moveStory(a, 1);
    expect(d().doc.stories.map((s) => s.actor)).toEqual(['b', 'c', 'a']);

    // Di luar batas: tidak berubah.
    d().moveStory(b, -1);
    expect(d().doc.stories.map((s) => s.actor)).toEqual(['b', 'c', 'a']);
  });

  it('setStoryLinks membuang tautan tanpa diagramFile dan field kosong', () => {
    d().addStory();
    const id = d().doc.stories[0].id;

    d().setStoryLinks(id, [
      null,
      { note: 'tanpa file' },
      { diagramFile: 'a.json', diagramType: 'erd', note: '' },
      { diagramFile: 'b.json', diagramType: 'flowchart', note: 'catatan' },
    ]);

    expect(d().doc.stories[0].links).toEqual([
      { diagramFile: 'a.json', diagramType: 'erd' },
      { diagramFile: 'b.json', diagramType: 'flowchart', note: 'catatan' },
    ]);
  });
});

describe('cleanup', () => {
  it('membatalkan timer dan mengosongkan state', async () => {
    seedDocFile();
    await d().loadDoc(VAULT, PROJ, FILE);
    d().setSectionContent(d().doc.sections[0].id, 'x');

    d().cleanup();

    expect(d().doc).toBeNull();
    expect(d().isDirty).toBe(false);
    expect(d()._pendingSave).toBeNull();

    // Timer lama tidak boleh menulis setelah cleanup.
    files.set(DOC_PATH, 'PRISTINE');
    await vi.advanceTimersByTimeAsync(2000);
    expect(files.get(DOC_PATH)).toBe('PRISTINE');
  });
});
