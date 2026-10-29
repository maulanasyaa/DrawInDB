import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';
import { useVaultStore } from '../store/vaultStore';
import ConfirmDialog from './ConfirmDialog';
import { getDiagramType } from '../config/diagramTypes';

export default function DiagramCard({ diagram }) {
  const navigate = useNavigate();
  const deleteDiagram = useVaultStore(state => state.deleteDiagram);
  const renameDiagram = useVaultStore(state => state.renameDiagram);
  
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(diagram.name);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleOpen = () => {
    navigate(`/editor/${diagram.filename}`);
  };

  const handleRename = (e) => {
    e.stopPropagation();
    if (newName.trim() && newName !== diagram.name) {
      renameDiagram(diagram.filename, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    deleteDiagram(diagram.filename);
    setShowConfirm(false);
  };

  const timeAgo = DateTime.fromISO(diagram.updated_at).toRelative() || 'Just now';
  
  const diagramType = getDiagramType(diagram.meta?.type);
  const hasDbType = diagramType.hasDbType && diagram.db_type;
  
  const typeColorMap = {
    mysql: 'var(--badge-mysql)',
    postgresql: 'var(--badge-postgresql)',
    sqlite: 'var(--badge-sqlite)',
    generic: 'var(--badge-generic)'
  };
  const color = typeColorMap[diagram.db_type?.toLowerCase()] || typeColorMap.generic;

  return (
    <>
      <div 
        onClick={handleOpen}
        className="group relative premium-card p-6 cursor-pointer hover-lift active:scale-[0.98] flex flex-col h-48 justify-between transition-all"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            {hasDbType && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border uppercase font-semibold tracking-wider bg-surface-2" style={{ color, borderColor: color }}>
                {diagram.db_type}
              </span>
            )}
          </div>
          
          {isRenaming ? (
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => e.key === 'Enter' && handleRename(e)}
              onClick={e => e.stopPropagation()}
              className="font-display subsection-title bg-transparent border-b border-theme text-primary w-full outline-none"
            />
          ) : (
            <h3 className="font-display subsection-title text-primary line-clamp-2" title={diagram.name}>
              {diagram.name}
            </h3>
          )}
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div className="text-sm text-muted font-light">
            {timeAgo}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
              className="text-sm text-secondary hover:text-primary transition-colors"
              title="Rename"
            >
              Rename
            </button>
            <button 
              onClick={handleDelete}
              className="text-sm text-danger hover:text-danger-hover transition-colors"
              title="Delete"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      
      {showConfirm && (
        <ConfirmDialog
          title="Delete Diagram"
          message={`Are you sure you want to delete "${diagram.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
