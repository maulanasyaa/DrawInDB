import React, { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReactFlow } from "reactflow";
import { useEditorStore } from "../../store/editorStore";
import {
  FiArrowLeft,
  FiSave,
  FiDownload,
  FiUpload,
  FiImage,
  FiCornerUpLeft,
  FiCornerUpRight,
} from "react-icons/fi";
import {
  buildUseCaseExport,
  parseUseCaseImport,
} from "../../utils/useCaseJson";
import { exportDiagramAsImage } from "../../utils/exportImage";
import { getDiagramType, isErdType } from "../../config/diagramTypes";
import { getEditorConfig } from "../../config/editorTypes.jsx";

export default function EditorHeader() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const fileInputRef = useRef(null);
  const { getNodes } = useReactFlow();

  const diagramMeta = useEditorStore((state) => state.diagramMeta);
  const isDirty = useEditorStore((state) => state.isDirty);
  const saveDiagram = useEditorStore((state) => state.saveDiagram);
  const tables = useEditorStore((state) => state.tables);
  const nodes = useEditorStore((state) => state.nodes);
  const flowEdges = useEditorStore((state) => state.flowEdges);
  const canvasState = useEditorStore((state) => state.canvasState);
  const replaceUseCaseGraph = useEditorStore(
    (state) => state.replaceUseCaseGraph,
  );
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const historyPast = useEditorStore((state) => state.historyPast);
  const historyFuture = useEditorStore((state) => state.historyFuture);
  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  if (!diagramMeta) return null;

  const type = diagramMeta.type;
  const typeConfig = getDiagramType(type);
  const editorConfig = getEditorConfig(type);
  const isERD = isErdType(type);
  const badgeText = typeConfig.badge;
  const backLabel = typeConfig.backLabel;

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

  const handleExportJSON = () => {
    const payload = buildUseCaseExport(
      diagramMeta,
      nodes,
      flowEdges,
      canvasState,
    );
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${(diagramMeta.name || "usecase").replace(/\s+/g, "_").toLowerCase()}.usecase.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportImage = async () => {
    try {
      // Tipe dengan kanvas sendiri (sequence) mengekspor SVG-nya langsung.
      // Dicek SEBELUM guard kosong: sequence tidak punya `nodes` sama sekali.
      if (editorConfig.exportPng) {
        await editorConfig.exportPng({ filename: diagramMeta.name || "diagram" });
        return;
      }

      // ERD menyimpan node di `tables`; tipe graph memakai node hasil ukur
      // React Flow (bukan snapshot render, yang bisa belum punya width/height).
      const readNodes = () => (isERD ? tables : getNodes());

      if (readNodes().length === 0) {
        alert("Nothing to export — the diagram is empty.");
        return;
      }

      await exportDiagramAsImage(readNodes, {
        filename: diagramMeta.name || "diagram",
        padding: 48,
        pixelRatio: 2,
      });
    } catch (err) {
      console.error("Export image failed:", err);
      alert("Failed to export image: " + err.message);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset supaya bisa import file yang sama lagi
    if (!file) return;

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const parsed = parseUseCaseImport(raw);
      replaceUseCaseGraph(parsed);
    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import JSON: " + err.message);
    }
  };

  return (
    <div className="h-14 border-b border-theme bg-surface flex items-center justify-between px-4 z-20 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/project/${projectId}/${type}`)}
          className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-base rounded-md transition-colors"
          title={`Back to ${backLabel} list`}
        >
          <FiArrowLeft />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="font-display font-semibold text-primary">
            {diagramMeta.name}
          </h1>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-theme bg-surface-2 text-primary uppercase tracking-widest select-none">
              {badgeText}
            </span>

            {typeConfig.hasDbType && diagramMeta.db_type && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-warning/30 bg-warning/10 text-warning uppercase tracking-widest select-none">
                {diagramMeta.db_type}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${
              canUndo
                ? "text-muted hover:text-primary hover:bg-surface-2"
                : "text-muted opacity-40 cursor-not-allowed"
            }`}
            title="Undo (Ctrl/Cmd+Z)"
            aria-label="Undo"
          >
            <FiCornerUpLeft className="text-sm" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${
              canRedo
                ? "text-muted hover:text-primary hover:bg-surface-2"
                : "text-muted opacity-40 cursor-not-allowed"
            }`}
            title="Redo (Ctrl/Cmd+Shift+Z, Ctrl+Y)"
            aria-label="Redo"
          >
            <FiCornerUpRight className="text-sm" />
          </button>
        </div>

        {isDirty && (
          <span className="text-[10px] font-medium text-warning animate-pulse select-none">
            Unsaved changes
          </span>
        )}

        {/* Export PNG — untuk semua diagram type */}
        {/* Menggunakan operator || (OR) */}
        {typeConfig.exports.png && (
          <button
            onClick={handleExportImage}
            className="flex items-center gap-2 text-muted hover:text-primary px-3 py-1.5 transition-colors rounded-md hover:bg-surface-2 text-xs font-semibold"
            title="Export as PNG image"
          >
            <FiImage className="text-sm" />
            <span>Export PNG</span>
          </button>
        )}

        {typeConfig.exports.sql && (
          <button
            onClick={handleExportSQL}
            className="flex items-center gap-2 text-muted hover:text-primary px-3 py-1.5 transition-colors rounded-md hover:bg-surface-2 text-xs font-semibold"
            title="Export to SQL"
          >
            <FiDownload className="text-sm" />
            <span>Export SQL</span>
          </button>
        )}

        {typeConfig.exports.json && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="flex items-center gap-2 text-muted hover:text-primary px-3 py-1.5 transition-colors rounded-md hover:bg-surface-2 text-xs font-semibold"
              title="Import from JSON"
            >
              <FiUpload className="text-sm" />
              <span>Import JSON</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 text-muted hover:text-primary px-3 py-1.5 transition-colors rounded-md hover:bg-surface-2 text-xs font-semibold"
              title="Export to JSON"
            >
              <FiDownload className="text-sm" />
              <span>Export JSON</span>
            </button>
          </>
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
