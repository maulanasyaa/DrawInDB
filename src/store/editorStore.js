import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import {
  USECASE_NODE_TYPES,
  USECASE_REL_TYPES,
  USECASE_DEFAULT_SIZES,
  USECASE_DEFAULT_LABELS,
} from '../config/useCaseTypes';
import { isGraphType } from '../config/diagramTypes';
import { useToastStore } from './toastStore';

/**
 * Bersihkan flag `fk` pada kolom yang tadinya jadi target relasi yang dihapus.
 * Aturan: `fk` hilang HANYA jika tidak ada relasi sisa yang menargetkan kolom
 * yang sama. Tabel yang tidak berubah mempertahankan identitas objeknya.
 */
function clearOrphanFk(tables, removedRels, remainingRels) {
  return tables.map((t) => {
    let changed = false;
    const columns = t.data.columns.map((col) => {
      const wasTarget = removedRels.some((r) => r.target === t.id && r.targetHandle === col.id);
      if (!wasTarget || !col.fk) return col;
      if (remainingRels.some((r) => r.target === t.id && r.targetHandle === col.id)) return col;
      changed = true;
      return { ...col, fk: false };
    });
    return changed ? { ...t, data: { ...t.data, columns } } : t;
  });
}

/** Batas entri per stack history. */
const HISTORY_LIMIT = 100;
/** Jendela penggabungan ketikan (satu snapshot per burst). */
const HISTORY_TYPING_MS = 500;

/** Snapshot data diagram saja — selection, viewport, dan meta tidak ikut. */
function captureSnapshot(s) {
  return {
    tables: s.tables,
    relationships: s.relationships,
    nodes: s.nodes,
    flowEdges: s.flowEdges,
  };
}

