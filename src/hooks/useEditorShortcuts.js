import { useHotkeys } from 'react-hotkeys-hook';
import { useEditorStore } from '../store/editorStore';

/**
 * Shortcut undo/redo di editor.
 * - Cmd/Ctrl+Z : undo
 * - Cmd/Ctrl+Shift+Z dan Ctrl+Y : redo
 *
 * `enableOnFormTags: false` (default) membuat shortcut mati saat fokus di
 * input/textarea/select, supaya undo native browser di dalam input tetap jalan.
 */
export function useEditorShortcuts() {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  useHotkeys('mod+z, ctrl+z', (e) => {
    e.preventDefault();
    undo();
  });

  useHotkeys('mod+shift+z, ctrl+shift+z, ctrl+y', (e) => {
    e.preventDefault();
    redo();
  });
}
