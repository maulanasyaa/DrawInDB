import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useVaultStore } from "../store/vaultStore";
import { useToastStore } from "../store/toastStore";
import ConfirmDialog from "../components/ConfirmDialog";
import { collectRecentWork } from "../utils/recentWork";
import { DIAGRAM_TYPE_LIST, getDiagramType } from "../config/diagramTypes";
import { FiPlus, FiTrash2, FiChevronRight } from "react-icons/fi";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const timeAgo = (iso) => {
  const dt = DateTime.fromISO(iso || "");
  return dt.isValid ? dt.toRelative() : "";
};

// Dua tabel dan satu relasi. Menggambar sekali saat mount, lalu diam.
function SchemaSketch() {
  const shape = { pathLength: 1 };
  return (
    <svg
      width="260"
      height="96"
      viewBox="0 0 260 96"
      fill="none"
      aria-hidden="true"
      className="sketch-draw text-muted"
    >
      <g stroke="currentColor" strokeWidth="1">
        <rect {...shape} x="3.5" y="8.5" width="86" height="62" />
        <line {...shape} x1="3.5" y1="24.5" x2="89.5" y2="24.5" />
        <line {...shape} x1="12" y1="36.5" x2="60" y2="36.5" opacity=".45" />
        <line {...shape} x1="12" y1="46.5" x2="70" y2="46.5" opacity=".45" />
        <line {...shape} x1="12" y1="56.5" x2="54" y2="56.5" opacity=".45" />
        <line {...shape} x1="89.5" y1="40" x2="124" y2="40" />
        <line {...shape} x1="124" y1="40" x2="124" y2="58" />
        <line {...shape} x1="124" y1="58" x2="160.5" y2="58" />
        <rect {...shape} x="160.5" y="24.5" width="86" height="62" />
        <line {...shape} x1="160.5" y1="40.5" x2="246.5" y2="40.5" />
        <line {...shape} x1="169" y1="52.5" x2="217" y2="52.5" opacity=".45" />
        <line {...shape} x1="169" y1="62.5" x2="227" y2="62.5" opacity=".45" />
        <line {...shape} x1="169" y1="72.5" x2="211" y2="72.5" opacity=".45" />
      </g>
      <g fill="currentColor" fontFamily="var(--font-mono)" fontSize="9">
        <text x="95" y="34">1</text>
        <text x="129" y="52">*</text>
      </g>
    </svg>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 text-primary">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {[
          [0.5, 0.5],
          [9.5, 0.5],
          [0.5, 9.5],
          [9.5, 9.5],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" stroke="currentColor" />
        ))}
      </svg>
      <span className="text-sm font-semibold tracking-tight">DrawInDB</span>
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const handleCreate = () => name.trim() && onCreate(name.trim());

  return createPortal(
    <div className="fixed inset-0 bg-base/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="bg-surface border border-theme rounded-2xl w-full max-w-md p-10 shadow-2xl animate-pop-in flex flex-col gap-6"
      >
        <div>
          <h2 id="new-project-title" className="font-display section-title text-primary mb-2">
            New Project
          </h2>
          <p className="text-secondary font-light">
            A project groups the diagrams for one system.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="project-name" className="text-sm font-medium text-primary">
            Project Name
          </label>
          <input
            id="project-name"
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
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
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

/** Label tipe untuk satu item riwayat. */
function itemLabel(item) {
  if (item.kind === "document") return "PRD";
  const badge = getDiagramType(item.type).badge;
  return item.dbType ? `${badge} · ${item.dbType}` : badge;
}

/** Kartu kecil di rail Continue: satu diagram atau dokumen. */
function RecentTile({ item }) {
  const to =
    item.kind === "document"
      ? `/project/${item.projectId}/doc/${item.filename}`
      : `/editor/${item.projectId}/${item.filename}`;

  return (
    <Link
      to={to}
      className="group shrink-0 w-52 h-24 rounded-2xl border border-theme bg-surface p-4 flex flex-col justify-between transition-colors hover:border-focus hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="font-mono text-[10px] text-muted">{itemLabel(item)}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-primary" title={item.name}>
          {item.name}
        </span>
        <span className="block truncate text-xs text-muted">
          {item.projectName} · {timeAgo(item.updatedAt)}
        </span>
      </span>
    </Link>
  );
}

/** Kartu besar di grid Projects: satu project. */
function ProjectCard({ project, onDelete }) {
  const diagrams = project.diagrams?.length || 0;
  const documents = project.documents || [];
  const uniqueTypes = [...new Set((project.diagrams || []).map((d) => d.type))];
  const typeOrder = Object.fromEntries(DIAGRAM_TYPE_LIST.map((t, i) => [t.id, i]));
  const sortedTypes = uniqueTypes.sort((a, b) => (typeOrder[a] ?? 99) - (typeOrder[b] ?? 99));

  return (
    <div className="group relative">
      <Link
        to={`/project/${project.id}`}
        className="premium-card p-6 h-44 flex flex-col justify-between hover-lift active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-all"
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
          {sortedTypes.map((type) => (
            <span
              key={type}
              className="whitespace-nowrap shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded border border-theme bg-base text-muted"
            >
              {getDiagramType(type).badge}
            </span>
          ))}
        </div>

        <div className="min-w-0">
          <h3 className="font-display text-lg font-medium text-primary truncate" title={project.name}>
            {project.name}
          </h3>
          <p className="mt-1 text-xs text-muted tabular-nums">
            {diagrams === 0 ? "no diagrams yet" : plural(diagrams, "diagram", "diagrams")}
            {documents.length > 0 && ` · ${plural(documents.length, "document", "documents")}`}
            {project.updatedAt && ` · ${timeAgo(project.updatedAt)}`}
          </p>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => onDelete(project)}
        aria-label={`Delete project ${project.name}`}
        title="Delete project"
        className="absolute top-4 right-4 text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger transition-colors rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <FiTrash2 className="text-base" />
      </button>
    </div>
  );
}

