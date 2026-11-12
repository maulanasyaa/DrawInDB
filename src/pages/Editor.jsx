import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import { AnimatePresence } from "framer-motion";
import { FiChevronRight } from "react-icons/fi";

import { useVaultStore } from "../store/vaultStore";
import { useEditorStore } from "../store/editorStore";
import { getEditorConfig } from "../config/editorTypes.jsx";
import { getDiagramType } from "../config/diagramTypes";

import EditorHeader from "../components/editor/EditorHeader";
import ReactFlowCanvas from "../components/editor/ReactFlowCanvas";
import SQLPanel from "../components/editor/SQLPanel";
import LoadingSpinner from "../components/LoadingSpinner";
import { useEditorShortcuts } from "../hooks/useEditorShortcuts";

function EditorContent() {
  const { projectId, filename } = useParams();
  const navigate = useNavigate();

  useEditorShortcuts();

  const vaultPath = useVaultStore((state) => state.currentVault?.path);

  const loadDiagram = useEditorStore((state) => state.loadDiagram);
  const isLoading = useEditorStore((state) => state.isLoading);
  const diagramMeta = useEditorStore((state) => state.diagramMeta);
  const isSidebarOpen = useEditorStore((state) => state.isSidebarOpen);
  const toggleSidebar = useEditorStore((state) => state.toggleSidebar);

  // Panel preview SQL: murni UI, bukan state store — tidak masuk history/dirty.
  const [sqlPreviewOpen, setSqlPreviewOpen] = useState(false);

  const editorConfig = getEditorConfig(diagramMeta?.type);
  const typeConfig = getDiagramType(diagramMeta?.type);
  const EditorSidebar = editorConfig.sidebar;
  const EditorOverlay = editorConfig.overlays;
  // Tipe dengan kanvas sendiri (sequence) menyediakan komponen `canvas`;
  // lima tipe lain tetap memakai React Flow. Tidak ada cek nama tipe di sini.
  const Canvas = editorConfig.canvas;

  useEffect(() => {
    if (!vaultPath) {
      navigate("/");
      return;
    }
    loadDiagram(vaultPath, projectId, filename);
  }, [vaultPath, projectId, filename, navigate, loadDiagram]);

  // Cleanup on unmount or before loading new diagram. Perubahan <1500 ms
  // disimpan dulu (flush), bukan dibuang bersama timer autosave.
  useEffect(() => {
    return () => {
      const store = useEditorStore.getState();
      // Token dibaca SINKRON: di StrictMode cleanup mount pertama jalan lebih
      // dulu dari load kedua, dan `.finally` membuat cleanup() menjadi
      // microtask — tanpa guard, ia menghapus konteks simpan hasil load kedua.
      const token = store._loadToken;
      store.flush().finally(() => useEditorStore.getState().cleanup(token));
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-muted">
        <LoadingSpinner text="Loading workspace..." />
      </div>
    );
  }

  // AnimatePresence tidak boleh menerima anak `null`: `PopChildMeasure`
  // melempar "Element type is invalid ... got: null". Tipe tanpa sidebar
  // (config `sidebar` kosong) cukup tidak merender AnimatePresence sama sekali.
  const renderSidebar = () =>
    isSidebarOpen && EditorSidebar ? (
      <AnimatePresence>
        <EditorSidebar />
      </AnimatePresence>
    ) : null;

  return (
    <div className="flex flex-col h-screen w-full bg-canvas text-primary overflow-hidden relative">
      <EditorHeader
        sqlPreviewOpen={sqlPreviewOpen}
        onToggleSqlPreview={() => setSqlPreviewOpen((v) => !v)}
      />

      <div className="flex-1 min-h-0 relative flex">
        {renderSidebar()}

        {!isSidebarOpen && EditorSidebar && (
          <button
            onClick={toggleSidebar}
            title="Show Sidebar"
            aria-label="Show Sidebar"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-12 bg-surface border border-theme rounded-r-lg shadow-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 transition-colors"
          >
            <FiChevronRight />
          </button>
        )}

        {EditorOverlay && <EditorOverlay />}

        {editorConfig.tips}

        {Canvas ? <Canvas /> : <ReactFlowCanvas editorConfig={editorConfig} />}
      </div>

      {/* Dukungan preview SQL dibaca dari registry (`exports.sql`) — hanya ERD. */}
      {sqlPreviewOpen && typeConfig.exports.sql && (
        <SQLPanel onClose={() => setSqlPreviewOpen(false)} />
      )}
    </div>
  );
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <EditorContent />
    </ReactFlowProvider>
  );
}
