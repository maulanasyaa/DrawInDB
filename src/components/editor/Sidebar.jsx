import React, { useState, useCallback } from "react";
import { useReactFlow } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useEditorStore } from "../../store/editorStore";
import { DB_DATA_TYPES } from "../../config/dbTypes";
import EmptyState from "../EmptyState";
import {
  FiEye,
  FiEyeOff,
  FiChevronUp,
  FiChevronDown,
  FiFolder,
  FiX,
  FiPlus,
} from "react-icons/fi";
import { MdDragIndicator } from "react-icons/md";
import { FaKey } from "react-icons/fa";
import ConfirmDialog from "../ConfirmDialog";

const COLORS = [
  "var(--table-color-1)",
  "var(--table-color-2)",
  "var(--table-color-3)",
  "var(--table-color-4)",
  "var(--table-color-5)",
  "var(--table-color-6)",
];

const SortableColumn = React.memo(({ col, tableId, availableTypes }) => {
  const updateColumn = useEditorStore((state) => state.updateColumn);
  const deleteColumn = useEditorStore((state) => state.deleteColumn);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Sesuaikan baris ini:
      className={`grid grid-cols-[20px_1fr_75px_24px_24px_24px_24px] items-center gap-1 group p-0.5 rounded transition-colors ${isDragging ? "bg-hover opacity-80" : "hover:bg-hover"}`}
    >
      <span
        {...attributes}
        {...listeners}
        className="text-muted text-xs cursor-grab active:cursor-grabbing hover:text-primary flex items-center justify-center p-1"
      >
        <MdDragIndicator />
      </span>

      <div className="flex items-center bg-surface border border-theme rounded px-1.5 py-0.5 focus-within:border-focus transition-colors">
        <input
          className="w-full bg-transparent text-[12px] text-primary outline-none font-medium truncate"
          value={col.name}
          onChange={(e) =>
            updateColumn(tableId, col.id, { name: e.target.value })
          }
        />
      </div>

      <div className="flex items-center bg-surface border border-theme rounded px-1 py-0.5 focus-within:border-focus transition-colors">
        {/* Hapus w-20, jadikan w-full saja */}
        <select
          className="w-full bg-transparent text-[10px] text-accent outline-none cursor-pointer font-mono font-medium"
          value={col.type}
          onChange={(e) =>
            updateColumn(tableId, col.id, { type: e.target.value })
          }
        >
          {availableTypes.map((t) => (
            <option key={t} className="bg-surface">
              {t}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => updateColumn(tableId, col.id, { pk: !col.pk })}
        className={`w-6 h-6 rounded flex items-center justify-center transition-all ${col.pk ? "text-warning bg-warning/10 shadow-sm" : "text-muted hover:text-primary hover:bg-surface-2"}`}
        title="Primary Key"
      >
        <FaKey className="text-[10px]" />
      </button>

      <div
        className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold transition-all ${col.fk ? "text-success bg-success/10 shadow-sm" : "text-muted/30"}`}
        title="Foreign Key (Auto-assigned via line connection)"
      >
        FK
      </div>

      <button
        onClick={() => updateColumn(tableId, col.id, { notNull: !col.notNull })}
        className={`text-[9px] font-bold w-6 h-6 rounded flex items-center justify-center transition-all ${col.notNull ? "bg-accent text-canvas shadow-sm" : "text-muted hover:text-primary hover:bg-surface-2"}`}
        title="Not Null"
      >
        NN
      </button>

      <button
        onClick={() => deleteColumn(tableId, col.id)}
        className="text-muted hover:text-danger hover:bg-danger/10 w-6 h-6 rounded opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-sm"
        title="Delete Column"
      >
        <FiX />
      </button>
    </div>
  );
});

const SidebarTableRow = React.memo(({ table, isExpanded, onToggleExpand }) => {
  const updateTable = useEditorStore((state) => state.updateTable);
  const deleteTable = useEditorStore((state) => state.deleteTable);
  const addColumn = useEditorStore((state) => state.addColumn);
  const reorderColumns = useEditorStore((state) => state.reorderColumns);
  const toggleTableVisibility = useEditorStore(
    (state) => state.toggleTableVisibility,
  );
  const diagramMeta = useEditorStore((state) => state.diagramMeta);

  const dbType = diagramMeta?.db_type || "generic";
  const availableTypes = DB_DATA_TYPES[dbType] || DB_DATA_TYPES.generic;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteTable = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteTable(table.id);
    setShowDeleteConfirm(false);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = table.data.columns.findIndex((c) => c.id === active.id);
      const newIndex = table.data.columns.findIndex((c) => c.id === over.id);
      reorderColumns(table.id, oldIndex, newIndex);
    }
  };

  return (
    <div className="border-b border-theme bg-surface">
      {/* Collapsed Header */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-hover transition-colors ${isExpanded ? "bg-surface-2" : ""}`}
        onClick={() => onToggleExpand(table.id)}
      >
        <div className="flex items-center gap-3 overflow-hidden pr-2">
          <span
            className={`font-medium text-sm truncate tracking-tight ${table.hidden ? "text-muted line-through opacity-50" : "text-primary"}`}
          >
            {table.data.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-muted">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTableVisibility(table.id);
            }}
            className="w-7 h-7 flex items-center justify-center hover:bg-hover hover:text-primary rounded-full transition-all active:scale-90"
            title="Toggle visibility"
          >
            {table.hidden ? <FiEyeOff /> : <FiEye />}
          </button>
          <span className="w-5 flex justify-center text-xs opacity-40">
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </div>
      </div>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ willChange: "height, opacity" }}
            className="bg-base overflow-hidden border-t border-theme shadow-inner"
          >
            <div className="p-4 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">
                  Properties
                </span>
                <div className="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3 py-1.5 focus-within:border-focus transition-colors">
                  <span className="text-xs text-muted font-medium shrink-0">
                    Name
                  </span>
                  <input
                    className="flex-1 bg-transparent text-sm text-primary outline-none font-medium"
                    value={table.data.name}
                    onChange={(e) =>
                      updateTable(table.id, { name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between ml-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    Fields
                  </span>
                  <span className="text-[10px] text-muted opacity-60 font-mono">
                    {table.data.columns.length} Total
                  </span>
                </div>

                {/* Grid Header */}
                <div className="grid grid-cols-[20px_1fr_75px_24px_24px_24px_24px] gap-1 px-1 mb-1 border-b border-theme/30 pb-1">
                  <div />
                  <span className="text-[9px] font-bold text-muted/60 uppercase tracking-tighter">
                    Name
                  </span>
                  <span className="text-[9px] font-bold text-muted/60 uppercase tracking-tighter">
                    Type
                  </span>
                  <span className="text-[9px] font-bold text-muted/60 uppercase tracking-tighter text-center">
                    PK
                  </span>
                  <span className="text-[9px] font-bold text-muted/60 uppercase tracking-tighter text-center">
                    FK
                  </span>
                  <span className="text-[9px] font-bold text-muted/60 uppercase tracking-tighter text-center">
                    NN
                  </span>
                  <div />
                </div>

                <div className="flex flex-col gap-0.5">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={table.data.columns.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {table.data.columns.map((col) => (
                        <SortableColumn
                          key={col.id}
                          col={col}
                          tableId={table.id}
                          availableTypes={availableTypes}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => addColumn(table.id)}
                  className="flex-1 py-2 bg-surface border border-theme text-primary text-xs font-semibold rounded-lg hover:border-focus hover:shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <FiPlus /> Add Field
                </button>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-theme/50">
                <button
                  onClick={handleDeleteTable}
                  className="text-danger hover:text-danger-hover text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-danger/5 transition-all font-semibold"
                >
                  <FiX /> Delete Table
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Table"
          message={`Are you sure you want to delete the table "${table.data.name}"? This will also remove all associated relationships.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
});

export default function Sidebar() {
  const tables = useEditorStore((state) => state.tables);
  const isSidebarOpen = useEditorStore((state) => state.isSidebarOpen);
  const addTable = useEditorStore((state) => state.addTable);

  const { getViewport } = useReactFlow();

  const [expandedTables, setExpandedTables] = useState({});

  const toggleExpand = useCallback((id) => {
    setExpandedTables((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAddTable = () => {
    const { x, y, zoom } = getViewport();
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;
    addTable({ x: centerX, y: centerY });
  };

  return (
    <AnimatePresence initial={false}>
      {isSidebarOpen && (
        <motion.div
          initial={{ x: -360 }}
          animate={{ x: 0 }}
          exit={{ x: -360 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ translateZ: 0, willChange: "transform" }}
          className="absolute top-0 left-0 bottom-0 w-90 bg-surface border-r border-theme flex flex-col z-20 shadow-2xl"
        >
          <div className="p-4 border-b border-theme flex items-center justify-between shrink-0 bg-surface-2">
            <h3 className="font-semibold text-primary text-sm tracking-wide uppercase">
              Tables
            </h3>
            <span className="text-xs bg-base border border-theme text-secondary px-2 py-0.5 rounded-full font-medium">
              {tables.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col bg-base pb-24">
            {tables.length === 0 ? (
              <EmptyState
                icon={<FiFolder />}
                title="No tables yet"
                description="Add a table to begin."
              />
            ) : (
              tables.map((table) => (
                <SidebarTableRow
                  key={table.id}
                  table={table}
                  isExpanded={!!expandedTables[table.id]}
                  onToggleExpand={toggleExpand}
                />
              ))
            )}
          </div>

          <div className="p-4 border-t border-theme shrink-0 bg-surface-2 absolute bottom-0 left-0 right-0 z-30">
            <button
              onClick={handleAddTable}
              className="w-full py-2 bg-accent text-canvas font-medium text-sm rounded hover-bg-accent shadow-md transition-all hover-lift"
            >
              + Add Table
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
