import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiDownload, FiSave } from "react-icons/fi";
import { useVaultStore } from "../store/vaultStore";
import { useDocStore } from "../store/docStore";
import { docToMarkdown } from "../utils/prd";
import CopyButton from "../components/CopyButton";
import DocPreview from "../components/docs/DocPreview";
import DocSection from "../components/docs/DocSection";
import LoadingSpinner from "../components/LoadingSpinner";

const modeBtn = (active) =>
  `px-3 py-1 rounded-full transition-all ${
    active ? "bg-surface-2 text-primary" : "text-muted hover:text-primary"
  }`;

export default function DocEditor() {
  const { projectId, filename } = useParams();
  const navigate = useNavigate();
  const [previewAll, setPreviewAll] = useState(false);

  const vaultPath = useVaultStore((state) => state.currentVault?.path);
  const project = useVaultStore((state) =>
    state.currentVault?.projects?.find((p) => p.id === projectId),
  );

  const loadDoc = useDocStore((state) => state.loadDoc);
  const doc = useDocStore((state) => state.doc);
  const isDirty = useDocStore((state) => state.isDirty);
  const isLoading = useDocStore((state) => state.isLoading);
  const notFound = useDocStore((state) => state.notFound);
  const loadError = useDocStore((state) => state.loadError);

  useEffect(() => {
    if (!vaultPath) {
      navigate("/");
      return;
    }
    loadDoc(vaultPath, projectId, filename);
  }, [vaultPath, projectId, filename, navigate, loadDoc]);

  // Simpan sisa perubahan saat meninggalkan halaman (bukan dibuang seperti
  // editor diagram). `saveDoc` early-return kalau tidak dirty, jadi mount
  // ganda StrictMode tidak menulis dua kali.
  useEffect(() => () => useDocStore.getState().flush(), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        useDocStore.getState().flush();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Satu-satunya tempat markdown lengkap dibuat; dipakai Export .md dan Copy.
  const toMarkdown = () => docToMarkdown(doc, project?.diagrams || []);

  const handleExport = () => {
    if (!doc) return;
    const markdown = toMarkdown();
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(doc.meta.name || "prd").replace(/\s+/g, "_").toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base text-muted">
        <LoadingSpinner text="Loading document..." />
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-base">
        <p className="text-secondary font-light max-w-md text-center">
          {loadError ? `Could not open this document: ${loadError}` : "Document not found."}
        </p>
        <button onClick={() => navigate(`/project/${projectId}`)} className="btn-primary">
          Back to project
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-base overflow-hidden">
      <div className="h-14 border-b border-theme bg-surface flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-base rounded-md transition-colors"
            title="Back to project"
          >
            <FiArrowLeft />
          </button>

          <div className="flex items-center gap-3">
            <h1 className="font-display font-semibold text-primary">{doc.meta.name}</h1>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-theme bg-surface-2 text-primary uppercase tracking-widest select-none">
              PRD
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-[10px] font-medium text-warning animate-pulse select-none">
              Unsaved changes
            </span>
          )}

          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border border-theme rounded-full p-0.5">
            <button onClick={() => setPreviewAll(false)} className={modeBtn(!previewAll)}>
              Edit
            </button>
            <button onClick={() => setPreviewAll(true)} className={modeBtn(previewAll)}>
              Preview all
            </button>
          </div>

          <CopyButton text={toMarkdown()} title="Copy whole document as markdown" />

          <button
            onClick={handleExport}
            className="flex items-center gap-2 text-muted hover:text-primary px-3 py-1.5 transition-colors rounded-md hover:bg-surface-2 text-xs font-semibold"
            title="Export as Markdown"
          >
            <FiDownload className="text-sm" />
            <span>Export .md</span>
          </button>

          <button
            onClick={() => useDocStore.getState().flush()}
            disabled={!isDirty}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              isDirty
                ? "bg-primary text-canvas hover:bg-primary/90 hover-lift"
                : "bg-surface-2 text-muted cursor-not-allowed opacity-50"
            }`}
          >
            <FiSave />
            <span>Save</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {previewAll ? (
          <DocPreview doc={doc} project={project} />
        ) : (
          <div className="max-w-5xl mx-auto px-10 py-10 flex flex-col gap-6">
            {doc.sections.map((section) => (
              <DocSection key={section.id} section={section} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