function Landing({ isLoading, error, onOpen, onCreate }) {
  const recentVaults = useVaultStore((state) => state.recentVaults);
  const openVault = useVaultStore((state) => state.openVault);

  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex-1 min-h-0 overflow-y-auto"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb orb-lavender w-[800px] h-[800px] -top-96 -left-64 mix-blend-multiply" />
        <div className="orb orb-peach w-[600px] h-[600px] top-[55%] right-[-200px] mix-blend-multiply" />
      </div>

      <div className="absolute top-8 left-8 z-10">
        <Brand />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto px-8 py-24 flex flex-col items-center">
        <div className="text-center mb-14 flex flex-col items-center">
          <SchemaSketch />
          <h1 className="font-display hero-title text-primary mt-8 mb-6 text-balance">
            Choose your workspace.
          </h1>
          <p className="text-secondary text-lg max-w-lg mx-auto font-light leading-relaxed">
            Select a local vault to continue your database design workflow.
            Your data remains strictly on your machine.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-4 max-w-md">
          <button
            type="button"
            onClick={onOpen}
            disabled={isLoading}
            className="btn-primary flex-1 py-4 text-base shadow-xl shadow-accent/10 hover-lift active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Opening…" : "Open Folder"}
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={isLoading}
            className="btn-secondary flex-1 py-4 text-base bg-surface hover-lift active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Vault
          </button>
        </div>

        <p className="text-xs text-muted mb-16">
          A vault is any folder that contains a .drawindb directory.
        </p>

        {error && (
          <p role="alert" className="mb-10 text-sm text-danger">
            {error}
          </p>
        )}

        {recentVaults.length > 0 && (
          <div className="w-full max-w-2xl bg-surface border border-theme rounded-[24px] p-8 shadow-2xl shadow-black/[0.02]">
            <h2 className="font-display text-xl text-primary tracking-tight mb-6">
              Recent Vaults
            </h2>

            <div className="flex flex-col gap-1">
              {recentVaults.map((vault) => (
                <button
                  key={vault.path}
                  type="button"
                  onClick={() => openVault(vault.path)}
                  className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-colors group"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-primary group-hover:text-accent transition-colors">
                      {vault.name}
                    </span>
                    <span
                      className="block truncate font-mono text-[11px] text-muted mt-0.5"
                      title={vault.path}
                    >
                      {vault.path}
                    </span>
                  </span>
                  <FiChevronRight className="shrink-0 text-muted group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function VaultView({ vault, onSwitch, onNewProject, onDelete, error }) {
  const items = collectRecentWork(vault);
  const totals = (vault.projects || []).reduce(
    (acc, p) => ({
      diagrams: acc.diagrams + (p.diagrams?.length || 0),
      documents: acc.documents + (p.documents?.length || 0),
    }),
    { diagrams: 0, documents: 0 },
  );
  const projectCount = vault.projects?.length || 0;

  return (
    <motion.div
      key="vault"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 min-h-0 overflow-y-auto"
    >
      <div className="w-full max-w-5xl mx-auto px-10 py-12">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="mb-4">
              <Brand />
            </div>
            <h1 className="font-display section-title text-primary truncate">{vault.name}</h1>
            <p className="mt-2 text-sm text-muted tabular-nums">
              {plural(totals.diagrams, "diagram", "diagrams")} ·{" "}
              {plural(totals.documents, "document", "documents")} ·{" "}
              {plural(projectCount, "project", "projects")}
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitch}
            className="btn-secondary shrink-0 text-xs py-2 px-4"
          >
            Switch vault
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {items.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-xl text-primary mb-4">Continue</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {items.map((item) => (
                <RecentTile key={`${item.kind}-${item.projectId}-${item.filename}`} item={item} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-14">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="font-display text-xl text-primary">Projects</h2>
            <button type="button" onClick={onNewProject} className="btn-primary py-2 px-5 text-sm hover-lift">
              <FiPlus className="inline -mt-0.5 mr-1.5" />
              New project
            </button>
          </div>

          {projectCount === 0 ? (
            <div className="premium-card p-12 text-center">
              <p className="text-secondary font-light">
                Empty vault. A project groups the diagrams for one system.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vault.projects.map((project) => (
                <ProjectCard key={project.id} project={project} onDelete={onDelete} />
              ))}
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

function Home() {
  const navigate = useNavigate();
  const {
    currentVault,
    loadRecentVaults,
    openVault,
    createVault,
    closeVault,
    createProject,
    deleteProject,
    isLoading,
    error,
  } = useVaultStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);

  useEffect(() => {
    loadRecentVaults();
  }, [loadRecentVaults]);

  const handleOpen = async () => {
    if (!window.api) return;
    const paths = await window.api.openFolder();
    if (paths?.length) openVault(paths[0]);
  };

  const handleCreateVault = async () => {
    if (!window.api) return;
    const paths = await window.api.openFolder();
    if (paths?.length) createVault(paths[0]);
  };

  const handleCreateProject = async (name) => {
    try {
      const projectId = await createProject(name);
      setIsModalOpen(false);
      navigate(`/project/${projectId}`);
    } catch (err) {
      useToastStore.getState().error(`Failed to create project: ${err.message}`);
    }
  };

  const confirmDeleteProject = async () => {
    const target = deletingProject;
    setDeletingProject(null);
    try {
      await deleteProject(target.id);
      useToastStore.getState().success(`Deleted "${target.name}"`);
    } catch (err) {
      useToastStore.getState().error(`Failed to delete: ${err.message}`);
    }
  };

  const vaultError = error?.includes("Not a valid DrawInDB vault")
    ? "That folder isn't a vault yet. Use Create Vault to make one here."
    : error;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-base">
      <AnimatePresence mode="wait">
        {currentVault ? (
          <VaultView
            key="vault"
            vault={currentVault}
            error={vaultError}
            onSwitch={closeVault}
            onNewProject={() => setIsModalOpen(true)}
            onDelete={setDeletingProject}
          />
        ) : (
          <Landing
            key="landing"
            isLoading={isLoading}
            error={vaultError}
            onOpen={handleOpen}
            onCreate={handleCreateVault}
          />
        )}
      </AnimatePresence>

      {deletingProject && (
        <ConfirmDialog
          title="Delete Project"
          message={`"${deletingProject.name}" contains ${plural(
            (deletingProject.diagrams || []).length,
            "diagram",
            "diagrams",
          )} and ${plural(
            (deletingProject.documents || []).length,
            "document",
            "documents",
          )}. Everything moves to the OS Trash.`}
          confirmLabel="Delete Project"
          requiredText={
            (deletingProject.diagrams?.length || 0) + (deletingProject.documents?.length || 0) === 0
              ? undefined
              : deletingProject.name
          }
          inputPlaceholder={`Type "${deletingProject.name}" to confirm`}
          onConfirm={confirmDeleteProject}
          onCancel={() => setDeletingProject(null)}
        />
      )}

      {isModalOpen && (
        <NewProjectModal onClose={() => setIsModalOpen(false)} onCreate={handleCreateProject} />
      )}
    </div>
  );
}

export default Home;
