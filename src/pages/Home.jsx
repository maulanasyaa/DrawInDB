import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useVaultStore } from "../store/vaultStore";
import VaultHeader from "../components/VaultHeader";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  FiArrowRight,
  FiPlus,
  FiUpload,
  FiFolder,
  FiChevronRight,
} from "react-icons/fi";

// Modal Internal untuk Create Project
function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim());
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-base/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-theme rounded-2xl w-full max-w-md p-10 shadow-2xl animate-pop-in flex flex-col gap-6">
        <div>
          <h2 className="font-display section-title text-primary mb-2">
            New Project
          </h2>
          <p className="text-secondary font-light">
            Create a new project workspace.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-primary">
            Project Name
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-base border border-theme rounded-lg px-4 py-3 text-primary focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus transition-all"
            placeholder="e.g. E-commerce Backend"
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
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Komponen Card untuk Project
function ProjectCard({ project, onClick }) {
  const timeAgo =
    DateTime.fromISO(project.updatedAt).toRelative() || "Just now";
  const diagramCount = project.diagrams?.length || 0;

  // Ambil tipe diagram unik yang ada di dalam project ini
  const uniqueTypes = [...new Set((project.diagrams || []).map((d) => d.type))];

  return (
    <div
      onClick={onClick}
      className="group relative premium-card p-6 cursor-pointer hover-lift active:scale-[0.98] flex flex-col h-48 justify-between transition-all"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-theme uppercase font-semibold tracking-wider bg-surface-2 text-primary">
            {diagramCount} {diagramCount === 1 ? "Diagram" : "Diagrams"}
          </span>
          <div className="flex gap-1">
            {uniqueTypes.map((type) => (
              <span
                key={type}
                className="text-[9px] px-1.5 py-0.5 rounded border border-theme uppercase font-bold tracking-widest bg-base text-muted"
              >
                {type === "erd" ? "ERD" : "FLOWCHART"}
              </span>
            ))}
          </div>
        </div>

        <h3
          className="font-display subsection-title text-primary line-clamp-2"
          title={project.name}
        >
          {project.name}
        </h3>
      </div>

      <div className="flex items-end justify-between mt-auto">
        <div className="text-sm text-muted font-light">{timeAgo}</div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-3 text-accent text-xl">
          <FiArrowRight />
        </div>
      </div>
    </div>
  );
}

