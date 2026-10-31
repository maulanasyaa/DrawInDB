import React, { useMemo, useState } from 'react';
import { FiCode, FiDownload, FiX } from 'react-icons/fi';

import { useEditorStore } from '../../store/editorStore';
import { useToastStore } from '../../store/toastStore';
import { DB_DATA_TYPES } from '../../config/dbTypes';
import { previewSql } from '../../utils/sqlPreview';
import CopyButton from '../CopyButton';
import EmptyState from '../EmptyState';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/**
 * Panel preview SQL (di-dock di bawah kanvas, read-only). SQL dihitung ulang
 * setiap `tables`/`relationships` berubah; pilihan dialek hanya state lokal
 * panel — `meta.db_type` diagram tidak ditulis, jadi history & dirty aman.
 */
export default function SQLPanel({ onClose }) {
  const diagramMeta = useEditorStore((state) => state.diagramMeta);
  const tables = useEditorStore((state) => state.tables);
  const relationships = useEditorStore((state) => state.relationships);

  const [dbType, setDbType] = useState(diagramMeta?.db_type || 'generic');
  const [height, setHeight] = useState(300);

  const sql = useMemo(
    () => previewSql(diagramMeta, tables, relationships, dbType),
    [diagramMeta, tables, relationships, dbType],
  );

  const syntaxHighlight = (code) => {
    // Escape dulu: nama tabel/kolom berasal dari file JSON dan dirender
    // lewat dangerouslySetInnerHTML.
    let html = code.replace(/[&<>]/g, (c) => ESCAPES[c]);
    html = html.replace(/'[^']*'/g, '<span style="color: var(--warning)">$&</span>');
    html = html.replace(/--.*$/gm, '<span style="color: var(--text-muted); font-style: italic;">$&</span>');
    html = html.replace(/\b(CREATE TABLE|ALTER TABLE|ADD CONSTRAINT|FOREIGN KEY|REFERENCES|PRIMARY KEY|AUTO_INCREMENT|AUTOINCREMENT|SERIAL|BIGSERIAL|UNIQUE|NOT NULL|DEFAULT|ENGINE|CHARSET)\b/g, '<span style="color: var(--accent); font-weight: 600;">$&</span>');
    html = html.replace(/\b(INT|INTEGER|BIGINT|SMALLINT|TINYINT|DECIMAL|FLOAT|DOUBLE|NUMERIC|REAL|VARCHAR|TEXT|LONGTEXT|CHAR|DATE|DATETIME|TIMESTAMP|TIMESTAMPTZ|TIME|BOOLEAN|JSON|JSONB|BLOB|BYTEA|UUID|ENUM)(\([0-9,]+\))?\b/g, '<span style="color: var(--success)">$&</span>');
    return { __html: html };
  };

  const handleDownload = () => {
    try {
      const filename = `${(diagramMeta?.name || 'diagram').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.sql`;
      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      useToastStore.getState().error('Failed to download SQL');
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const onMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY;
      setHeight(Math.max(100, Math.min(window.innerHeight * 0.6, startHeight + deltaY)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const dialects = Object.keys(DB_DATA_TYPES);

  return (
    // In-flow (bukan `absolute`): kanvas menyusut, tombol zoom React Flow dan
    // tombol tema global tetap terlihat.
    <div
      className="relative shrink-0 z-20 bg-surface border-t border-theme flex flex-col animate-fade-in"
      style={{ height: `${height}px` }}
    >
      <div
        className="h-1.5 w-full cursor-row-resize hover:bg-focus transition-colors absolute top-0 left-0 z-30 flex justify-center items-center group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-12 h-1 bg-theme rounded-full group-hover:bg-accent transition-colors" />
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-surface-2 shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-primary font-display text-lg">
            {diagramMeta?.name}.sql
          </h3>
          {dialects.length > 1 ? (
            <select
              className="text-[10px] px-2 py-0.5 rounded border border-theme text-secondary uppercase font-semibold tracking-wider bg-base outline-none cursor-pointer"
              value={dbType}
              onChange={(e) => setDbType(e.target.value)}
              aria-label="SQL dialect"
              title="Preview dialect (does not change the diagram)"
            >
              {dialects.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded border border-theme text-secondary uppercase font-semibold tracking-wider bg-base">
              {dbType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {sql && <CopyButton text={sql} title="Copy SQL" />}
          <button
            onClick={handleDownload}
            disabled={!sql}
            className="btn-primary py-1.5 px-4 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiDownload className="inline mr-1" />
            Download .sql
          </button>
          <div className="w-px h-6 bg-theme mx-2" />
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-full transition-colors text-lg"
            title="Close SQL preview"
            aria-label="Close SQL preview"
          >
            <FiX />
          </button>
        </div>
      </div>

      {/* pb-20 pr-16: ruang untuk tombol tema global (`fixed bottom-8 right-8`). */}
      <div className="flex-1 overflow-auto bg-base">
        {sql ? (
          <pre
            className="p-6 pb-20 pr-16 font-mono text-sm leading-relaxed whitespace-pre-wrap outline-none text-primary"
            dangerouslySetInnerHTML={syntaxHighlight(sql)}
          />
        ) : (
          <EmptyState
            icon={<FiCode />}
            title="No SQL yet"
            description="Add a table with columns to see its SQL."
          />
        )}
      </div>
    </div>
  );
}
