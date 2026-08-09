import React, { useState } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { FiArrowLeft } from 'react-icons/fi';

export default function VaultHeader({ onNewDiagram }) {
  const currentVault = useVaultStore((state) => state.currentVault);
  const closeVault = useVaultStore((state) => state.closeVault);
  const [isEditing, setIsEditing] = useState(false);
  const [vaultName, setVaultName] = useState('');

  if (!currentVault) return null;

  const handleStartEdit = () => {
    setVaultName(currentVault.name);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setIsEditing(false);
    if (vaultName.trim() && vaultName !== currentVault.name) {
      try {
        const configPath = await window.api.pathJoin(currentVault.path, '.drawindb', 'config.json');
        const configStr = await window.api.readFile(configPath);
        const config = JSON.parse(configStr);
        config.vault_name = vaultName.trim();
        await window.api.writeFile(configPath, JSON.stringify(config, null, 2));
        
        useVaultStore.setState({ 
          currentVault: { ...currentVault, name: vaultName.trim() } 
        });
      } catch (e) {
        console.error("Failed to rename vault", e);
      }
    }
  };
return (
  <div className="flex flex-col mb-16 z-10 relative">
    <div className="flex items-center justify-between group">
      <div className="flex flex-col gap-2">
        {/* Breadcrumb / Label */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-1">
          <button 
            onClick={closeVault}
            className="hover:text-primary transition-colors flex items-center gap-1.5"
          >
            Vaults
          </button>
          <span className="opacity-30">/</span>
          <span className="text-secondary opacity-80">Workspace</span>
        </div>

        <div className="flex items-center gap-4">
          {isEditing ? (
            <input 
              autoFocus
              className="font-display section-title text-primary bg-transparent border-b border-theme outline-none py-1"
              value={vaultName}
              onChange={e => setVaultName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
            />
          ) : (
            <h1 
              className="font-display section-title text-primary cursor-text hover:opacity-70 transition-opacity"
              onDoubleClick={handleStartEdit}
              title="Double click to rename"
            >
              {currentVault.name}
            </h1>
          )}
        </div>
      </div>

      {/* Right side Metadata */}
      <div className="flex items-center gap-6 self-end pb-2">
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-primary">{currentVault.diagrams.length}</span>
          <span className="text-[10px] font-medium text-muted uppercase tracking-widest">Diagrams</span>
        </div>
        <div className="h-8 w-px bg-theme opacity-50" />
        <button 
          onClick={closeVault}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-theme text-muted hover:text-primary hover:border-focus transition-all shadow-sm hover:shadow-md hover-lift active:scale-95"
          title="Switch Vault"
        >
          <FiArrowLeft />
        </button>
      </div>
    </div>
  </div>
);
}
