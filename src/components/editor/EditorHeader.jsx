import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditorStore } from "../../store/editorStore";
import { FiArrowLeft, FiSave, FiDownload } from "react-icons/fi";

export default function EditorHeader() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const diagramMeta = useEditorStore((state) => state.diagramMeta);
  const isDirty = useEditorStore((state) => state.isDirty);
  const saveDiagram = useEditorStore((state) => state.saveDiagram);
  const tables = useEditorStore((state) => state.tables);

  if (!diagramMeta) return null;

  const isERD = diagramMeta.type === "erd";

  const handleExportSQL = () => {
    let sql = `-- Exported from DrawInDB\n-- Diagram: ${diagramMeta.name}\n\n`;

    tables.forEach((table) => {
      const tableName = table.data.name || "untitled_table";
      sql += `CREATE TABLE ${tableName} (\n`;

      const cols = table.data.columns || [];
      cols.forEach((col, idx) => {
        const isPK = col.isPrimary ? " PRIMARY KEY" : "";
        const comma = idx < cols.length - 1 ? "," : "";
        sql += `  ${col.name} ${col.type}${isPK}${comma}\n`;
      });

      sql += `);\n\n`;
    });

    const blob = new Blob([sql], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${(diagramMeta.name || "diagram").replace(/\s+/g, "_").toLowerCase()}.sql`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-14 border-b border-theme bg-surface flex items-center justify-between px-4 z-20 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/project/${projectId}/${diagramMeta.type}`)}
          className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-base rounded-md transition-colors"
          title={`Back to ${isERD ? "ERD" : "Flowchart"} list`}
        >
          <FiArrowLeft />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="font-display font-semibold text-primary">
            {diagramMeta.name}
          </h1>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-theme bg-surface-2 text-primary uppercase tracking-widest select-none">
              {isERD ? "ERD" : "FLOWCHART"}
            </span>

            {isERD && diagramMeta.db_type && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-warning/30 bg-warning/10 text-warning uppercase tracking-widest select-none">
                {diagramMeta.db_type}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isDirty && (
          <span className="text-[10px] font-medium text-warning animate-pulse select-none">
            Unsaved changes
          </span>
        )}

        {isERD && (
          <button
            onClick={handleExportSQL}
            className="flex items-center gap-2 text-muted hover:text-primary px-3 py-1.5 transition-colors rounded-md hover:bg-surface-2 text-xs font-semibold"
            title="Export to SQL"
          >
            <FiDownload className="text-sm" />
            <span>Export SQL</span>
          </button>
        )}

        <button
          onClick={saveDiagram}
          disabled={!isDirty}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
            isDirty
              ? "bg-primary text-canvas hover:bg-primary/90 hover-lift"
              : "bg-surface-2 text-muted cursor-not-allowed opacity-50"
          }`}
        >
          <FiSave />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}
