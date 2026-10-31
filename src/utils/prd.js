// Dokumen PRD: template, normalisasi, sanitasi nama file, serialisasi markdown.
// Murni (tanpa window/api) supaya bisa dites di environment node.

export const PRD_VERSION = "1.0";
export const PRD_TYPE = "prd";

// Urutan canonical section. `key` stabil; `title` hanya default yang bisa diubah user.
export const DEFAULT_SECTIONS = [
  { key: "latar-belakang", title: "Latar Belakang" },
  { key: "tujuan-metrik", title: "Tujuan dan Metrik" },
  { key: "target-pengguna", title: "Target Pengguna" },
  { key: "fitur", title: "Fitur" },
  { key: "nfr", title: "Non-Functional Requirements" },
  { key: "di-luar-lingkup", title: "Di Luar Lingkup" },
  { key: "asumsi-risiko", title: "Asumsi dan Risiko" },
];

/** Section yang isinya di-render dari tabel user stories, bukan textarea. */
export const STORY_SECTION_KEY = "fitur";

export const PRIORITIES = ["must", "should", "could", "wont"];
export const STATUSES = ["todo", "doing", "done"];
export const PRIORITY_LABELS = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
};
export const STATUS_LABELS = { todo: "Todo", doing: "Doing", done: "Done" };

