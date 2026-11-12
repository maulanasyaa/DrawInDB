import React from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

/**
 * Tombol toggle sidebar (minimize/maksimalkan). Dipasang di header tiap
 * sidebar. Ikon berubah sesuai state: PanelLeft saat terbuka, PanelRight
 * saat diminimalin.
 */
export default function SidebarToggle() {
  const isSidebarOpen = useEditorStore((state) => state.isSidebarOpen);
  const toggleSidebar = useEditorStore((state) => state.toggleSidebar);

  const Icon = isSidebarOpen ? PanelLeft : PanelRight;

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-pressed={isSidebarOpen}
      title="Toggle Sidebar (Ctrl/Cmd+B)"
      aria-label="Toggle Sidebar"
      className="flex items-center justify-center w-7 h-7 rounded-md text-muted hover:text-primary hover:bg-surface-2 transition-colors"
    >
      <Icon size={15} />
    </button>
  );
}
