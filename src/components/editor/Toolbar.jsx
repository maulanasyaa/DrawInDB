import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactFlow, useViewport } from 'reactflow';
import { useEditorStore } from '../../store/editorStore';
import { useThemeStore } from '../../store/themeStore';
import { exportToPNG } from '../../utils/exportImage';
import ConfirmDialog from '../ConfirmDialog';
import { FiArrowLeft, FiSidebar, FiCode, FiImage, FiPlus, FiSave, FiSun, FiMoon, FiMinus, FiMaximize } from 'react-icons/fi';

export default function Toolbar({ onToggleSQL }) {
  const navigate = useNavigate();
  
  const diagramMeta = useEditorStore(state => state.diagramMeta);
  const isDirty = useEditorStore(state => state.isDirty);
  const isSidebarOpen = useEditorStore(state => state.isSidebarOpen);
  const toggleSidebar = useEditorStore(state => state.toggleSidebar);
  const addTable = useEditorStore(state => state.addTable);
  const forceSave = useEditorStore(state => state.forceSave);

  const { theme, toggleTheme } = useThemeStore();

  const { getViewport, setViewport, zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();
  
  const [isExporting, setIsExporting] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const handleBack = () => {
    if (isDirty) {
      setShowBackConfirm(true);
    } else {
      navigate('/');
    }
  };

  const confirmBack = () => {
    navigate('/');
  };

  const handleAddTable = () => {
    const { x, y, zoom: currentZoom } = getViewport();
    const centerX = (-x + window.innerWidth / 2) / currentZoom;
    const centerY = (-y + window.innerHeight / 2) / currentZoom;
    addTable({ x: centerX, y: centerY });
  };

  const handleResetZoom = () => {
    const { x, y } = getViewport();
    setViewport({ x, y, zoom: 1 }, { duration: 400 });
  };

  const handleExportPNG = async () => {
    if (!diagramMeta) return;
    setIsExporting(true);
    try {
      const filename = `${diagramMeta.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.png`;
      await exportToPNG('.react-flow', filename);
    } finally {
      setIsExporting(false);
    }
  };

  if (!diagramMeta) return null;
  
  const typeColorMap = {
    mysql: 'var(--badge-mysql)',
    postgresql: 'var(--badge-postgresql)',
    sqlite: 'var(--badge-sqlite)',
    generic: 'var(--badge-generic)'
  };
  const badgeColor = typeColorMap[diagramMeta.db_type?.toLowerCase()] || typeColorMap.generic;

  return (
    <>
      <div className="h-14 bg-surface border-b border-theme flex items-center justify-between px-6 z-10 relative shrink-0">
        {/* Left: Navigation & Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleBack}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-full transition-all"
            title="Back to Dashboard"
          >
            <FiArrowLeft />
          </button>
          <div className="w-px h-4 bg-theme mx-1"></div>
          <button 
            onClick={toggleSidebar} 
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isSidebarOpen ? 'text-primary bg-hover shadow-inner' : 'text-muted hover:text-primary hover:bg-hover'}`}
            title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            <FiSidebar />
          </button>
        </div>

        {/* Center: Diagram Info */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-medium text-primary tracking-tight">{diagramMeta.name}</h2>
              <span 
                className="text-[9px] px-1.5 py-0.5 rounded-full border border-theme uppercase font-bold tracking-widest bg-base opacity-80"
                style={{ color: badgeColor, borderColor: badgeColor + '40' }}
              >
                {diagramMeta.db_type}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isDirty ? (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"></span>
                  <span className="text-[10px] font-semibold text-warning uppercase tracking-tighter">Unsaved Changes</span>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-success uppercase tracking-tighter">Saved to Vault</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center bg-base border border-theme rounded-full px-1 py-0.5">
            <button onClick={() => zoomOut()} className="w-7 h-7 flex items-center justify-center text-muted hover:text-primary rounded-full hover:bg-surface transition-all active:scale-90"><FiMinus /></button>
            <button onClick={handleResetZoom} className="px-2 text-[10px] font-bold text-secondary hover:text-primary transition-colors min-w-[40px] text-center" title="Reset Zoom">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => zoomIn()} className="w-7 h-7 flex items-center justify-center text-muted hover:text-primary rounded-full hover:bg-surface transition-all active:scale-90"><FiPlus /></button>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={onToggleSQL}
              className="w-9 h-9 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-full transition-all"
              title="Generate SQL"
            >
              <FiCode />
            </button>

            <button 
              onClick={handleExportPNG}
              disabled={isExporting}
              className="w-9 h-9 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-full transition-all disabled:opacity-30"
              title="Export PNG"
            >
              {isExporting ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span> : <FiImage />}
            </button>
          </div>

          <div className="w-px h-4 bg-theme mx-1"></div>

          <div className="flex items-center gap-2">
            <button 
              onClick={forceSave}
              disabled={!isDirty}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                isDirty 
                  ? 'bg-accent text-canvas shadow-lg shadow-accent/20 active:scale-95' 
                  : 'bg-base text-muted border border-theme cursor-not-allowed'
              }`}
            >
              <FiSave className="text-sm" /> Save
            </button>
          </div>
        </div>
      </div>

      {showBackConfirm && (
        <ConfirmDialog
          title="Unsaved Changes"
          message="You have unsaved changes. They will auto-save shortly, but leaving now might lose immediate edits. Are you sure you want to leave?"
          confirmLabel="Leave Anyway"
          confirmVariant="danger"
          onConfirm={confirmBack}
          onCancel={() => setShowBackConfirm(false)}
        />
      )}
    </>
  );
}
