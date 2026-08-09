import { create } from 'zustand';

export const useVaultStore = create((set, get) => ({
  currentVault: null, // { path, name, diagrams: [] }
  recentVaults: [],   // [ { path, name } ]
  isLoading: false,
  error: null,

  loadRecentVaults: async () => {
    try {
      const paths = await window.api.getRecentVaults();
      const recentVaults = paths.map(p => ({
        path: p,
        name: p.split(/[/\\]/).pop()
      }));
      set({ recentVaults });
    } catch (error) {
      console.error('Failed to load recent vaults:', error);
    }
  },

  openVault: async (folderPath) => {
    set({ isLoading: true, error: null });
    try {
      const configPath = await window.api.pathJoin(folderPath, '.drawindb', 'config.json');
      const exists = await window.api.pathExists(configPath);
      
      if (!exists) {
        throw new Error('Not a valid DrawInDB vault. Missing .drawindb/config.json');
      }

      const configStr = await window.api.readFile(configPath);
      const config = JSON.parse(configStr);

      const diagramsPath = await window.api.pathJoin(folderPath, 'diagrams');
      const files = await window.api.listFiles(diagramsPath);
      
      const diagrams = [];
      for (const file of files) {
        if (!file.isDirectory && file.name.endsWith('.json')) {
          const filePath = await window.api.pathJoin(diagramsPath, file.name);
          try {
            const content = await window.api.readFile(filePath);
            const diagramData = JSON.parse(content);
            diagrams.push({
              filename: file.name,
              name: diagramData.meta?.name || file.name.replace('.json', ''),
              db_type: diagramData.meta?.db_type || 'generic',
              updated_at: diagramData.meta?.updated_at,
            });
          } catch (e) {
            console.error('Failed to read diagram:', file.name);
          }
        }
      }

      // Sort by updated_at descending
      diagrams.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      await window.api.saveRecentVault(folderPath);

      set({ 
        currentVault: { 
          path: folderPath, 
          name: config.vault_name || folderPath.split(/[/\\]/).pop(),
          diagrams 
        },
        isLoading: false 
      });

      get().loadRecentVaults(); // Reload recent vaults
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createVault: async (folderPath) => {
    set({ isLoading: true, error: null });
    try {
      const drawindbPath = await window.api.pathJoin(folderPath, '.drawindb');
      const diagramsPath = await window.api.pathJoin(folderPath, 'diagrams');
      
      const exists = await window.api.pathExists(drawindbPath);
      if (exists) {
        throw new Error('Vault already exists in this directory.');
      }

      await window.api.mkdir(drawindbPath);
      await window.api.mkdir(diagramsPath);

      const vaultName = folderPath.split(/[/\\]/).pop();
      const config = {
        vault_name: vaultName,
        created_at: new Date().toISOString(),
        version: "1.0"
      };

      const configPath = await window.api.pathJoin(drawindbPath, 'config.json');
      await window.api.writeFile(configPath, JSON.stringify(config, null, 2));

      await window.api.saveRecentVault(folderPath);

      set({ 
        currentVault: { 
          path: folderPath, 
          name: vaultName,
          diagrams: [] 
        },
        isLoading: false 
      });

      get().loadRecentVaults();
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  closeVault: () => {
    set({ currentVault: null, error: null });
  },

  createDiagram: async (name, dbType) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ isLoading: true, error: null });
    try {
      const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      let filename = `${safeName}.json`;
      let counter = 1;
      
      // Ensure unique filename
      const diagramsPath = await window.api.pathJoin(currentVault.path, 'diagrams');
      let filePath = await window.api.pathJoin(diagramsPath, filename);
      
      while (await window.api.pathExists(filePath)) {
        filename = `${safeName}_${counter}.json`;
        filePath = await window.api.pathJoin(diagramsPath, filename);
        counter++;
      }

      const newDiagram = {
        version: "1.0",
        meta: {
          name: name,
          db_type: dbType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        canvas: {
          zoom: 1,
          pan: { x: 0, y: 0 }
        },
        tables: [],
        relationships: [],
        notes: []
      };

      await window.api.writeFile(filePath, JSON.stringify(newDiagram, null, 2));

      const updatedDiagrams = [{
        filename,
        name: newDiagram.meta.name,
        db_type: newDiagram.meta.db_type,
        updated_at: newDiagram.meta.updated_at
      }, ...currentVault.diagrams];

      set({
        currentVault: { ...currentVault, diagrams: updatedDiagrams },
        isLoading: false
      });
      
      return filename;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteDiagram: async (filename) => {
    const { currentVault } = get();
    if (!currentVault) return;
    
    set({ isLoading: true, error: null });
    try {
      const filePath = await window.api.pathJoin(currentVault.path, 'diagrams', filename);
      await window.api.deleteFile(filePath);

      const updatedDiagrams = currentVault.diagrams.filter(d => d.filename !== filename);
      set({
        currentVault: { ...currentVault, diagrams: updatedDiagrams },
        isLoading: false
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  renameDiagram: async (filename, newName) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ isLoading: true, error: null });
    try {
      const filePath = await window.api.pathJoin(currentVault.path, 'diagrams', filename);
      
      // We don't rename the file itself currently, just the meta.name inside it, 
      // but if the requirement implies renaming the file too we should.
      // Wait, "renameDiagram(filename, newName)" -> let's just update the meta.name for simplicity, 
      // or change the filename too? Let's just update the JSON meta.name, that's safer and less prone to broken links.
      const content = await window.api.readFile(filePath);
      const diagramData = JSON.parse(content);
      
      diagramData.meta.name = newName;
      diagramData.meta.updated_at = new Date().toISOString();
      
      await window.api.writeFile(filePath, JSON.stringify(diagramData, null, 2));

      const updatedDiagrams = currentVault.diagrams.map(d => {
        if (d.filename === filename) {
          return { ...d, name: newName, updated_at: diagramData.meta.updated_at };
        }
        return d;
      });

      // Re-sort
      updatedDiagrams.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      set({
        currentVault: { ...currentVault, diagrams: updatedDiagrams },
        isLoading: false
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  }
}));
