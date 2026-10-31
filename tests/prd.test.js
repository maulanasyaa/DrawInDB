import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SECTIONS,
  STORY_SECTION_KEY,
  createPrdDoc,
  normalizePrdDoc,
  sanitizeDocFilename,
  docDisplayName,
  docToMarkdown,
  sectionToMarkdown,
} from '../src/utils/prd.js';

describe('createPrdDoc', () => {
  it('membuat 7 section default dengan urutan tetap', () => {
    const doc = createPrdDoc('proj-1', 'My PRD');
    expect(doc.sections.map((s) => s.key)).toEqual([
      'latar-belakang',
      'tujuan-metrik',
      'target-pengguna',
      'fitur',
      'nfr',
      'di-luar-lingkup',
      'asumsi-risiko',
    ]);
    expect(doc.sections.map((s) => s.title)).toEqual(DEFAULT_SECTIONS.map((s) => s.title));
    expect(doc.stories).toEqual([]);
    expect(doc.meta).toMatchObject({ name: 'My PRD', type: 'prd', projectId: 'proj-1' });
  });

  it('nama kosong jatuh ke Untitled PRD', () => {
    expect(createPrdDoc('p', '').meta.name).toBe('Untitled PRD');
  });

  it('id section deterministik (stabil antar pembuatan)', () => {
    const a = createPrdDoc('p', 'x').sections.map((s) => s.id);
    const b = createPrdDoc('p', 'y').sections.map((s) => s.id);
    expect(a).toEqual(b);
  });
});

describe('normalizePrdDoc', () => {
  it('input null/string/array jadi dokumen valid', () => {
    for (const garbage of [null, undefined, 'nope', 42, []]) {
      const doc = normalizePrdDoc(garbage, { projectId: 'p1' });
      expect(doc.version).toBe('1.0');
      expect(doc.meta.type).toBe('prd');
      expect(doc.meta.projectId).toBe('p1');
      expect(doc.sections).toHaveLength(7);
      expect(doc.stories).toEqual([]);
    }
  });

  it('mengisi section yang hilang di posisi canonical', () => {
    const doc = normalizePrdDoc({
      meta: { name: 'X' },
      sections: [{ key: 'nfr', title: 'NFR', content: 'a' }],
    });
    expect(doc.sections.map((s) => s.key)).toEqual(DEFAULT_SECTIONS.map((s) => s.key));
    expect(doc.sections.find((s) => s.key === 'nfr').content).toBe('a');
  });

  it('mempertahankan section asing di akhir', () => {
    const doc = normalizePrdDoc({
      sections: [{ key: 'custom', title: 'Custom', content: 'c' }],
    });
    const keys = doc.sections.map((s) => s.key);
    expect(keys[keys.length - 1]).toBe('custom');
    expect(keys).toHaveLength(8);
  });

  it('membuang duplikat section default', () => {
    const doc = normalizePrdDoc({
      sections: [
        { key: 'fitur', title: 'A', content: '1' },
        { key: 'fitur', title: 'B', content: '2' },
      ],
    });
    expect(doc.sections.filter((s) => s.key === 'fitur')).toHaveLength(1);
  });

  it('coerce priority/status tak dikenal dan buang link rusak', () => {
    const doc = normalizePrdDoc({
      stories: [
        { actor: 'admin', want: 'x', benefit: 'y', priority: 'urgent', status: 'nope' },
        { actor: 'a', priority: 'must', status: 'done', links: [null, { note: 'no file' }, { diagramFile: 'f.json', diagramType: 'erd', note: ' n ' }] },
      ],
    });
    expect(doc.stories[0]).toMatchObject({ priority: 'should', status: 'todo', links: [] });
    expect(doc.stories[1]).toMatchObject({ priority: 'must', status: 'done' });
    expect(doc.stories[1].links).toEqual([
      { diagramFile: 'f.json', diagramType: 'erd', note: 'n' },
    ]);
  });

  it('idempotent', () => {
    const once = normalizePrdDoc({
      meta: { name: 'N' },
      sections: [{ key: 'latar-belakang', title: 'LB', content: 'x' }],
      stories: [{ actor: 'a', want: 'w', benefit: 'b' }],
    });
    expect(normalizePrdDoc(once)).toEqual(once);
  });

  it('sections/stories non-array tidak bikin crash', () => {
    const doc = normalizePrdDoc({ sections: 'x', stories: { a: 1 } });
    expect(doc.sections).toHaveLength(7);
    expect(doc.stories).toEqual([]);
  });
});

describe('sanitizeDocFilename', () => {
  it('hanya [a-z0-9_] dan suffix .json', () => {
    expect(sanitizeDocFilename('My PRD v2')).toBe('my_prd_v2.json');
  });

  it('menolak path traversal', () => {
    const name = sanitizeDocFilename('../../etc/passwd');
    expect(name).not.toContain('/');
    expect(name).not.toContain('..');
    expect(name).toBe('etc_passwd.json');
  });

  it('nama kosong jadi untitled.json', () => {
    expect(sanitizeDocFilename('')).toBe('untitled.json');
    expect(sanitizeDocFilename('   ')).toBe('untitled.json');
  });
});

