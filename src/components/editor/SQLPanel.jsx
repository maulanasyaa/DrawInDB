import React, { useState, useRef } from 'react';
import { FiX } from 'react-icons/fi';

export default function SQLPanel({ sql, diagramName, dbType, onClose }) {
  const [copied, setCopied] = useState(false);
  const [height, setHeight] = useState(300);
  const panelRef = useRef(null);

  const syntaxHighlight = (code) => {
    let html = code;
    html = html.replace(/'[^']*'/g, '<span style="color: var(--warning)">$&</span>');
    html = html.replace(/--.*$/gm, '<span style="color: var(--text-muted); font-style: italic;">$&</span>');
    html = html.replace(/\b(CREATE TABLE|ALTER TABLE|ADD CONSTRAINT|FOREIGN KEY|REFERENCES|PRIMARY KEY|AUTO_INCREMENT|AUTOINCREMENT|SERIAL|BIGSERIAL|UNIQUE|NOT NULL|DEFAULT|ENGINE|CHARSET)\b/g, '<span style="color: var(--accent); font-weight: 600;">$&</span>');
    html = html.replace(/\b(INT|INTEGER|BIGINT|SMALLINT|TINYINT|DECIMAL|FLOAT|DOUBLE|NUMERIC|REAL|VARCHAR|TEXT|LONGTEXT|CHAR|DATE|DATETIME|TIMESTAMP|TIMESTAMPTZ|TIME|BOOLEAN|JSON|JSONB|BLOB|BYTEA|UUID|ENUM)(\([0-9,]+\))?\b/g, '<span style="color: var(--success)">$&</span>');
    return { __html: html };
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const filename = `${diagramName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.sql`;
      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to download SQL');
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const onMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
      setHeight(newHeight);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 bg-surface border-t border-theme shadow-[0_-20px_40px_rgba(0,0,0,0.05)] z-40 flex flex-col transition-transform animate-slide-up"
      style={{ height: `${height}px` }}
      ref={panelRef}
    >
      {/* Resizer Handle */}
      <div 
        className="h-2 w-full cursor-row-resize hover:bg-focus transition-colors absolute top-[-1px] z-50 flex justify-center items-center group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-12 h-1 bg-theme rounded-full group-hover:bg-accent transition-colors" />
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-surface-2 shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-primary font-display text-lg">{diagramName}.sql</h3>
          <span className="text-[10px] px-2 py-0.5 rounded border border-theme text-secondary uppercase font-semibold tracking-wider bg-base">
            {dbType}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCopy}
            className="btn-secondary py-1.5 px-4 text-xs"
          >
            {copied ? 'Copied ✓' : 'Copy Code'}
          </button>
          <button 
            onClick={handleDownload}
            className="btn-primary py-1.5 px-4 text-xs"
          >
            Download .sql
          </button>
          <div className="w-px h-6 bg-theme mx-2"></div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-full transition-colors text-lg"
          >
            <FiX />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-base">
        <pre 
          className="font-mono text-sm leading-relaxed whitespace-pre-wrap outline-none text-primary"
          dangerouslySetInnerHTML={syntaxHighlight(sql)}
        />
      </div>
    </div>
  );
}
