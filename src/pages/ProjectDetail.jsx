import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { DateTime } from "luxon";
import { useVaultStore } from "../store/vaultStore";
import { useToastStore } from "../store/toastStore";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import { FiArrowLeft, FiPlus, FiEdit2, FiCheck, FiFileText, FiTrash2 } from "react-icons/fi";
import { FiX as FiClose } from "react-icons/fi";
import { DIAGRAM_TYPE_LIST } from "../config/diagramTypes";

function NewPrdModal({ onClose, onCreate }) {
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (name.trim()) onCreate(name.trim());
  };

  return createPortal(
    <div className="fixed inset-0 bg-base/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-theme rounded-2xl w-full max-w-md p-10 shadow-2xl animate-pop-in flex flex-col gap-6">
        <div>
          <h2 className="font-display section-title text-primary mb-2">New PRD</h2>
          <p className="text-secondary font-light">
            Create a product requirements document in this project.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-primary">Document Name</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-base border border-theme rounded-lg px-4 py-3 text-primary focus:outline-none focus:border-focus transition-all"
            placeholder="e.g. Checkout Requirements"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-theme/50">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="btn-primary disabled:opacity-50 hover-lift"
          >
            Create PRD
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const currentVault = useVaultStore((state) => state.currentVault);
  const createDocument = useVaultStore((state) => state.createDocument);
  const renameDocument = useVaultStore((state) => state.renameDocument);
  const deleteDocument = useVaultStore((state) => state.deleteDocument);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [renamingFilename, setRenamingFilename] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingDoc, setDeletingDoc] = useState(null);

  const project = currentVault?.projects?.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-base text-muted">
        Project not found or vault is not loaded.
      </div>
    );
  }

  const handleCardClick = (type) => {
    navigate(`/project/${projectId}/${type}`);
  };

  const documents = project.documents ?? [];

  const handleCreatePrd = async (name) => {
    try {
      const filename = await createDocument(projectId, name);
      setIsModalOpen(false);
      navigate(`/project/${projectId}/doc/${filename}`);
    } catch (err) {
      alert("Failed to create document: " + err.message);
    }
  };

  const startRename = (doc) => {
    setRenamingFilename(doc.filename);
    setRenameValue(doc.name);
  };

  const cancelRename = () => {
    setRenamingFilename(null);
    setRenameValue("");
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    const original = documents.find((d) => d.filename === renamingFilename);
    if (!trimmed || !original || original.name === trimmed) {
      cancelRename();
      return;
    }
    try {
      await renameDocument(projectId, renamingFilename, trimmed);
    } catch (err) {
      alert("Failed to rename: " + err.message);
    } finally {
      cancelRename();
    }
  };

  const confirmDelete = async () => {
    const doc = deletingDoc;
    setDeletingDoc(null);
    try {
      await deleteDocument(projectId, doc.filename);
      useToastStore.getState().success(`Deleted "${doc.name}"`);
    } catch (err) {
      useToastStore.getState().error(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="h-full w-full relative overflow-y-auto bg-base">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl mx-auto px-10 py-12 min-h-full flex flex-col relative z-10"
      >
        <div className="flex flex-col mb-16">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-1">
                <button
                  onClick={() => navigate("/")}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <FiArrowLeft className="text-sm mr-1" /> Vaults
                </button>
                <span className="opacity-30">/</span>
                <span className="text-secondary opacity-80">
                  {currentVault.name}
                </span>
                <span className="opacity-30">/</span>
                <span className="text-primary">{project.name}</span>
              </div>
              <h1 className="font-display section-title text-primary">
                Select Diagram Type
              </h1>
            </div>
          </div>
        </div>

        {/* 5 tipe di registry: satu baris di layar lebar (xl), 3 kolom di
            menengah, 2 di tablet. Kartu lebih rapat supaya 5 muat tanpa overflow. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {DIAGRAM_TYPE_LIST.map((diagramType) => {
            const diagramCount =
              project.diagrams?.filter((d) => d.type === diagramType.id).length || 0;
            const status = `${diagramCount} ${diagramCount === 1 ? "diagram" : "diagrams"} created`;
            const Icon = diagramType.icon;

            return (
              <div
                key={diagramType.id}
                onClick={() => handleCardClick(diagramType.id)}
                className="group premium-card p-6 cursor-pointer hover-lift active:scale-[0.98] transition-all flex flex-col h-full"
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-theme text-primary flex items-center justify-center text-xl shadow-sm group-hover:border-focus transition-all mb-5">
                  <Icon />
                </div>
                <h3 className="text-lg font-display font-semibold text-primary mb-2">
                  {diagramType.label}
                </h3>
                <p className="text-sm text-secondary font-light mb-6 flex-1 leading-relaxed">
                  {diagramType.description}
                </p>
                <div className="text-[10px] font-semibold text-muted uppercase tracking-widest pt-4 border-t border-theme/50">
                  {status}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dokumen PRD. Bagian terpisah dari grid kartu diagram (yang tetap
            hanya berisi 5 tipe dari registry). */}
        <div className="mt-14 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display subsection-title text-primary">Documents</h2>
              <p className="text-sm text-secondary font-light">
                Product requirement documents for this project.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              <FiPlus /> New PRD
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="premium-card p-12 flex items-center justify-center min-h-[140px]">
              <EmptyState
                title="No documents yet"
                description="Create a PRD to capture requirements and user stories."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {documents.map((doc) => {
                const isRenaming = renamingFilename === doc.filename;
                const relative = doc.updated_at
                  ? DateTime.fromISO(doc.updated_at).toRelative()
                  : "just now";

                return (
                  <div
                    key={doc.filename}
                    onClick={() => {
                      if (isRenaming) return;
                      navigate(`/project/${projectId}/doc/${doc.filename}`);
                    }}
                    className={`group premium-card p-5 hover-lift flex flex-col h-36 justify-between relative ${
                      isRenaming ? "cursor-default ring-1 ring-focus" : "cursor-pointer"
                    }`}
                  >
                    {!isRenaming && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(doc);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 rounded-md"
                          title="Rename document"
                        >
                          <FiEdit2 className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingDoc(doc);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 rounded-md"
                          title="Delete document"
                          aria-label="Delete document"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FiFileText className="text-muted" />
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-theme bg-surface-2 text-primary uppercase tracking-widest select-none">
                          PRD
                        </span>
                      </div>

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
                            className="flex-1 min-w-0 bg-base border border-focus rounded-md px-2 py-1 text-base font-display text-primary outline-none"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              commitRename();
                            }}
                            className="w-7 h-7 flex items-center justify-center text-success hover:bg-success/10 rounded-md shrink-0"
                            title="Save"
                          >
                            <FiCheck />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelRename();
                            }}
                            className="w-7 h-7 flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 rounded-md shrink-0"
                            title="Cancel"
                          >
                            <FiClose />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-display text-lg text-primary line-clamp-2">
                          {doc.name}
                        </h3>
                      )}
                    </div>

                    <div className="text-xs text-muted font-light mt-auto">{relative}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {isModalOpen && (
        <NewPrdModal onClose={() => setIsModalOpen(false)} onCreate={handleCreatePrd} />
      )}

      {deletingDoc && (
        <ConfirmDialog
          title="Delete Document"
          message={`Move "${deletingDoc.name}" to the Trash? You can restore it from your OS Trash.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingDoc(null)}
        />
      )}
    </div>
  );
}
