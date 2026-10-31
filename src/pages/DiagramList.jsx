import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useVaultStore } from "../store/vaultStore";
import { useToastStore } from "../store/toastStore";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { getDiagramType, DIAGRAM_TYPES } from "../config/diagramTypes";
import {
  FiArrowRight,
  FiPlus,
  FiArrowLeft,
  FiEdit2,
  FiCheck,
  FiCopy,
  FiTrash2,
  FiSearch,
  FiX as FiClose,
} from "react-icons/fi";
import { filterDiagrams } from "../utils/diagramFilter";

const DB_TYPES = [
  { id: "mysql", name: "MySQL" },
  { id: "postgresql", name: "PostgreSQL" },
  { id: "sqlite", name: "SQLite" },
  { id: "generic", name: "Generic" },
];

function NewDiagramModal({ type, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [dbType, setDbType] = useState("mysql");
  const diagramType = getDiagramType(type);

  const handleCreate = () => {
    if (name.trim()) onCreate(name.trim(), diagramType.hasDbType ? dbType : null);
  };

  return createPortal(
    <div className="fixed inset-0 bg-base/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-theme rounded-2xl w-full max-w-md p-10 shadow-2xl animate-pop-in flex flex-col gap-6">
        <div>
          <h2 className="font-display section-title text-primary mb-2">
            New {diagramType.label}
          </h2>
          <p className="text-secondary font-light">
            Create a new diagram in this project.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-primary">
            Diagram Name
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-base border border-theme rounded-lg px-4 py-3 text-primary focus:outline-none focus:border-focus transition-all"
            placeholder={`e.g. ${diagramType.placeholder}`}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        {diagramType.hasDbType && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-primary">
              Database Engine
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DB_TYPES.map((db) => (
                <button
                  key={db.id}
                  onClick={() => setDbType(db.id)}
                  className={`p-3 border rounded-lg text-sm text-left transition-all ${
                    dbType === db.id
                      ? "border-primary ring-1 ring-primary bg-surface"
                      : "border-theme bg-base hover:border-focus"
                  }`}
                >
                  {db.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-theme/50">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="btn-primary disabled:opacity-50 hover-lift"
          >
            Create Diagram
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function DiagramList() {
  const { projectId, type } = useParams();
  const navigate = useNavigate();
  const currentVault = useVaultStore((state) => state.currentVault);
  const createDiagram = useVaultStore((state) => state.createDiagram);
  const renameDiagram = useVaultStore((state) => state.renameDiagram);
  const deleteDiagram = useVaultStore((state) => state.deleteDiagram);
  const duplicateDiagram = useVaultStore((state) => state.duplicateDiagram);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingDiagram, setDeletingDiagram] = useState(null);

  // State untuk rename inline
  const [renamingFilename, setRenamingFilename] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // Filter client-side; tidak dipersist.
  const [search, setSearch] = useState("");

  const startRename = (diagram) => {
    setRenamingFilename(diagram.filename);
    setRenameValue(diagram.name);
  };

  const cancelRename = () => {
    setRenamingFilename(null);
    setRenameValue("");
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !renamingFilename) {
      cancelRename();
      return;
    }

    // Kalau nama tidak berubah, batal saja
    const original = project.diagrams?.find(
      (d) => d.filename === renamingFilename,
    );
    if (original && original.name === trimmed) {
      cancelRename();
      return;
    }

    try {
      await renameDiagram(projectId, renamingFilename, trimmed);
    } catch (err) {
      alert("Failed to rename: " + err.message);
    } finally {
      cancelRename();
    }
  };

  const project = currentVault?.projects?.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        Project not found.
      </div>
    );
  }

  // Fail-safe: kalau type tidak dikenal, redirect balik
  if (!DIAGRAM_TYPES[type]) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        Unknown diagram type: {type}
      </div>
    );
  }

  const diagramType = getDiagramType(type);
  const diagrams = project.diagrams?.filter((d) => d.type === type) || [];
  const visible = filterDiagrams(diagrams, search);

  const confirmDeleteDiagram = async () => {
    const target = deletingDiagram;
    setDeletingDiagram(null);
    try {
      await deleteDiagram(projectId, target.filename);
      useToastStore.getState().success(`Deleted "${target.name}"`);
    } catch (err) {
      useToastStore.getState().error(`Failed to delete: ${err.message}`);
    }
  };

  const handleDuplicateDiagram = async (diagram) => {
    try {
      const filename = await duplicateDiagram(projectId, diagram.filename);
      useToastStore.getState().success(`Duplicated "${diagram.name}"`);
      navigate(`/editor/${projectId}/${filename}`);
    } catch (err) {
      useToastStore.getState().error(`Failed to duplicate: ${err.message}`);
    }
  };

  const handleCreateDiagram = async (name, dbType) => {
    try {
      const filename = await createDiagram(projectId, name, type, dbType);
      setIsModalOpen(false);
      navigate(`/editor/${projectId}/${filename}`);
    } catch (err) {
      alert("Failed to create diagram: " + err.message);
    }
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-base">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-7xl mx-auto px-10 py-12 h-full flex flex-col relative"
      >
        <div className="flex flex-col mb-16">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-1">
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <FiArrowLeft className="text-sm mr-1" /> Back
            </button>
            <span className="opacity-30">/</span>
            <span className="text-secondary opacity-80">
              {currentVault.name}
            </span>
            <span className="opacity-30">/</span>
            <span className="text-secondary opacity-80">{project.name}</span>
            <span className="opacity-30">/</span>
            <span className="text-primary">{diagramType.labelPlural}</span>
          </div>
          <h1 className="font-display section-title text-primary">
            {diagramType.label} Workspace
          </h1>
        </div>

        <div className="z-10 relative mb-16">
          <h2 className="font-display subsection-title text-primary mb-6">
            Quick Start
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => setIsModalOpen(true)}
              className="group premium-card p-6 cursor-pointer hover-lift flex items-center gap-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent text-canvas flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
                <FiPlus />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-primary">
                  New {diagramType.label}
                </h3>
                <p className="text-xs text-secondary font-light">
                  Create a blank canvas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="z-10 relative">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="font-display subsection-title text-primary">
              Your {diagramType.labelPlural}
            </h2>
            <div className="relative shrink-0">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setSearch("")}
                placeholder="Search diagrams…"
                aria-label="Search diagrams"
                className="w-56 bg-base border border-theme rounded-lg pl-9 pr-9 py-2 text-sm text-primary focus:outline-none focus:border-focus transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-primary rounded-md"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <FiClose className="text-sm" />
                </button>
              )}
            </div>
          </div>
          {diagrams.length === 0 ? (
            <div className="premium-card p-16 flex items-center justify-center min-h-[200px]">
              <EmptyState
                title={`No ${diagramType.labelPlural} yet`}
                description="Start by creating one above."
              />
            </div>
          ) : visible.length === 0 ? (
            <div className="premium-card p-16 flex items-center justify-center min-h-[200px]">
              <EmptyState
                title="Tidak ada diagram yang cocok"
                description={`Tidak ada diagram yang cocok dengan "${search}".`}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {visible.map((diagram) => {
                const isRenaming = renamingFilename === diagram.filename;

                return (
                  <div
                    key={diagram.filename}
                    onClick={() => {
                      if (isRenaming) return;
                      navigate(`/editor/${projectId}/${diagram.filename}`);
                    }}
                    className={`group premium-card p-6 hover-lift flex flex-col h-40 justify-between relative ${
                      isRenaming
                        ? "cursor-default ring-1 ring-focus"
                        : "cursor-pointer"
                    }`}
                  >
                    {/* Aksi kartu — muncul saat hover, hanya kalau tidak sedang rename */}
                    {!isRenaming && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(diagram);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 rounded-md"
                          title="Rename diagram"
                          aria-label="Rename diagram"
                        >
                          <FiEdit2 className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateDiagram(diagram);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 rounded-md"
                          title="Duplicate diagram"
                          aria-label="Duplicate diagram"
                        >
                          <FiCopy className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingDiagram(diagram);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 rounded-md"
                          title="Delete diagram"
                          aria-label="Delete diagram"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    )}

                    <div>
                      {diagram.db_type && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full border border-theme uppercase font-semibold bg-surface-2 text-primary mb-3 inline-block">
                          {diagram.db_type}
                        </span>
                      )}

                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") commitRename();
                              else if (e.key === "Escape") cancelRename();
                            }}
                            className="flex-1 min-w-0 bg-base border border-focus rounded-md px-2 py-1 text-lg font-display text-primary outline-none"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              commitRename();
                            }}
                            className="w-7 h-7 flex items-center justify-center text-success hover:bg-success/10 rounded-md transition-colors shrink-0"
                            title="Save"
                          >
                            <FiCheck />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelRename();
                            }}
                            className="w-7 h-7 flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors shrink-0"
                            title="Cancel"
                          >
                            <FiClose />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-display text-lg text-primary line-clamp-1">
                          {diagram.name}
                        </h3>
                      )}
                    </div>
                    <div className="text-xs text-muted font-light flex justify-between items-center mt-auto">
                      {DateTime.fromISO(diagram.updated_at).toRelative()}
                      {!isRenaming && (
                        <FiArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity text-accent text-lg" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
      {isModalOpen && (
        <NewDiagramModal
          type={type}
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreateDiagram}
        />
      )}

      {deletingDiagram && (
        <ConfirmDialog
          title="Delete Diagram"
          message={`Move "${deletingDiagram.name}" to the Trash? You can restore it from your OS Trash.`}
          confirmLabel="Delete"
          onConfirm={confirmDeleteDiagram}
          onCancel={() => setDeletingDiagram(null)}
        />
      )}
    </div>
  );
}
