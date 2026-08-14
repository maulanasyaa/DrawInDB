import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useVaultStore } from "../store/vaultStore";
import EmptyState from "../components/EmptyState";
import {
  FiArrowRight,
  FiPlus,
  FiArrowLeft,
  FiEdit2,
  FiCheck,
  FiX as FiClose,
} from "react-icons/fi";

const DB_TYPES = [
  { id: "mysql", name: "MySQL" },
  { id: "postgresql", name: "PostgreSQL" },
  { id: "sqlite", name: "SQLite" },
  { id: "generic", name: "Generic" },
];

// Registry label per diagram type — sumber tunggal
const TYPE_LABELS = {
  erd: { singular: "ERD", plural: "ERDs", placeholder: "Auth Schema" },
  flowchart: {
    singular: "Flowchart",
    plural: "Flowcharts",
    placeholder: "Login Flow",
  },
  usecase: {
    singular: "Use Case Diagram",
    plural: "Use Case Diagrams",
    placeholder: "Booking System",
  },
};

function getTypeLabel(type) {
  return (
    TYPE_LABELS[type] || {
      singular: type,
      plural: `${type}s`,
      placeholder: "Diagram",
    }
  );
}

function NewDiagramModal({ type, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [dbType, setDbType] = useState("mysql");
  const labels = getTypeLabel(type);

  const handleCreate = () => {
    if (name.trim()) onCreate(name.trim(), type === "erd" ? dbType : null);
  };

  return createPortal(
    <div className="fixed inset-0 bg-base/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-theme rounded-2xl w-full max-w-md p-10 shadow-2xl animate-pop-in flex flex-col gap-6">
        <div>
          <h2 className="font-display section-title text-primary mb-2">
            New {labels.singular}
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
            placeholder={`e.g. ${labels.placeholder}`}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        {type === "erd" && (
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State untuk rename inline
  const [renamingFilename, setRenamingFilename] = useState(null);
  const [renameValue, setRenameValue] = useState("");

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
  if (!TYPE_LABELS[type]) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        Unknown diagram type: {type}
      </div>
    );
  }

  const labels = getTypeLabel(type);
  const diagrams = project.diagrams?.filter((d) => d.type === type) || [];

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
            <span className="text-primary">{labels.plural}</span>
          </div>
          <h1 className="font-display section-title text-primary">
            {labels.singular} Workspace
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
                  New {labels.singular}
                </h3>
                <p className="text-xs text-secondary font-light">
                  Create a blank canvas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="z-10 relative">
          <h2 className="font-display subsection-title text-primary mb-6">
            Your {labels.plural}
          </h2>
          {diagrams.length === 0 ? (
            <div className="premium-card p-16 flex items-center justify-center min-h-[200px]">
              <EmptyState
                title={`No ${labels.plural} yet`}
                description="Start by creating one above."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {diagrams.map((diagram) => {
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
                    {/* Tombol Edit — muncul saat hover, hanya kalau tidak sedang rename */}
                    {!isRenaming && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(diagram);
                        }}
                        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10"
                        title="Rename diagram"
                      >
                        <FiEdit2 className="text-xs" />
                      </button>
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
    </div>
  );
}
