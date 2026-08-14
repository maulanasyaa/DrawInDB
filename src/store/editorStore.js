import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import {
  USECASE_NODE_TYPES,
  USECASE_REL_TYPES,
  USECASE_DEFAULT_SIZES,
  USECASE_DEFAULT_LABELS,
} from '../config/useCaseTypes';

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
  _vaultPath: null,
  _projectId: null,
  _filename: null,

  // State khusus Use Case: relationship type yang aktif untuk koneksi baru
  usecaseRelType: USECASE_REL_TYPES.ASSOCIATION,
  setUseCaseRelType: (relType) => set({ usecaseRelType: relType }),

  _autoSaveTimer: null,

  autoSave: () => {
    if (get()._autoSaveTimer) clearTimeout(get()._autoSaveTimer);
    const timer = setTimeout(() => {
      if (get().isDirty) get().saveDiagram();
    }, 1500);
    set({ _autoSaveTimer: timer });
  },

  loadDiagram: async (vaultPath, projectId, filename) => {
    set({ isLoading: true, _vaultPath: vaultPath, _projectId: projectId, _filename: filename });
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
      });
    } catch (e) {
      console.error('Failed to load diagram:', e);
      set({ isLoading: false });
    }
  },

  saveDiagram: async () => {
    const { _vaultPath, _projectId, _filename, diagramMeta, tables, relationships, nodes, flowEdges, canvasState, isDirty } = get();
    if (!_vaultPath || !_projectId || !_filename || !diagramMeta || !isDirty) return;

    try {
      const filePath = await window.api.pathJoin(_vaultPath, 'projects', _projectId, 'diagrams', _filename);
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
      set({ isDirty: false, diagramMeta: updatedMeta });
    } catch (e) {
      console.error('Failed to save diagram:', e);
    }
  },

  addTable: (position) => {
    const { tables } = get();
    const newTable = {
      id: `table-${Date.now()}`,
      type: 'table',
      position,
      data: { name: 'new_table', columns: [] }
    };
    set({ tables: [...tables, newTable], isDirty: true });
    get().autoSave();
  },

  addFlowNode: (type, position) => {
    const { nodes } = get();
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

    set({ nodes: [...nodes, newNode], isDirty: true });
    get().autoSave();
  },

  // === USE CASE: tambah node ===
  addUseCaseNode: (subtype, position) => {
    const { nodes } = get();
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
      set({ nodes: [newNode, ...nodes], isDirty: true });
    } else {
      set({ nodes: [...nodes, newNode], isDirty: true });
    }
    get().autoSave();
  },

  // === USE CASE: replace all (untuk import JSON) ===
  replaceUseCaseGraph: ({ nodes, edges, canvasState }) => {
    set({
      nodes: nodes || [],
      flowEdges: edges || [],
      canvasState: canvasState || get().canvasState,
      isDirty: true,
    });
    get().autoSave();
  },

  updateNodeData: (id, newData) => {
    const { nodes } = get();
    set({
      nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n),
      isDirty: true
    });
    get().autoSave();
  },

  onNodesChange: (changes) => {
    const type = get().diagramMeta?.type;
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

      set({ nodes: nextNodes, flowEdges: nextEdges, isDirty: true });
    } else {
      set({ tables: applyNodeChanges(changes, get().tables), isDirty: true });
    }
    get().autoSave();
  },

  onEdgesChange: (changes) => {
    const type = get().diagramMeta?.type;
    if (isNodeBasedType(type)) {
      set({ flowEdges: applyEdgeChanges(changes, get().flowEdges), isDirty: true });
    } else {
      set({ relationships: applyEdgeChanges(changes, get().relationships), isDirty: true });
    }
    get().autoSave();
  },

  onConnect: (connection) => {
    const type = get().diagramMeta?.type;

    if (type === 'usecase') {
      const relType = get().usecaseRelType || USECASE_REL_TYPES.ASSOCIATION;
      const newEdge = {
        ...connection,
        id: `uce-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'usecase',
        data: { relType },
      };
      set({ flowEdges: addEdge(newEdge, get().flowEdges), isDirty: true });
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

      set({ flowEdges: addEdge(newEdge, get().flowEdges), isDirty: true });
    } else {
      const newRel = { ...connection, id: `rel-${Date.now()}` };
      set({ relationships: addEdge(newRel, get().relationships), isDirty: true });
    }
    get().autoSave();
  },

  updateCanvas: (viewport) => {
    set({ canvasState: viewport, isDirty: true });
    get().autoSave();
  },

  setSelectedTable: (id) => set({ selectedTableId: id })
}));