import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import { useVaultStore } from './vaultStore';

export const useEditorStore = create((set, get) => ({
  diagramMeta: null,
  tables: [],
  relationships: [],
  canvasState: { zoom: 1, pan: { x: 0, y: 0 } },
  
  selectedTableId: null,
  isSidebarOpen: true,
  isDirty: false,
  isLoading: true,
  
  _vaultPath: null,
  _filename: null,
  _saveTimeout: null,

  loadDiagram: async (vaultPath, filename) => {
    set({ isLoading: true, _vaultPath: vaultPath, _filename: filename });
    try {
      const filePath = await window.api.pathJoin(vaultPath, 'diagrams', filename);
      const content = await window.api.readFile(filePath);
      const data = JSON.parse(content);

      set({
        diagramMeta: data.meta,
        tables: data.tables || [],
        relationships: data.relationships || [],
        canvasState: data.canvas || { zoom: 1, pan: { x: 0, y: 0 } },
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
    const { _vaultPath, _filename, diagramMeta, tables, relationships, canvasState, isDirty } = get();
    if (!_vaultPath || !_filename || !diagramMeta || !isDirty) return;

    try {
      const filePath = await window.api.pathJoin(_vaultPath, 'diagrams', _filename);
      
      const updatedMeta = { ...diagramMeta, updated_at: new Date().toISOString() };
      
      const fileData = {
        version: "1.0",
        meta: updatedMeta,
        canvas: canvasState,
        tables,
        relationships,
        notes: []
      };

      await window.api.writeFile(filePath, JSON.stringify(fileData, null, 2));
      
      // ONLY update isDirty to minimize re-renders. Avoid modifying diagramMeta inline if it's subscribed to by many components.
      // We do need to keep the state's meta updated for the NEXT save though, but we can just do it silently or as a single patch.
      set({ isDirty: false, diagramMeta: updatedMeta });
      
      // Update vaultStore silently if possible, or wait until reload. The list is only shown on Home.
      // For now, doing it here is fine as long as Editor.jsx does not subscribe to the whole currentVault.
      const vaultStore = useVaultStore.getState();
      if (vaultStore.currentVault) {
        const updatedDiagrams = vaultStore.currentVault.diagrams.map(d => 
          d.filename === _filename ? { ...d, updated_at: updatedMeta.updated_at } : d
        );
        useVaultStore.setState({
          currentVault: { ...vaultStore.currentVault, diagrams: updatedDiagrams }
        });
      }
    } catch (e) {
      console.error('Failed to save diagram:', e);
    }
  },

  autoSave: () => {
    const { _saveTimeout, saveDiagram } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);
    
    const timeout = setTimeout(() => {
      // Don't use get().saveDiagram(), access it cleanly
      useEditorStore.getState().saveDiagram();
    }, 1500);

    set({ _saveTimeout: timeout, isDirty: true });
  },

  // React Flow generic handlers
  onNodesChange: (changes) => {
    set((state) => ({
      tables: applyNodeChanges(changes, state.tables),
      isDirty: true
    }));
    get().autoSave();
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      relationships: applyEdgeChanges(changes, state.relationships),
      isDirty: true
    }));
    get().autoSave();
  },

  onConnect: (connection) => {
    const { tables } = get();
    const sourceTable = tables.find(t => t.id === connection.source);
    const sourceCol = sourceTable?.data.columns.find(c => c.id === connection.sourceHandle);
    
    const edge = { 
      ...connection, 
      id: `edge-${Date.now()}`,
      label: `fk_${sourceTable?.data.name}_${sourceCol?.name}`,
      type: 'smoothstep',
      animated: false,
      style: { strokeWidth: 2 }
    };

    set((state) => ({
      relationships: addEdge(edge, state.relationships),
      isDirty: true
    }));
    get().autoSave();
  },

  // Table Actions
  addTable: (position = { x: 200, y: 200 }) => {
    const { tables } = get();
    // Auto-increment table name
    let num = tables.length + 1;
    let name = `table_${num}`;
    while(tables.some(t => t.data.name === name)) {
      num++;
      name = `table_${num}`;
    }

    // Resolve overlap for new node position using bounding box logic
    let finalPos = { ...position };
    let isOccupied = true;
    let attempts = 0;
    while (isOccupied && attempts < 50) {
      isOccupied = tables.some(t => {
        const w2 = t.width || 260;
        const h2 = t.height || 200;
        const overlapX = finalPos.x < t.position.x + w2 && finalPos.x + 260 > t.position.x;
        const overlapY = finalPos.y < t.position.y + h2 && finalPos.y + 200 > t.position.y;
        return overlapX && overlapY;
      });
      if (isOccupied) {
        finalPos.x += 40;
        finalPos.y += 40;
        attempts++;
      }
    }

    const newTable = {
      id: `table-${Date.now()}`,
      type: 'tableNode',
      position: finalPos,
      data: {
        name,
        columns: [
          { id: `col-${Date.now()}`, name: 'id', type: 'INTEGER', pk: true, fk: false, notNull: true, unique: true }
        ]
      }
    };

    set({ tables: [...tables, newTable], isDirty: true });
    get().autoSave();
  },

  updateTable: (tableId, dataUpdates) => {
    set((state) => ({
      tables: state.tables.map(t => t.id === tableId ? { ...t, data: { ...t.data, ...dataUpdates } } : t),
      isDirty: true
    }));
    get().autoSave();
  },

  deleteTable: (tableId) => {
    set((state) => ({
      tables: state.tables.filter(t => t.id !== tableId),
      relationships: state.relationships.filter(e => e.source !== tableId && e.target !== tableId),
      selectedTableId: state.selectedTableId === tableId ? null : state.selectedTableId,
      isDirty: true
    }));
    get().autoSave();
  },

  toggleTableVisibility: (tableId) => {
    set((state) => ({
      tables: state.tables.map(t => t.id === tableId ? { ...t, hidden: !t.hidden } : t),
      isDirty: true
    }));
    get().autoSave();
  },

  duplicateTable: (tableId) => {
    const { tables } = get();
    const tableToClone = tables.find(t => t.id === tableId);
    if (!tableToClone) return;

    const newTable = {
      ...tableToClone,
      id: `table-${Date.now()}`,
      position: { x: tableToClone.position.x + 50, y: tableToClone.position.y + 50 },
      data: {
        ...tableToClone.data,
        name: `${tableToClone.data.name}_copy`,
        columns: tableToClone.data.columns.map(c => ({ ...c, id: `col-${Date.now()}-${Math.random()}` }))
      }
    };

    set({ tables: [...tables, newTable], isDirty: true });
    get().autoSave();
  },

  // Column Actions
  addColumn: (tableId) => {
    set((state) => ({
      tables: state.tables.map(t => {
        if (t.id === tableId) {
          const newCol = { id: `col-${Date.now()}`, name: 'new_column', type: 'VARCHAR', pk: false, fk: false, notNull: false, unique: false };
          return { ...t, data: { ...t.data, columns: [...t.data.columns, newCol] } };
        }
        return t;
      }),
      isDirty: true
    }));
    get().autoSave();
  },

  updateColumn: (tableId, columnId, dataUpdates) => {
    set((state) => ({
      tables: state.tables.map(t => {
        if (t.id === tableId) {
          const updatedColumns = t.data.columns.map(c => c.id === columnId ? { ...c, ...dataUpdates } : c);
          return { ...t, data: { ...t.data, columns: updatedColumns } };
        }
        return t;
      }),
      isDirty: true
    }));
    get().autoSave();
  },

  deleteColumn: (tableId, columnId) => {
    set((state) => {
      // Also remove relationships tied to this column
      const newEdges = state.relationships.filter(e => !(
        (e.source === tableId && e.sourceHandle === columnId) || 
        (e.target === tableId && e.targetHandle === columnId)
      ));

      const newTables = state.tables.map(t => {
        if (t.id === tableId) {
          return { ...t, data: { ...t.data, columns: t.data.columns.filter(c => c.id !== columnId) } };
        }
        return t;
      });

      return { tables: newTables, relationships: newEdges, isDirty: true };
    });
    get().autoSave();
  },

  reorderColumns: (tableId, oldIndex, newIndex) => {
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
      isDirty: true
    }));
    get().autoSave();
  },

  // Relationship actions
  updateRelationshipLabel: (edgeId, label) => {
    set((state) => ({
      relationships: state.relationships.map(e => e.id === edgeId ? { ...e, label } : e),
      isDirty: true
    }));
    get().autoSave();
  },

  deleteRelationship: (edgeId) => {
    set((state) => ({
      relationships: state.relationships.filter(e => e.id !== edgeId),
      isDirty: true
    }));
    get().autoSave();
  },

  // UI / Canvas
  setSelectedTable: (id) => set({ selectedTableId: id }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  setCanvasState: (viewport) => {
    set({ canvasState: viewport, isDirty: true });
    get().autoSave();
  },
  
  forceSave: () => {
    get().saveDiagram();
  }
}));
