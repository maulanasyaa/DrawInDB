import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useEditorStore } from '../store/editorStore';

export function useEditorShortcuts({ onToggleSidebar, onEscape }) {
  const forceSave = useEditorStore(state => state.forceSave);
  const addTable = useEditorStore(state => state.addTable);
  const deleteTable = useEditorStore(state => state.deleteTable);
  const duplicateTable = useEditorStore(state => state.duplicateTable);
  const selectedTableId = useEditorStore(state => state.selectedTableId);

  // Save
  useHotkeys('mod+s', (e) => {
    e.preventDefault();
    forceSave();
  }, { enableOnFormTags: true });

  // Sidebar toggle
  useHotkeys('mod+\\', (e) => {
    e.preventDefault();
    if (onToggleSidebar) onToggleSidebar();
  });

  // Duplicate Table
  useHotkeys('mod+d', (e) => {
    e.preventDefault();
    if (selectedTableId) duplicateTable(selectedTableId);
  }, [selectedTableId]);

  // Delete Table
  useHotkeys('delete, backspace', (e) => {
    // Only if not focused on an input
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
      if (selectedTableId) {
        e.preventDefault();
        deleteTable(selectedTableId);
      }
    }
  }, [selectedTableId]);

  // Escape (Deselect)
  useHotkeys('esc', () => {
    if (onEscape) onEscape();
  }, { enableOnFormTags: true });

  // Note: Undo/Redo are complex in Zustand without middleware, skipping for MVP shortcut bindings.
  // Zoom shortcuts are typically handled by React Flow natively, but we can bind them if needed.
}
