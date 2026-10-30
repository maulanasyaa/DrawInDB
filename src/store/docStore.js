import { create } from 'zustand';
import { normalizePrdDoc, PRIORITIES, STATUSES } from '../utils/prd.js';
import { useVaultStore } from './vaultStore.js';

const AUTOSAVE_MS = 1500;
let _storySeq = 0;

const newStoryId = () => `story_${Date.now()}_${++_storySeq}`;

/**
 * Store dokumen PRD yang sedang dibuka. Terpisah dari editorStore: dokumen
 * bukan tipe diagram dan tidak memakai React Flow.
 *
 * Pembagian tugas: vaultStore memiliki DAFTAR dokumen (create/rename/delete),
 * store ini memiliki ISI dokumen yang sedang diedit + autosave.
 */
export const useDocStore = create((set, get) => ({
  doc: null,
  isDirty: false,
  isLoading: true,
  notFound: false,
  loadError: null,
  _vaultPath: null,
  _projectId: null,
  _filename: null,
  _autoSaveTimer: null,
  _pendingSave: null,
  _loadToken: 0,

  loadDoc: async (vaultPath, projectId, filename) => {
    const timer = get()._autoSaveTimer;
    if (timer) clearTimeout(timer);

    // `filename` datang dari URL: tolak path traversal supaya saveDoc tidak
    // bisa diarahkan ke file lain di vault. Nama ber-titik tetap diizinkan
    // (mis. `v1.0_spec.json` yang diletakkan manual).
    if (
      !filename ||
      filename.startsWith('.') ||
      filename.includes('..') ||
      /[\\/]/.test(filename) ||
      !filename.endsWith('.json')
    ) {
      set({ doc: null, isLoading: false, notFound: true, loadError: 'Invalid document name.' });
      return;
    }

    const token = get()._loadToken + 1;
    set({
      _loadToken: token,
      isLoading: true,
      notFound: false,
      loadError: null,
      isDirty: false,
      _pendingSave: null,
      _autoSaveTimer: null,
      _vaultPath: vaultPath,
      _projectId: projectId,
      _filename: filename,
    });

    try {
      const filePath = await window.api.pathJoin(vaultPath, 'projects', projectId, 'docs', filename);
      const raw = JSON.parse(await window.api.readFile(filePath));
      if (get()._loadToken !== token) return; // pindah dokumen saat masih membaca

      set({ doc: normalizePrdDoc(raw, { projectId }), isLoading: false, notFound: false });
    } catch (e) {
      if (get()._loadToken !== token) return;
      set({ doc: null, isLoading: false, notFound: true, loadError: e.message });
    }
  },

  markDirty: (vaultPath, projectId, filename) => {
    const patch = { isDirty: true };
    // Konteks simpan selalu diperbarui; loadDoc mengosongkannya.
    if (vaultPath && projectId && filename) {
      patch._pendingSave = { vaultPath, projectId, filename };
    }
    set(patch);
  },

  autoSave: () => {
    if (get()._autoSaveTimer) clearTimeout(get()._autoSaveTimer);
    const timer = setTimeout(() => {
      if (get().isDirty) get().saveDoc();
    }, AUTOSAVE_MS);
    set({ _autoSaveTimer: timer });
  },

  saveDoc: async () => {
    const { _pendingSave, doc, isDirty } = get();
    if (!_pendingSave || !doc || !isDirty) return;

    if (get()._autoSaveTimer) {
      clearTimeout(get()._autoSaveTimer);
      set({ _autoSaveTimer: null });
    }

    const { vaultPath, projectId, filename } = _pendingSave;
    const updated = {
      ...doc,
      meta: { ...doc.meta, updated_at: new Date().toISOString() },
    };

    try {
      const filePath = await window.api.pathJoin(vaultPath, 'projects', projectId, 'docs', filename);
      await window.api.writeFile(filePath, JSON.stringify(updated, null, 2));

      if (get().doc === doc) {
        set({ doc: updated, isDirty: false, _pendingSave: null });
      }
      // Kalau doc sudah berubah selama menulis: biarkan dirty DAN _pendingSave
      // tetap ada, supaya timer berikutnya masih punya konteks untuk menyimpan.

      // Daftar dokumen di vaultStore ikut diperbarui tanpa memicu spinner.
      try {
        useVaultStore.getState().updateDocumentMeta(projectId, filename, {
          name: updated.meta.name,
          updated_at: updated.meta.updated_at,
        });
      } catch {
        /* daftar hanya tampilan; kegagalan di sini tidak membatalkan simpan */
      }
    } catch (e) {
      console.error('Failed to save document:', e);
      set({ loadError: `Failed to save document: ${e.message}` });
    }
  },

  /** Simpan segera (Cmd/Ctrl+S, sebelum meninggalkan halaman). */
  flush: async () => {
    if (get()._autoSaveTimer) {
      clearTimeout(get()._autoSaveTimer);
      set({ _autoSaveTimer: null });
    }
    if (get().isDirty) await get().saveDoc();
  },

  cleanup: () => {
    if (get()._autoSaveTimer) clearTimeout(get()._autoSaveTimer);
    set({
      doc: null,
      isDirty: false,
      isLoading: true,
      notFound: false,
      loadError: null,
      _vaultPath: null,
      _projectId: null,
      _filename: null,
      _autoSaveTimer: null,
      _pendingSave: null,
    });
  },

  /** Mutasi dokumen + tandai dirty + jadwalkan autosave. */
  _edit: (mutator) => {
    const { doc, _vaultPath, _projectId, _filename } = get();
    if (!doc) return;
    set({ doc: mutator(doc) });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  setSectionContent: (sectionId, content) => {
    get()._edit((doc) => ({
      ...doc,
      sections: doc.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, content: String(content ?? '') } : sec,
      ),
    }));
  },

  setSectionTitle: (sectionId, title) => {
    get()._edit((doc) => ({
      ...doc,
      sections: doc.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, title: String(title ?? '') } : sec,
      ),
    }));
  },

  addStory: (patch = {}) => {
    get()._edit((doc) => ({
      ...doc,
      stories: [
        ...doc.stories,
        {
          id: newStoryId(),
          actor: '',
          want: '',
          benefit: '',
          priority: 'should',
          status: 'todo',
          links: [],
          ...patch,
        },
      ],
    }));
  },

  updateStory: (storyId, patch) => {
    get()._edit((doc) => ({
      ...doc,
      stories: doc.stories.map((story) => {
        if (story.id !== storyId) return story;
        const next = { ...story, ...patch, id: story.id };
        if (!PRIORITIES.includes(next.priority)) next.priority = story.priority;
        if (!STATUSES.includes(next.status)) next.status = story.status;
        return next;
      }),
    }));
  },

  deleteStory: (storyId) => {
    get()._edit((doc) => ({
      ...doc,
      stories: doc.stories.filter((story) => story.id !== storyId),
    }));
  },

  /** Geser cerita satu posisi; di luar batas diabaikan. */
  moveStory: (storyId, direction) => {
    get()._edit((doc) => {
      const from = doc.stories.findIndex((story) => story.id === storyId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= doc.stories.length) return doc;
      const stories = [...doc.stories];
      [stories[from], stories[to]] = [stories[to], stories[from]];
      return { ...doc, stories };
    });
  },

  setStoryLinks: (storyId, links) => {
    const clean = (Array.isArray(links) ? links : [])
      .filter((l) => l && l.diagramFile)
      .map((l) => ({
        diagramFile: l.diagramFile,
        diagramType: l.diagramType || '',
        ...(l.note ? { note: l.note } : {}),
      }));
    get().updateStory(storyId, { links: clean });
  },
}));
