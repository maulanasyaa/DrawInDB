import React, { useState, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import { useEditorStore } from "../../store/editorStore";
import { DB_DATA_TYPES } from "../../config/dbTypes";
import { FiMoreVertical, FiX } from "react-icons/fi";
import { MdDragIndicator } from "react-icons/md";
import { FaKey } from "react-icons/fa";
import ConfirmDialog from "../ConfirmDialog";

const TableNode = React.memo(({ id, data, selected }) => {
  const updateTable = useEditorStore((state) => state.updateTable);
  const deleteTable = useEditorStore((state) => state.deleteTable);
  const duplicateTable = useEditorStore((state) => state.duplicateTable);
  const addColumn = useEditorStore((state) => state.addColumn);
  const updateColumn = useEditorStore((state) => state.updateColumn);
  const deleteColumn = useEditorStore((state) => state.deleteColumn);
  const diagramMeta = useEditorStore((state) => state.diagramMeta);
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [data.columns, id, updateNodeInternals]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(data.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dbType = diagramMeta?.db_type || "generic";
  const availableTypes = DB_DATA_TYPES[dbType] || DB_DATA_TYPES.generic;

  useEffect(() => {
    setNameVal(data.name);
  }, [data.name]);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (nameVal.trim() && nameVal !== data.name) {
      updateTable(id, { name: nameVal.trim() });
    } else {
      setNameVal(data.name);
    }
  };

  const confirmDelete = () => {
    deleteTable(id);
    setShowDeleteConfirm(false);
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`min-w-65 premium-card transition-all relative group ${selected ? "ring-1 ring-accent shadow-xl" : "shadow-sm hover:shadow-md"}`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-theme/50">
        <div className="flex items-center gap-3 flex-1">
          {isEditingName ? (
            <input
              autoFocus
              className="font-display text-lg text-primary bg-transparent border-b border-theme w-full outline-none"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
            />
          ) : (
            <div
              className="font-display text-xl text-primary font-medium cursor-text flex-1 truncate tracking-tight"
              onClick={() => setIsEditingName(true)}
            >
              {data.name}
            </div>
          )}
        </div>

        {/* Context Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-6 h-6 flex items-center justify-center text-muted hover:text-primary transition-colors rounded-full hover:bg-hover"
          >
            <FiMoreVertical />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-40 premium-card z-50 overflow-hidden py-1 shadow-2xl"
              >
                <button
                  onClick={() => {
                    duplicateTable(id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-hover text-primary transition-colors"
                >
                  Duplicate Table
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-danger/10 text-danger transition-colors"
                >
                  Delete Table
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* COLUMNS */}
      <div className="flex flex-col py-2">
        {data.columns.map((col, index) => (
          <div
            key={col.id}
            className="relative group/col flex items-center px-5 py-2 hover:bg-hover/50 transition-colors gap-3"
          >
            <Handle
              type="target"
              position={Position.Left}
              id={col.id}
              className="!absolute !-left-3 !w-6 !h-6 border-2 z-10 shadow-sm cursor-crosshair transition-all !bg-surface !border-accent opacity-0 group-hover/col:opacity-100 hover:!bg-accent hover:!border-surface"
            />

            <div className="w-4 flex justify-center text-muted cursor-grab active:cursor-grabbing text-[10px]">
              {col.pk ? (
                <FaKey className="text-warning" />
              ) : (
                <MdDragIndicator />
              )}
            </div>

            <div className="flex-1 flex items-center bg-base/30 border border-theme/30 rounded px-2 py-1 focus-within:border-focus transition-colors">
              <input
                className="bg-transparent text-primary text-sm font-medium outline-none w-full placeholder:text-muted"
                value={col.name}
                placeholder="column_name"
                onChange={(e) =>
                  updateColumn(id, col.id, { name: e.target.value })
                }
              />
              {col.fk && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-success/10 text-success border border-success/20 rounded ml-2 select-none">
                  FK
                </span>
              )}
            </div>

            <div className="flex items-center bg-base/30 border border-theme/30 rounded px-1.5 py-1 focus-within:border-focus transition-colors">
              <select
                className="bg-transparent text-secondary text-[11px] w-20 appearance-none cursor-pointer outline-none font-mono tracking-tight font-medium"
                value={col.type}
                onChange={(e) =>
                  updateColumn(id, col.id, { type: e.target.value })
                }
              >
                {availableTypes.map((t) => (
                  <option key={t} value={t} className="bg-surface">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => deleteColumn(id, col.id)}
              className="text-muted hover:text-danger opacity-0 group-hover/col:opacity-100 transition-opacity ml-auto flex items-center justify-center text-lg"
            >
              <FiX />
            </button>

            <Handle
              type="source"
              position={Position.Right}
              id={col.id}
              className="!absolute !-right-3 !w-6 !h-6 border-2 z-10 shadow-sm cursor-crosshair transition-all !bg-surface !border-accent opacity-0 group-hover/col:opacity-100 hover:!bg-accent hover:!border-surface"
            />
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="px-5 py-4 border-t border-theme/30">
        <button
          onClick={() => addColumn(id)}
          className="text-xs text-muted hover:text-primary transition-colors font-medium tracking-wide uppercase"
        >
          + Add Field
        </button>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Table"
          message={`Are you sure you want to delete the table "${data.name}"? This action is permanent.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </motion.div>
  );
});

export default TableNode;