const str = (v) => (typeof v === "string" ? v.trim() : "");
const slug = (v) =>
  str(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function sectionId(key) {
  return `sec_${key}`;
}

/** Dokumen PRD baru dengan 7 section default kosong. */
export function createPrdDoc(projectId, name, now = new Date().toISOString()) {
  return {
    version: PRD_VERSION,
    meta: {
      name: str(name) || "Untitled PRD",
      type: PRD_TYPE,
      projectId: projectId || "",
      created_at: now,
      updated_at: now,
    },
    sections: DEFAULT_SECTIONS.map((s) => ({
      id: sectionId(s.key),
      key: s.key,
      title: s.title,
      content: "",
    })),
    stories: [],
  };
}

function normalizeStory(raw, index) {
  const src = raw && typeof raw === "object" ? raw : {};
  const priority = PRIORITIES.includes(src.priority) ? src.priority : "should";
  const status = STATUSES.includes(src.status) ? src.status : "todo";
  const links = (Array.isArray(src.links) ? src.links : [])
    .filter((l) => l && typeof l === "object" && str(l.diagramFile))
    .map((l) => ({
      diagramFile: str(l.diagramFile),
      diagramType: str(l.diagramType),
      ...(str(l.note) ? { note: str(l.note) } : {}),
    }));

  return {
    id: str(src.id) || `story_${index + 1}`,
    actor: str(src.actor),
    want: str(src.want),
    benefit: str(src.benefit),
    priority,
    status,
    links,
  };
}

/**
 * Normalisasi dokumen dari file. Tahan terhadap file rusak:
 * field hilang, array bukan array, enum tak dikenal, id kosong.
 * Idempotent: normalize(normalize(x)) === normalize(x).
 *
 * Section default yang hilang disisipkan di urutan canonical; section asing
 * dipertahankan di akhir supaya data user tidak hilang.
 */
export function normalizePrdDoc(raw, ctx = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const meta = src.meta && typeof src.meta === "object" ? src.meta : {};

  const inSections = Array.isArray(src.sections) ? src.sections : [];
  const known = new Map();
  const extras = [];

  for (const item of inSections) {
    if (!item || typeof item !== "object") continue;
    const key = str(item.key) || slug(item.title);
    if (!key) continue;
    const section = {
      id: str(item.id) || sectionId(key),
      key,
      title: str(item.title) || DEFAULT_SECTIONS.find((s) => s.key === key)?.title || key,
      content: typeof item.content === "string" ? item.content : "",
    };
    if (DEFAULT_SECTIONS.some((s) => s.key === key)) {
      if (!known.has(key)) known.set(key, section);
    } else {
      extras.push(section);
    }
  }

  const sections = [
    ...DEFAULT_SECTIONS.map(
      (def) =>
        known.get(def.key) || {
          id: sectionId(def.key),
          key: def.key,
          title: def.title,
          content: "",
        },
    ),
    ...extras,
  ];

  const stories = (Array.isArray(src.stories) ? src.stories : [])
    .filter((s) => s && typeof s === "object")
    .map(normalizeStory);

  const created = str(meta.created_at) || new Date().toISOString();

  return {
    version: PRD_VERSION,
    meta: {
      name: str(meta.name) || str(ctx.name) || "Untitled PRD",
      type: PRD_TYPE,
      projectId: str(meta.projectId) || str(ctx.projectId),
      created_at: created,
      updated_at: str(meta.updated_at) || created,
    },
    sections,
    stories,
  };
}

/**
 * Nama file dokumen dari nama user. Selalu `<slug>.json`, tanpa `.` `/` `\`,
 * jadi tidak bisa keluar dari folder docs.
 */
export function sanitizeDocFilename(name) {
  const base = slug(name).replace(/-/g, "_") || "untitled";
  return `${base}.json`;
}

export function docDisplayName(filename) {
  return String(filename || "")
    .replace(/\.json$/i, "")
    .replace(/_/g, " ")
    .trim();
}

const escapeCell = (v) => String(v || "").replace(/\|/g, "\\|").replace(/\n+/g, " ");

function storiesTable(stories) {
  if (!stories.length) return "_No user stories yet._";
  const head = "| Actor | I want | So that | Priority | Status |\n| --- | --- | --- | --- | --- |";
  const rows = stories.map(
    (s) =>
      `| ${escapeCell(s.actor)} | ${escapeCell(s.want)} | ${escapeCell(s.benefit)} | ${PRIORITY_LABELS[s.priority]} | ${STATUS_LABELS[s.status]} |`,
  );
  return [head, ...rows].join("\n");
}

function diagramLinks(stories, diagrams) {
  const byFile = new Map((diagrams || []).map((d) => [d.filename, d]));
  const seen = new Set();
  const lines = [];

  for (const story of stories) {
    for (const link of story.links || []) {
      if (seen.has(link.diagramFile)) continue;
      seen.add(link.diagramFile);
      const diagram = byFile.get(link.diagramFile);
      if (!diagram) {
        lines.push(`- \`${link.diagramFile}\` (diagram missing)`);
        continue;
      }
      const note = link.note ? ` — ${link.note}` : "";
      lines.push(`- **${diagram.name}** — \`${diagram.type}\` — \`${link.diagramFile}\`${note}`);
    }
  }

  return lines.join("\n");
}

/**
 * Satu section sebagai markdown (judul + isi). Untuk section Fitur, isinya
 * adalah tabel stories — `content` tidak pernah dipakai.
 * Dipakai bersama oleh `docToMarkdown` (export) dan tombol copy per section,
 * jadi dua jalur itu tidak mungkin berbeda.
 */
export function sectionToMarkdown(section, stories = []) {
  const s = section || {};
  const lines = [`## ${s.title || s.key || "Untitled"}`, ""];

  if (s.key === STORY_SECTION_KEY) {
    lines.push(storiesTable(Array.isArray(stories) ? stories : []), "");
  } else {
    const content = (s.content || "").trim();
    if (content) lines.push(content, "");
  }

  return lines.join("\n");
}

/** Satu file markdown: judul, semua section, tabel stories, daftar tautan diagram. */
export function docToMarkdown(doc, diagrams = []) {
  const d = doc || {};
  const meta = d.meta || {};
  const sections = Array.isArray(d.sections) ? d.sections : [];
  const stories = Array.isArray(d.stories) ? d.stories : [];

  const out = [`# ${meta.name || "Untitled PRD"}`, ""];
  if (meta.created_at) out.push(`_Created: ${meta.created_at}_`, "");
  if (meta.updated_at) out.push(`_Updated: ${meta.updated_at}_`, "");

  for (const section of sections) {
    out.push(sectionToMarkdown(section, stories), "");
  }

  const links = diagramLinks(stories, diagrams);
  if (links) out.push("## Diagram Links", "", links, "");

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
