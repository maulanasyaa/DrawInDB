import { useHotkeys } from 'react-hotkeys-hook';
import { useEditorStore } from '../store/editorStore';

/**
 * Shortcut editor diagram.
 * - Cmd/Ctrl+Z : undo
 * - Cmd/Ctrl+Shift+Z dan Ctrl+Y : redo
 * - Cmd/Ctrl+S : simpan sekarang (flush autosave 1500 ms)
 *
 * Undo/redo memakai `enableOnFormTags: false` (default) supaya undo native
 * browser di dalam input tetap jalan. Cmd+S justru harus hidup saat fokus di
 * input — kalau tidak, menyimpan tepat setelah mengetik label tidak melakukan
 * apa pun.
 */
export function useEditorShortcuts() {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const flush = useEditorStore((state) => state.flush);

  useHotkeys('mod+z, ctrl+z', (e) => {
    e.preventDefault();
    undo();
  });

  useHotkeys('mod+shift+z, ctrl+shift+z, ctrl+y', (e) => {
    e.preventDefault();
    redo();
  });

  useHotkeys(
    'mod+s, ctrl+s',
    (e) => {
      e.preventDefault();
      flush();
    },
    { enableOnFormTags: ['input', 'textarea', 'select'] },
  );
}
