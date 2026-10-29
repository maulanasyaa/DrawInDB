import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import {
  USECASE_NODE_TYPES,
  USECASE_REL_TYPES,
  USECASE_DEFAULT_SIZES,
  USECASE_DEFAULT_LABELS,
} from '../config/useCaseTypes';
import { useToastStore } from './toastStore';

// Helper: diagram type ini pakai `nodes` + `flowEdges` (bukan `tables` + `relationships`)
const isNodeBasedType = (type) => type === 'flowchart' || type === 'usecase';

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
    set({ tables: [...tables, newTable] });
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
      set({ nodes: [...nodes, newNode] });
    }
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  // === USE CASE: replace all (untuk import JSON) ===
  replaceUseCaseGraph: ({ nodes, edges, canvasState }) => {
    const { _vaultPath, _projectId, _filename } = get();
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
    set({
      nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n),
    });
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  onNodesChange: (changes) => {
    const { _vaultPath, _projectId, _filename, diagramMeta } = get();
    const type = diagramMeta?.type;
    if (isNodeBasedType(type)) {
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
    if (isNodeBasedType(type)) {
      set({ flowEdges: applyEdgeChanges(changes, get().flowEdges) });
    } else {
      set({ relationships: applyEdgeChanges(changes, get().relationships) });
    }
    get().markDirty(_vaultPath, _projectId, _filename);
    get().autoSave();
  },

  onConnect: (connection) => {
    const { _vaultPath, _projectId, _filename, diagramMeta } = get();
    const type = diagramMeta?.type;

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
      const newRel = { ...connection, id: `rel-${Date.now()}` };
      set({ relationships: addEdge(newRel, get().relationships) });
    }
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

  cleanup: () => {
    const { _autoSaveTimer } = get();
    if (_autoSaveTimer) {
      clearTimeout(_autoSaveTimer);
    }
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