describe('docDisplayName', () => {
  it('membalik nama file jadi judul', () => {
    expect(docDisplayName('my_prd.json')).toBe('my prd');
  });
});

describe('docToMarkdown', () => {
  const doc = createPrdDoc('p1', 'Checkout PRD');
  doc.sections[0].content = 'Existing checkout is slow.';
  doc.stories = [
    {
      id: 's1',
      actor: 'Buyer',
      want: 'pay with card',
      benefit: 'I complete orders | fast',
      priority: 'must',
      status: 'doing',
      links: [
        { diagramFile: 'checkout_flow.json', diagramType: 'flowchart', note: 'main path' },
        { diagramFile: 'gone.json', diagramType: 'erd' },
      ],
    },
  ];
  const diagrams = [{ filename: 'checkout_flow.json', name: 'Checkout Flow', type: 'flowchart' }];

  it('memuat judul, semua section, dan isi', () => {
    const md = docToMarkdown(doc, diagrams);
    expect(md.startsWith('# Checkout PRD')).toBe(true);
    for (const s of DEFAULT_SECTIONS) expect(md).toContain(`## ${s.title}`);
    expect(md).toContain('Existing checkout is slow.');
  });

  it('merender stories sebagai tabel di section Fitur', () => {
    const md = docToMarkdown(doc, diagrams);
    const fitur = md.slice(md.indexOf('## Fitur'), md.indexOf('## Non-Functional'));
    expect(fitur).toContain('| Actor | I want | So that | Priority | Status |');
    expect(fitur).toContain('| Buyer | pay with card | I complete orders \\| fast | Must | Doing |');
  });

  it('mendaftar tautan diagram dan menandai yang hilang', () => {
    const md = docToMarkdown(doc, diagrams);
    expect(md).toContain('## Diagram Links');
    expect(md).toContain('**Checkout Flow** — `flowchart` — `checkout_flow.json` — main path');
    expect(md).toContain('`gone.json` (diagram missing)');
  });

  it('dokumen kosong tetap menghasilkan markdown valid', () => {
    const md = docToMarkdown(createPrdDoc('p', 'Empty'), []);
    expect(md).toContain('# Empty');
    expect(md).toContain('_No user stories yet._');
  });

  it('section Fitur dipakai untuk stories, bukan content-nya', () => {
    const d = createPrdDoc('p', 'X');
    d.sections.find((s) => s.key === STORY_SECTION_KEY).content = 'abaikan ini';
    const md = docToMarkdown(d, []);
    expect(md).not.toContain('abaikan ini');
  });
});

describe('sectionToMarkdown', () => {
  const doc = createPrdDoc('p1', 'Checkout PRD');
  doc.sections[0].content = 'Existing checkout is slow.';
  doc.stories = [
    {
      id: 's1',
      actor: 'Buyer',
      want: 'pay with card',
      benefit: 'I complete orders',
      priority: 'must',
      status: 'doing',
      links: [],
    },
  ];

  it('judul + isi section biasa', () => {
    expect(sectionToMarkdown(doc.sections[0])).toBe(
      '## Latar Belakang\n\nExisting checkout is slow.\n',
    );
  });

  it('section kosong tetap menghasilkan judul', () => {
    expect(sectionToMarkdown(doc.sections[1])).toBe('## Tujuan dan Metrik\n');
  });

  it('section Fitur merender tabel stories dan mengabaikan content', () => {
    const fitur = doc.sections.find((s) => s.key === STORY_SECTION_KEY);
    fitur.content = 'abaikan ini';

    const md = sectionToMarkdown(fitur, doc.stories);

    expect(md.startsWith('## Fitur')).toBe(true);
    expect(md).toContain('| Actor | I want | So that | Priority | Status |');
    expect(md).toContain('| Buyer | pay with card | I complete orders | Must | Doing |');
    expect(md).not.toContain('abaikan ini');
  });

  it('section Fitur tanpa stories', () => {
    const fitur = doc.sections.find((s) => s.key === STORY_SECTION_KEY);
    expect(sectionToMarkdown(fitur, [])).toContain('_No user stories yet._');
  });

  it('masukan rusak tidak melempar', () => {
    expect(sectionToMarkdown(null)).toBe('## Untitled\n');
    expect(sectionToMarkdown({ key: 'nfr' })).toBe('## nfr\n');
    expect(sectionToMarkdown(doc.sections[0], null)).toContain('Existing checkout');
  });

  it('setiap section identik dengan bagiannya di docToMarkdown (copy ≡ export)', () => {
    const full = docToMarkdown(doc, []);
    for (const section of doc.sections) {
      const one = sectionToMarkdown(section, doc.stories);
      // Doc export merapatkan baris kosong ganda; bandingkan per baris non-kosong.
      const normalized = one.replace(/\n{3,}/g, '\n\n').trimEnd();
      expect(full, section.key).toContain(normalized);
    }
  });
});