/** Dorong snapshot ke stack; stack lama dipotong dari depan. */
function pushStack(stack, snap) {
  const next = [...stack, snap];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

/**
 * Snapshot awal burst ketikan yang masih menggantung. Null bila tidak ada
 * burst aktif. Disimpan sebagai variabel modul (bukan state) supaya perubahan
 * internal tidak memicu render.
 */
let _burstSnapshot = null;

/** True selama satu gestur drag node berjalan (satu entri history per drag). */
let _dragInProgress = false;

export const useEditorStore = create((set, get) => ({
  diagramMeta: null,
  tables: [],
  relationships: [],
  nodes: [],
  flowEdges: [],
  canvasState: { x: 0, y: 0, zoom: 1 },
  selectedTableId: null,
  isSidebarOpen: true,
  isDirty: false,
  isLoading: true,
  loadError: null,
  _vaultPath: null,
  _projectId: null,
  _filename: null,

  // State khusus Use Case: relationship type yang aktif untuk koneksi baru
  usecaseRelType: USECASE_REL_TYPES.ASSOCIATION,
  setUseCaseRelType: (relType) => set({ usecaseRelType: relType }),

  _autoSaveTimer: null,
  _pendingSave: null,

  // === HISTORY undo/redo =================================================
  // Snapshot hanya di memori; tidak pernah ditulis ke file diagram.
  historyPast: [],
  historyFuture: [],
  _historyTimer: null,

  canUndo: () => get().historyPast.length > 0,
  canRedo: () => get().historyFuture.length > 0,

  /**
   * Catat state SEBELUM mutasi masuk history.
   * - 'action': satu snapshot langsung (add/delete/connect/reorder/resize).
   * - 'typing': digabung dalam burst 500 ms (satu snapshot per burst).
   * - 'flush' : tutup burst yang menggantung sekarang.
   * `flush` selalu mengosongkan stack future (aksi baru membatalkan redo).
   */
  commitHistory: (mode = 'action') => {
    const { _historyTimer } = get();
    if (_historyTimer) {
      clearTimeout(_historyTimer);
      set({ _historyTimer: null });
    }
    if (mode === 'flush') {
      // Burst menggantung: snapshot awal burst (bukan state sekarang) yang
      // harus masuk stack, supaya undo buru-buru tetap mengembalikan sebelum
      // burst dimulai. Tanpa burst, tidak ada yang dicatat.
      if (!_burstSnapshot) return;
      const pending = _burstSnapshot;
      _burstSnapshot = null;
      set((state) => ({
        historyPast: pushStack(state.historyPast, pending),
        historyFuture: [],
      }));
      return;
    }
    if (mode === 'typing') {
      // Satu burst = satu entri. Snapshot diambil dari state SEBELUM ketikan
      // pertama burst; commit berikutnya dalam jendela 500 ms hanya
      // memperpanjang timer.
      const snap = _burstSnapshot ?? captureSnapshot(get());
      _burstSnapshot = snap;
      set({ _historyTimer: setTimeout(() => {
        _burstSnapshot = null;
        set((state) => ({ historyPast: pushStack(state.historyPast, snap), historyFuture: [] }));
        set({ _historyTimer: null });
      }, HISTORY_TYPING_MS) });
      return;
    }
    // Mode 'action': satu entri per aksi.
    set((state) => ({ historyPast: pushStack(state.historyPast, captureSnapshot(state)), historyFuture: [] }));
  },

  _restoreSnapshot: (snap) => {
    // Undo/redo membatalkan gestur drag yang sedang berjalan.
    _dragInProgress = false;
    set({ tables: snap.tables, relationships: snap.relationships, nodes: snap.nodes, flowEdges: snap.flowEdges });
    const { _vaultPath, _projectId, _filename } = get();
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  undo: () => {
    // Ketikan yang belum jatuh tempo harus jadi entri dulu, kalau tidak undo
    // pertama hanya mengulang keadaan terkini.
    if (get()._historyTimer) get().commitHistory('flush');
    const { historyPast } = get();
    if (historyPast.length === 0) return;
    const target = historyPast[historyPast.length - 1];
    const current = captureSnapshot(get());
    set((state) => ({
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: pushStack(state.historyFuture, current),
    }));
    get()._restoreSnapshot(target);
  },

  redo: () => {
    if (get()._historyTimer) get().commitHistory('flush');
    const { historyFuture } = get();
    if (historyFuture.length === 0) return;
    const target = historyFuture[historyFuture.length - 1];
    const current = captureSnapshot(get());
    set((state) => ({
      historyFuture: state.historyFuture.slice(0, -1),
      historyPast: pushStack(state.historyPast, current),
    }));
    get()._restoreSnapshot(target);
  },

  autoSave: () => {
    if (get()._autoSaveTimer) clearTimeout(get()._autoSaveTimer);
    const timer = setTimeout(() => {
      if (get().isDirty) get().saveDiagram();
    }, 1500);
    set({ _autoSaveTimer: timer });
  },

  markDirty: (vaultPath, projectId, filename) => {
    const { _pendingSave } = get();
    // Only capture save context on first dirty mark
    if (!_pendingSave && vaultPath && projectId && filename) {
      set({ _pendingSave: { vaultPath, projectId, filename }, isDirty: true });
    } else {
      set({ isDirty: true });
    }
  },

  loadDiagram: async (vaultPath, projectId, filename) => {
    // Clear any existing auto-save timer before loading new diagram
    if (get()._autoSaveTimer) {
      clearTimeout(get()._autoSaveTimer);
      set({ _autoSaveTimer: null });
    }
    get().resetHistory();

    set({ isLoading: true, loadError: null, _vaultPath: vaultPath, _projectId: projectId, _filename: filename });
    try {
      const filePath = await window.api.pathJoin(vaultPath, 'projects', projectId, 'diagrams', filename);
      const content = await window.api.readFile(filePath);
      const data = JSON.parse(content);

      let parsedCanvas = data.canvas || { x: 0, y: 0, zoom: 1 };
      if (parsedCanvas.pan) {
        parsedCanvas = { x: parsedCanvas.pan.x || 0, y: parsedCanvas.pan.y || 0, zoom: parsedCanvas.zoom || 1 };
      }

      set({
        diagramMeta: data.meta,
        tables: (data.tables || []).map(t => ({ ...t, type: 'table' })),
        relationships: data.relationships || [],
        nodes: data.nodes || [],
        flowEdges: data.edges || [],
        canvasState: parsedCanvas,
        isLoading: false,
        isDirty: false,
        selectedTableId: null,
        loadError: null,
      });
    } catch (e) {
      console.error('Failed to load diagram:', e);
      const errorMsg = `Failed to load diagram: ${e.message}`;
      useToastStore.getState().error(errorMsg);
      set({ isLoading: false, loadError: errorMsg });
    }
  },

  saveDiagram: async () => {
    const { _pendingSave, diagramMeta, tables, relationships, nodes, flowEdges, canvasState, isDirty } = get();
    if (!_pendingSave || !diagramMeta || !isDirty) return;

    const { vaultPath, projectId, filename } = _pendingSave;

    try {
      const filePath = await window.api.pathJoin(vaultPath, 'projects', projectId, 'diagrams', filename);
      const updatedMeta = { ...diagramMeta, updated_at: new Date().toISOString() };

      const fileData = {
        version: "1.0",
        meta: updatedMeta,
        canvas: canvasState,
        tables,
        relationships,
        nodes,
        edges: flowEdges
      };

      await window.api.writeFile(filePath, JSON.stringify(fileData, null, 2));
      set({ isDirty: false, diagramMeta: updatedMeta, _pendingSave: null });
    } catch (e) {
      console.error('Failed to save diagram:', e);
    }
  },

  addTable: (position) => {
    const { tables, _vaultPath, _projectId, _filename } = get();
    const newTable = {
      id: `table-${Date.now()}`,
      type: 'table',
      position,
      data: { name: 'new_table', columns: [] }
    };
    get().commitHistory('action');
    set({ tables: [...tables, newTable] });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  // === TABLE: CRUD ========================================================
  updateTable: (tableId, dataUpdates) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('typing');
    set((state) => ({
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, data: { ...t.data, ...dataUpdates } } : t
      ),
    }));
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  deleteTable: (tableId) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('action');
    set((state) => {
      // Find relationships that will be removed (involving the deleted table)
      const removedRels = state.relationships.filter(
        e => e.source === tableId || e.target === tableId
      );
      const remainingRels = state.relationships.filter(
        e => e.source !== tableId && e.target !== tableId
      );

      return {
        tables: clearOrphanFk(
          state.tables.filter(t => t.id !== tableId),
          removedRels,
          remainingRels
        ),
        relationships: remainingRels,
        selectedTableId: state.selectedTableId === tableId ? null : state.selectedTableId,
      };
    });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  duplicateTable: (tableId) => {
    const { tables, _vaultPath, _projectId, _filename } = get();
    const tableToClone = tables.find(t => t.id === tableId);
    if (!tableToClone) return;

    const newTable = {
      ...tableToClone,
      id: `table-${Date.now()}`,
      position: { x: tableToClone.position.x + 50, y: tableToClone.position.y + 50 },
      data: {
        ...tableToClone.data,
        name: `${tableToClone.data.name}_copy`,
        columns: tableToClone.data.columns.map(c => ({
          ...c,
          id: `col-${Date.now()}-${Math.random()}`,
        })),
      },
    };

    get().commitHistory('action');
    set({ tables: [...tables, newTable] });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  // === COLUMN: CRUD =======================================================
  addColumn: (tableId) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('action');
    set((state) => ({
      tables: state.tables.map(t => {
        if (t.id === tableId) {
          const newCol = {
            id: `col-${Date.now()}`,
            name: 'new_column',
            type: 'VARCHAR',
            pk: false,
            fk: false,
            notNull: false,
            unique: false,
          };
          return { ...t, data: { ...t.data, columns: [...t.data.columns, newCol] } };
        }
        return t;
      }),
    }));
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  updateColumn: (tableId, columnId, dataUpdates) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('typing');
    set((state) => ({
      tables: state.tables.map(t => {
        if (t.id === tableId) {
          const updatedColumns = t.data.columns.map(c =>
            c.id === columnId ? { ...c, ...dataUpdates } : c
          );
          return { ...t, data: { ...t.data, columns: updatedColumns } };
        }
        return t;
      }),
    }));
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  deleteColumn: (tableId, columnId) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('action');
    set((state) => {
      // Also remove relationships tied to this column
      const isTied = e =>
        (e.source === tableId && e.sourceHandle === columnId) ||
        (e.target === tableId && e.targetHandle === columnId);
      const removedRels = state.relationships.filter(isTied);
      const newEdges = state.relationships.filter(e => !isTied(e));

      const newTables = state.tables.map(t => {
        if (t.id === tableId) {
          return {
            ...t,
            data: { ...t.data, columns: t.data.columns.filter(c => c.id !== columnId) },
          };
        }
        return t;
      });

      return {
        tables: clearOrphanFk(newTables, removedRels, newEdges),
        relationships: newEdges,
      };
    });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  reorderColumns: (tableId, oldIndex, newIndex) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('action');
    set((state) => ({
      tables: state.tables.map(t => {
        if (t.id === tableId) {
          const cols = [...t.data.columns];
          const [moved] = cols.splice(oldIndex, 1);
          cols.splice(newIndex, 0, moved);
          return { ...t, data: { ...t.data, columns: cols } };
        }
        return t;
      }),
    }));
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  toggleTableVisibility: (tableId) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('action');
    set((state) => ({
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, hidden: !t.hidden } : t
      ),
    }));
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  // === RELATIONSHIP =======================================================
  updateRelationshipLabel: (edgeId, label) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('typing');
    set((state) => ({
      relationships: state.relationships.map(e =>
        e.id === edgeId ? { ...e, label } : e
      ),
    }));
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  deleteRelationship: (edgeId) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('action');
    set((state) => {
      const removedRels = state.relationships.filter(e => e.id === edgeId);
      const remainingRels = state.relationships.filter(e => e.id !== edgeId);
      return {
        relationships: remainingRels,
        tables: clearOrphanFk(state.tables, removedRels, remainingRels),
      };
    });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  addFlowNode: (type, position) => {
    const { nodes, _vaultPath, _projectId, _filename } = get();
    let width = 160, height = 64, label = 'Process';

    switch(type) {
      case 'terminal': height = 56; label = 'Start'; break;
      case 'decision': width = 160; height = 160; label = 'Decision'; break;
      case 'io': label = 'Input/Output'; break;
      case 'database': width = 140; height = 80; label = 'Database'; break;
      case 'document': height = 70; label = 'Document'; break;
      case 'predefined': label = 'Sub-process'; break;
      case 'loop': width = 160; height = 64; label = 'Loop'; break;
      case 'connector': width = 40; height = 40; label = ''; break;
      case 'offpage': width = 100; height = 80; label = '1'; break;
      case 'annotation': width = 140; label = ''; break;
    }

    const newNode = {
      id: `flow-${Date.now()}`,
      type: 'flowchart',
      position,
      data: { type, label },
      style: type === 'annotation' ? { width } : { width, height }
    };

    get().commitHistory('action');
    set({ nodes: [...nodes, newNode] });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  // === USE CASE: tambah node ===
  addUseCaseNode: (subtype, position) => {
    const { nodes, _vaultPath, _projectId, _filename } = get();
    const size = USECASE_DEFAULT_SIZES[subtype] || { width: 160, height: 80 };
    const label = USECASE_DEFAULT_LABELS[subtype] ?? '';

    const newNode = {
      id: `uc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'usecase',
      position,
      data: { type: subtype, label },
      style: { width: size.width, height: size.height },
    };

    // System Boundary harus di layer paling belakang supaya bisa "menampung" visual
    if (subtype === USECASE_NODE_TYPES.SYSTEM_BOUNDARY) {
      set({ nodes: [newNode, ...nodes] });
    } else {
    get().commitHistory('action');
      set({ nodes: [...nodes, newNode] });
    }
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  // === USE CASE: replace all (untuk import JSON) ===
  replaceUseCaseGraph: ({ nodes, edges, canvasState }) => {
    const { _vaultPath, _projectId, _filename } = get();
    get().commitHistory('action');
    set({
      nodes: nodes || [],
      flowEdges: edges || [],
      canvasState: canvasState || get().canvasState,
    });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  updateNodeData: (id, newData) => {
    const { nodes, _vaultPath, _projectId, _filename } = get();
    get().commitHistory('typing');
    set({
      nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n),
    });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  onNodesChange: (changes) => {
    const { _vaultPath, _projectId, _filename, diagramMeta } = get();
    const type = diagramMeta?.type;
    // Klasifikasi batch SEBELUM state diubah, supaya snapshot history berisi
    // keadaan sebelum perubahan. Selection/kosmetik tidak masuk history.
    // React Flow menandai geseran gestur dengan `dragging: true` pada change
    // `position`, bukan dengan `type: 'drag'`.
    const isDragging = changes.some(c => c.dragging === true);
    const hasPosition = changes.some(c => c.type === 'position');
    if (isDragging) {
      // Satu entri per drag: change berikutnya dalam gestur yang sama
      // dilewati sampai gestur berakhir (tidak lagi membawa `dragging`).
      if (!_dragInProgress) {
        _dragInProgress = true;
        get().commitHistory('action');
      }
    } else if (changes.some(c => c.type === 'remove' || c.type === 'add' || c.type === 'dimensions')) {
      _dragInProgress = false;
      get().commitHistory('action');
    } else if (!hasPosition && changes.length > 0) {
      return; // selection / position_info saja: bukan perubahan bermakna
    }
    if (isGraphType(type)) {
      let nextNodes = applyNodeChanges(changes, get().nodes);

      // Cleanup edges kalau node dihapus (khusus use case, karena edges pakai flowEdges)
      const removed = changes.filter(c => c.type === 'remove').map(c => c.id);
      let nextEdges = get().flowEdges;
      if (removed.length > 0) {
        nextEdges = nextEdges.filter(
          e => !removed.includes(e.source) && !removed.includes(e.target)
        );
      }

      set({ nodes: nextNodes, flowEdges: nextEdges });
    } else {
      set({ tables: applyNodeChanges(changes, get().tables) });
    }
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  onEdgesChange: (changes) => {
    const { _vaultPath, _projectId, _filename, diagramMeta } = get();
    const type = diagramMeta?.type;
    // Hanya hapus edge yang mengubah data; selection edge tidak masuk history
    // dan tidak menandai dirty.
    if (!changes.some(c => c.type === 'remove')) return;
    get().commitHistory('action');
    if (isGraphType(type)) {
      set({ flowEdges: applyEdgeChanges(changes, get().flowEdges) });
    } else {
      // ERD: Clean up FK on target column when relationship is removed
      const removedIds = changes
        .filter(c => c.type === 'remove')
        .map(c => c.id);
      
      if (removedIds.length > 0) {
        const currentRelationships = get().relationships;
        const removedRels = currentRelationships.filter(r => removedIds.includes(r.id));
        const remainingRels = currentRelationships.filter(r => !removedIds.includes(r.id));

        set({
          relationships: applyEdgeChanges(changes, currentRelationships),
          tables: clearOrphanFk(get().tables, removedRels, remainingRels),
        });
      } else {
        set({ relationships: applyEdgeChanges(changes, get().relationships) });
      }
    }
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  onConnect: (connection) => {
    const { _vaultPath, _projectId, _filename, diagramMeta } = get();
    const type = diagramMeta?.type;
    // Snapshot diambil sebelum cabang mana pun mengubah state; baru dipakai
    // bila koneksi valid (cabang ERD bisa batal).
    const preConnect = captureSnapshot(get());

    if (type === 'usecase') {
      const relType = get().usecaseRelType || USECASE_REL_TYPES.ASSOCIATION;
      const newEdge = {
        ...connection,
        id: `uce-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'usecase',
        data: { relType },
      };
      set({ flowEdges: addEdge(newEdge, get().flowEdges) });
    } else if (type === 'flowchart') {
      const sourceNode = get().nodes.find(n => n.id === connection.source);
      let edgeLabel = '';

      if (sourceNode?.data?.type === 'decision') {
        const existingOutEdges = get().flowEdges.filter(e => e.source === sourceNode.id);
        edgeLabel = existingOutEdges.length === 0 ? 'Yes' : 'No';
      }

      const newEdge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        label: edgeLabel,
        type: 'smoothstep',
        style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
        labelStyle: { fill: '#e4e4e7', fontWeight: 600, fontSize: 12 },
        labelBgStyle: { fill: '#18181b', stroke: '#3f3f46', strokeWidth: 1 },
        labelBgPadding: [6, 4],
        labelBgBorderRadius: 4,
        markerEnd: { type: 'arrowclosed', color: '#a1a1aa' }
      };

      set({ flowEdges: addEdge(newEdge, get().flowEdges) });
    } else {
      // ERD: Set FK on target column like old version
      const { tables, relationships } = get();
      const sourceTable = tables.find(t => t.id === connection.source);
      const targetTable = tables.find(t => t.id === connection.target);
      const sourceCol = sourceTable?.data.columns.find(c => c.id === connection.sourceHandle);
      const targetCol = targetTable?.data.columns.find(c => c.id === connection.targetHandle);

      if (!sourceCol || !targetCol) return;

      // Arah relasi selalu source → target: FK jatuh ke kolom TARGET apa pun
      // status PK-nya. `pk` hanya dipakai untuk menentukan tipe kolom acuan.
      // Sengaja tidak memakai heuristik PK untuk memindah arah; `fk` harus
      // konsisten dengan clearOrphanFk yang membersihkan kolom target.
      const parentCol = sourceCol;
      const childCol = targetCol;
      const childTableId = connection.target;

      const edge = {
        ...connection,
        id: `rel-${Date.now()}`,
        type: 'smoothstep',
        animated: false,
        style: { strokeWidth: 1.5 }
      };

      const updatedTables = tables.map(t => {
        if (t.id === childTableId) {
          const updatedCols = t.data.columns.map(c =>
            c.id === childCol.id ? { ...c, type: parentCol.type, fk: true } : c
          );
          return { ...t, data: { ...t.data, columns: updatedCols } };
        }
        return t;
      });

      set({
        relationships: addEdge(edge, relationships),
        tables: updatedTables,
      });
    }
    // Satu snapshot per koneksi (setelah kemungkinan batal di cabang ERD).
    set((state) => ({ historyPast: pushStack(state.historyPast, preConnect), historyFuture: [] }));
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  updateCanvas: (viewport) => {
    const { _vaultPath, _projectId, _filename } = get();
    set({ canvasState: viewport });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  setSelectedTable: (id) => set({ selectedTableId: id }),

  /** Buang seluruh history (dipakai loadDiagram + cleanup). */
  resetHistory: () => {
    if (get()._historyTimer) clearTimeout(get()._historyTimer);
    _burstSnapshot = null;
    _dragInProgress = false;
    set({ historyPast: [], historyFuture: [], _historyTimer: null });
  },

  cleanup: () => {
    const { _autoSaveTimer } = get();
    if (_autoSaveTimer) {
      clearTimeout(_autoSaveTimer);
    }
    get().resetHistory();
    set({
      _autoSaveTimer: null,
      _pendingSave: null,
      _vaultPath: null,
      _projectId: null,
      _filename: null,
      diagramMeta: null,
      tables: [],
      relationships: [],
      nodes: [],
      flowEdges: [],
      canvasState: { x: 0, y: 0, zoom: 1 },
      isDirty: false,
      isLoading: false,
      loadError: null,
      selectedTableId: null,
    });
  }
}));