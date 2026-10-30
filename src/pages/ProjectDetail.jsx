import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useVaultStore } from "../store/vaultStore";
import { FiArrowLeft } from "react-icons/fi";
import { DIAGRAM_TYPE_LIST } from "../config/diagramTypes";

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

  return (
    <div className="h-full w-full relative overflow-hidden bg-base">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl mx-auto px-10 py-12 h-full flex flex-col relative z-10"
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
      </motion.div>
    </div>
  );
}
