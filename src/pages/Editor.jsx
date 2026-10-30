import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import { AnimatePresence } from "framer-motion";

import { useVaultStore } from "../store/vaultStore";
import { useEditorStore } from "../store/editorStore";
import { getEditorConfig } from "../config/editorTypes.jsx";

import EditorHeader from "../components/editor/EditorHeader";
import ReactFlowCanvas from "../components/editor/ReactFlowCanvas";
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

  const editorConfig = getEditorConfig(diagramMeta?.type);
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
      store.flush().finally(() => useEditorStore.getState().cleanup());
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
      <EditorHeader />

      <div className="flex-1 relative flex">
        {renderSidebar()}

        {EditorOverlay && <EditorOverlay />}

        {editorConfig.tips}

        {Canvas ? <Canvas /> : <ReactFlowCanvas editorConfig={editorConfig} />}
      </div>
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