// Main Home Component
function Home() {
  const navigate = useNavigate();
  const {
    currentVault,
    recentVaults,
    loadRecentVaults,
    openVault,
    createVault,
    createProject,
    isLoading,
    error,
  } = useVaultStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadRecentVaults();
  }, [loadRecentVaults]);

  const handleOpenFolder = async () => {
    if (!window.api) return;
    const paths = await window.api.openFolder();
    if (paths && paths.length > 0) {
      openVault(paths[0]);
    }
  };

  const handleCreateFolder = async () => {
    if (!window.api) return;
    const paths = await window.api.openFolder();
    if (paths && paths.length > 0) {
      createVault(paths[0]);
    }
  };

  const handleCreateProject = async (name) => {
    try {
      const projectId = await createProject(name);
      setIsModalOpen(false);
      navigate(`/project/${projectId}`);
    } catch (err) {
      alert("Failed to create project: " + err.message);
    }
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-base">
      <AnimatePresence mode="wait">
        {currentVault ? (
          <motion.div
            key="vault-open"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-7xl mx-auto px-10 py-12 h-full flex flex-col relative"
          >
            <div className="orb orb-sky w-[600px] h-[600px] -top-[300px] -right-[200px]" />

            <VaultHeader />

            {error && (
              <div className="bg-danger/10 text-danger border border-danger/30 p-4 rounded-xl mb-8 z-10 relative animate-fade-in">
                {error}
              </div>
            )}

            <div className="z-10 relative mb-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display subsection-title text-primary">
                  Quick Start
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="group premium-card p-8 cursor-pointer hover-lift active:scale-[0.98] transition-all flex items-center gap-6"
                >
                  <div className="w-14 h-14 rounded-2xl bg-accent text-canvas flex items-center justify-center text-2xl shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">
                    <FiPlus />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary mb-1">
                      Create New Project
                    </h3>
                    <p className="text-sm text-secondary font-light">
                      Start a new workspace for your diagrams.
                    </p>
                  </div>
                  <div className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all text-xl">
                    <FiArrowRight />
                  </div>
                </div>

                <div className="group premium-card p-8 cursor-pointer hover-lift active:scale-[0.98] transition-all flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-theme text-primary flex items-center justify-center text-2xl shadow-sm group-hover:border-focus transition-all">
                    <FiUpload />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary mb-1">
                      Import Project
                    </h3>
                    <p className="text-sm text-secondary font-light">
                      Upload an existing DrawInDB project folder.
                    </p>
                  </div>
                  <div className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all text-xl">
                    <FiArrowRight />
                  </div>
                </div>
              </div>
            </div>

            <div className="z-10 relative">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display subsection-title text-primary">
                  Projects
                </h2>
                <button className="text-xs font-semibold text-muted uppercase tracking-widest hover:text-primary transition-colors">
                  Sort by: Recent
                </button>
              </div>

              {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <LoadingSpinner text="Loading projects..." />
                </div>
              ) : currentVault.projects?.length === 0 ? (
                <div className="premium-card p-16 flex items-center justify-center min-h-[300px]">
                  <EmptyState
                    title="No projects in this vault"
                    description="Start your work by creating your first project using the Quick Start cards above."
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
                  {currentVault.projects?.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => navigate(`/project/${project.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {isModalOpen && (
              <NewProjectModal
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateProject}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="vault-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center min-h-screen px-8 relative"
          >
            <div className="orb orb-lavender w-[800px] h-[800px] -top-96 -left-64 mix-blend-multiply" />
            <div className="orb orb-peach w-[600px] h-[600px] bottom-0 right-[-200px] mix-blend-multiply" />

            <div className="w-full max-w-3xl flex flex-col items-center z-10 relative">
              <div className="text-center mb-16">
                <h1 className="font-display hero-title text-primary mb-6 text-balance">
                  Choose your workspace.
                </h1>
                <p className="text-secondary text-lg max-w-lg mx-auto font-light leading-relaxed">
                  Select a local vault to continue your database design
                  workflow. Your data remains strictly on your machine.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-24 max-w-md">
                <button
                  onClick={handleOpenFolder}
                  className="btn-primary flex-1 py-4 text-base shadow-xl shadow-accent/10 hover-lift active:scale-95"
                >
                  Open Folder
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="btn-secondary flex-1 py-4 text-base bg-surface hover-lift active:scale-95"
                >
                  Create Vault
                </button>
              </div>

              <div className="w-full max-w-2xl bg-surface border border-theme rounded-[24px] p-10 shadow-2xl shadow-black/[0.02]">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-display text-2xl text-primary tracking-tight">
                    Recent Vaults
                  </h2>
                  <button className="text-xs font-semibold text-muted uppercase tracking-widest hover:text-accent transition-colors">
                    View All
                  </button>
                </div>

                {isLoading ? (
                  <div className="py-12 flex justify-center">
                    <LoadingSpinner text="Refreshing..." />
                  </div>
                ) : recentVaults.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-theme rounded-2xl">
                    <p className="text-muted font-light text-sm italic">
                      No workspace history found.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentVaults.map((vault) => (
                      <div
                        key={vault.path}
                        onClick={() => openVault(vault.path)}
                        className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer hover:bg-base transition-all group active:scale-[0.99]"
                      >
                        <div className="w-12 h-12 rounded-xl bg-base border border-theme flex items-center justify-center text-muted group-hover:text-accent group-hover:border-focus transition-all text-xl">
                          <FiFolder />
                        </div>
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <span className="font-medium text-primary text-base group-hover:text-accent transition-colors">
                            {vault.name}
                          </span>
                          <span
                            className="text-xs text-muted truncate mt-0.5 font-light"
                            title={vault.path}
                          >
                            {vault.path}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-muted">
                          <span className="text-xs font-light opacity-60">
                            Local Workspace
                          </span>
                          <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Home;
