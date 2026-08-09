import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useVaultStore } from "../store/vaultStore";
import { FiDatabase, FiGitBranch, FiArrowLeft } from "react-icons/fi";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const currentVault = useVaultStore((state) => state.currentVault);

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

  const renderCard = (title, type, description, icon) => {
    const diagramCount =
      project.diagrams?.filter((d) => d.type === type).length || 0;
    const status = `${diagramCount} ${diagramCount === 1 ? "diagram" : "diagrams"} created`;

    return (
      <div
        onClick={() => handleCardClick(type)}
        className="group premium-card p-8 cursor-pointer hover-lift active:scale-[0.98] transition-all flex flex-col h-full"
      >
        <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-theme text-primary flex items-center justify-center text-2xl shadow-sm group-hover:border-focus transition-all mb-6">
          {icon}
        </div>
        <h3 className="text-xl font-display font-semibold text-primary mb-2">
          {title}
        </h3>
        <p className="text-sm text-secondary font-light mb-8 flex-1 leading-relaxed">
          {description}
        </p>
        <div className="text-[10px] font-semibold text-muted uppercase tracking-widest pt-4 border-t border-theme/50">
          {status}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-base">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl mx-auto px-10 py-12 h-full flex flex-col relative z-10"
      >
        {/* Breadcrumb & Header */}
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

        {/* Diagram Type Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderCard(
            "ERD",
            "erd",
            "Design your database schema, establish relationships, and generate SQL.",
            <FiDatabase />,
          )}
          {renderCard(
            "Flowchart",
            "flowchart",
            "Map out process logic, decision flows, and algorithms step-by-step.",
            <FiGitBranch />,
          )}
        </div>
      </motion.div>
    </div>
  );
}
