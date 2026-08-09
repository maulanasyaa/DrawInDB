import React from "react";
import { useVaultStore } from "../store/vaultStore";
import { FiArrowLeft } from "react-icons/fi";

export default function VaultHeader() {
  const currentVault = useVaultStore((state) => state.currentVault);

  if (!currentVault) return null;

  // Menghitung total seluruh diagram dari semua project secara aman
  const totalDiagrams =
    currentVault.projects?.reduce((total, project) => {
      return total + (project.diagrams?.length || 0);
    }, 0) || 0;

  return (
    <div className="flex items-center justify-between mb-16 z-10 relative">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-1">
          <span>Vaults</span>
          <span className="opacity-30">/</span>
          <span className="text-primary">WORKSPACE</span>
        </div>
        <h1 className="font-display section-title text-primary">
          {currentVault.name}
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-lg font-display font-bold text-primary leading-none">
            {totalDiagrams}
          </span>
          <span className="text-[9px] font-bold text-muted uppercase tracking-widest mt-1">
            Diagrams
          </span>
        </div>
        <button
          onClick={() => useVaultStore.setState({ currentVault: null })}
          className="w-10 h-10 rounded-full border border-theme flex items-center justify-center text-muted hover:text-primary hover:border-focus hover:bg-surface transition-all active:scale-95"
        >
          <FiArrowLeft />
        </button>
      </div>
    </div>
  );
}
