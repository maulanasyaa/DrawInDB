import { vi } from 'vitest';
import { useEditorStore } from '../src/store/editorStore.js';

/**
 * Isi store dengan meta + state awal dan matikan autosave.
 * Setiap action di editorStore memanggil autoSave() (setTimeout 1500ms) yang
 * bisa memicu saveDiagram liar. Timer diganti stub no-op supaya assert
 * hanya melihat state hasil action.
 */
export function seed(meta, state = {}) {
  useEditorStore.getState().cleanup();
  vi.stubGlobal('setTimeout', () => 0);
  vi.stubGlobal('clearTimeout', () => {});
  // ID berbasis Date.now(): naikkan tiap panggilan supaya dua action beruntun
  // tidak menghasilkan id identik (mis. `rel-<ms>` yang lalu di-dedupe addEdge).
  let clock = 1_700_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => (clock += 2));
  useEditorStore.setState({ diagramMeta: meta, ...state });
}

export function restore() {
  useEditorStore.getState().cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
}

export const s = () => useEditorStore.getState();

export const table = (id, name, columns) => ({
  id,
  type: 'table',
  position: { x: 0, y: 0 },
  data: { name, columns },
});

export const col = (id, name, type, extra = {}) => ({
  id,
  name,
  type,
  pk: false,
  fk: false,
  notNull: false,
  unique: false,
  ...extra,
});

export const node = (id, subtype, extra = {}) => ({
  id,
  type: 'flowchart',
  position: { x: 0, y: 0 },
  data: { type: subtype, label: subtype },
  ...extra,
});

/** Ambil kolom dari tabel tertentu. */
export const colsOf = (tableId) =>
  s().tables.find((t) => t.id === tableId).data.columns;

/** Ambil kolom berdasarkan id di semua tabel. */
export const findCol = (colId) => {
  for (const t of s().tables) {
    const c = t.data.columns.find((x) => x.id === colId);
    if (c) return c;
  }
  return undefined;
};
