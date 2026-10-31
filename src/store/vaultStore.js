import { create } from 'zustand';
import { createPrdDoc, sanitizeDocFilename, docDisplayName } from '../utils/prd.js';
import { getDiagramType } from '../config/diagramTypes';
import { emptySequence } from '../utils/sequence';
import { copyName, buildDiagramCopy } from '../utils/diagramCopy';

// Electron membungkus error main process: "Error invoking remote method 'x': Error: msg"
const ipcMessage = (e) =>
  String(e?.message ?? e).replace(/^Error invoking remote method '[^']*': (?:Error: )?/, '');

/** Filename diagram unik di folder diagrams/: `<slug>_<type>.json`, suffix `_1`, `_2`, … bila bentrok. */
async function uniqueFilename(diagramsPath, name, type) {
  const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  let filename = `${safeName}_${type}.json`;
  let filePath = await window.api.pathJoin(diagramsPath, filename);
  let counter = 1;

  while (await window.api.pathExists(filePath)) {
    filename = `${safeName}_${type}_${counter}.json`;
    filePath = await window.api.pathJoin(diagramsPath, filename);
    counter++;
  }

  return { filename, filePath };
}

export const useVaultStore = create((set, get) => ({
  currentVault: null, // { path, name, projects: [] }
  recentVaults: [],
  isLoading: false,
  error: null,

  openVault: async (folderPath) => {
    set({ isLoading: true, error: null });
    try {
      // Set vault path FIRST before any file operations to pass vault access validation
      await window.api.setCurrentVaultPath(folderPath);
      
      const configPath = await window.api.pathJoin(folderPath, '.drawindb', 'config.json');
      const exists = await window.api.pathExists(configPath);

      if (!exists) {
        throw new Error('Not a valid DrawInDB vault. Missing config.');
      }

      const configStr = await window.api.readFile(configPath);
      const config = JSON.parse(configStr);

      // Skip migration if already done
      if (config.migrated) {
        // proceed to load projects
      } else {
        // AUTO-MIGRATION LOGIC (Legacy ke struktur Project)
        const legacyDiagramsPath = await window.api.pathJoin(folderPath, 'diagrams');
        const legacyExists = await window.api.pathExists(legacyDiagramsPath);
        const projectsPath = await window.api.pathJoin(folderPath, 'projects');

        if (!await window.api.pathExists(projectsPath)) {
          await window.api.mkdir(projectsPath);
        }

        if (legacyExists) {
          const legacyFiles = await window.api.listFiles(legacyDiagramsPath);
          const legacyDiagrams = legacyFiles.filter(f => !f.isDirectory && f.name.endsWith('.json'));

          if (legacyDiagrams.length > 0) {
            // Buat Default Project
            const defaultProjId = `proj_${Date.now()}`;
            const defaultProjPath = await window.api.pathJoin(projectsPath, defaultProjId);
            await window.api.mkdir(defaultProjPath);
            await window.api.mkdir(await window.api.pathJoin(defaultProjPath, 'diagrams'));

            // Simpan metadata project
            await window.api.writeFile(
              await window.api.pathJoin(defaultProjPath, 'project.json'),
              JSON.stringify({ id: defaultProjId, name: "Default Project", createdAt: new Date().toISOString() })
            );

            // Pindahkan file lama ke dalam struktur baru
            for (const file of legacyDiagrams) {
              const oldPath = await window.api.pathJoin(legacyDiagramsPath, file.name);
              const newPath = await window.api.pathJoin(defaultProjPath, 'diagrams', file.name);
              const content = await window.api.readFile(oldPath);
              const parsed = JSON.parse(content);
              parsed.meta.projectId = defaultProjId;
              parsed.meta.type = 'erd'; // Set eksplisit ERD untuk file lama
              await window.api.writeFile(newPath, JSON.stringify(parsed, null, 2));
              await window.api.deleteFile(oldPath);
            }
          }
        }

        // Mark migration as complete
        if (!config.migrated) {
          config.migrated = true;
          await window.api.writeFile(configPath, JSON.stringify(config, null, 2));
        }
      }

      // LOAD PROJECTS
      const projectDirs = await window.api.listFiles(projectsPath);
      const projects = [];

      for (const item of projectDirs) {
        const dirName = typeof item === 'string' ? item : item.name;
        const projPath = await window.api.pathJoin(projectsPath, dirName);
        const metaPath = await window.api.pathJoin(projPath, 'project.json');

        if (await window.api.pathExists(metaPath)) {
          const projMeta = JSON.parse(await window.api.readFile(metaPath));

          const diagramsDir = await window.api.pathJoin(projPath, 'diagrams');
          const diagrams = [];

          if (await window.api.pathExists(diagramsDir)) {
            const dFiles = await window.api.listFiles(diagramsDir);

            for (const fileItem of dFiles) {
              const fileName = typeof fileItem === 'string' ? fileItem : fileItem.name;

              if (fileName.endsWith('.json')) {
                const dPath = await window.api.pathJoin(diagramsDir, fileName);
                const dContent = JSON.parse(await window.api.readFile(dPath));
                diagrams.push({
                  filename: fileName,
                  name: dContent.meta.name,
                  type: dContent.meta.type || 'erd',
                  db_type: dContent.meta.db_type,
                  updated_at: dContent.meta.updated_at
                });
              }
            }
          }

          projects.push({ ...projMeta, diagrams });
        }
      }

      await window.api.saveRecentVault(folderPath);
      await window.api.setCurrentVaultPath(folderPath);
      set({
        currentVault: { path: folderPath, name: config.vault_name, projects },
        isLoading: false
      });

    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Fungsi createProject (Tambahan baru)
  createProject: async (name) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ isLoading: true, error: null });
    try {
      const projectId = `proj_${Date.now()}`;
      const projectPath = await window.api.pathJoin(currentVault.path, 'projects', projectId);

      // Buat struktur folder project baru
      await window.api.mkdir(projectPath);
      await window.api.mkdir(await window.api.pathJoin(projectPath, 'diagrams'));

      const newProject = {
        id: projectId,
        name: name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simpan metadata project
      const metaPath = await window.api.pathJoin(projectPath, 'project.json');
      await window.api.writeFile(metaPath, JSON.stringify(newProject, null, 2));

      // Perbarui state di memori
      const updatedProjects = [{ ...newProject, diagrams: [] }, ...(currentVault.projects || [])];
      set({
        currentVault: { ...currentVault, projects: updatedProjects },
        isLoading: false
      });

      return projectId; // Mengembalikan ID untuk kebutuhan routing
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  loadRecentVaults: async () => {
    if (!window.api) {
      console.warn("window.api not found. Running in browser mode?");
      return;
    }

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
      // Pindahkan guard IPC ke vault baru SEBELUM menyentuh file apa pun.
      // Tanpa ini, membuka vault lain setelah satu vault terbuka ditolak
      // assertVaultAccess di main process.
      await window.api.setCurrentVaultPath(folderPath);

      const configPath = await window.api.pathJoin(folderPath, '.drawindb', 'config.json');
      if (!(await window.api.pathExists(configPath))) {
        throw new Error('Not a valid DrawInDB vault. Missing config.');
      }

      const configStr = await window.api.readFile(configPath);
      const config = JSON.parse(configStr);

      const projectsPath = await window.api.pathJoin(folderPath, 'projects');
      if (!(await window.api.pathExists(projectsPath))) {
        await window.api.mkdir(projectsPath);
      }

      const projects = [];

      try {
        const projectDirs = await window.api.listFiles(projectsPath);

        for (const item of projectDirs) {
          // Normalisasi format item (berjaga-jaga jika API mengembalikan string atau objek)
          const dirName = typeof item === 'string' ? item : (item.name || '');

          // Lewati file sistem Mac seperti .DS_Store atau file tersembunyi iCloud
          if (!dirName || dirName.startsWith('.')) continue;

          const projPath = await window.api.pathJoin(projectsPath, dirName);
          const metaPath = await window.api.pathJoin(projPath, 'project.json');

          if (await window.api.pathExists(metaPath)) {
            try {
              // Gunakan pelindung try-catch khusus di dalam sini
              // agar jika 1 project gagal dibaca, project lain tetap aman
              const metaContent = await window.api.readFile(metaPath);
              const projMeta = JSON.parse(metaContent);

              const diagramsDir = await window.api.pathJoin(projPath, 'diagrams');
              const diagrams = [];

              if (await window.api.pathExists(diagramsDir)) {
                const dFiles = await window.api.listFiles(diagramsDir);

                for (const fileItem of dFiles) {
                  const fileName = typeof fileItem === 'string' ? fileItem : (fileItem.name || '');
                  if (!fileName || fileName.startsWith('.')) continue; // Abaikan .DS_Store di dalam folder diagrams

                  if (fileName.endsWith('.json')) {
                    try {
                      const dPath = await window.api.pathJoin(diagramsDir, fileName);
                      const dContent = JSON.parse(await window.api.readFile(dPath));
                      diagrams.push({
                        filename: fileName,
                        name: dContent.meta?.name || 'Untitled',
                        type: dContent.meta?.type || 'erd',
                        db_type: dContent.meta?.db_type,
                        updated_at: dContent.meta?.updated_at || new Date().toISOString()
                      });
                    } catch (err) {
                      console.error(`Gagal membaca diagram ${fileName}:`, err);
                    }
                  }
                }
              }

              // Urutkan diagram dari yang paling baru diubah
              diagrams.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

              // Dokumen PRD. Folder docs/ opsional: project lama tanpa docs/
              // hanya mendapat `documents: []`. File rusak dilewati, bukan fatal.
              const documents = [];
              const docsDir = await window.api.pathJoin(projPath, 'docs');
              if (await window.api.pathExists(docsDir)) {
                const docFiles = await window.api.listFiles(docsDir);

                for (const docItem of docFiles) {
                  const docName = typeof docItem === 'string' ? docItem : (docItem.name || '');
                  if (!docName || docName.startsWith('.') || !docName.endsWith('.json')) continue;

                  try {
                    const docPath = await window.api.pathJoin(docsDir, docName);
                    const doc = JSON.parse(await window.api.readFile(docPath));
                    documents.push({
                      filename: docName,
                      name: doc.meta?.name || docDisplayName(docName),
                      type: doc.meta?.type || 'prd',
                      updated_at: doc.meta?.updated_at || ''
                    });
                  } catch (err) {
                    console.error(`Gagal membaca dokumen ${docName}:`, err);
                  }
                }
              }
              documents.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

              projects.push({ ...projMeta, diagrams, documents });
            } catch (err) {
              console.error(`Gagal memuat project ${dirName}:`, err);
            }
          }
        }
      } catch (err) {
        console.error("Gagal menelusuri folder projects:", err);
      }

      projects.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

      await window.api.saveRecentVault(folderPath);

      set({
        currentVault: { path: folderPath, name: config.vault_name, projects },
        isLoading: false
      });

    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createVault: async (folderPath) => {
    set({ isLoading: true, error: null });
    try {
      // Set vault path FIRST before any file operations to pass vault access validation
      await window.api.setCurrentVaultPath(folderPath);
      
      const drawindbPath = await window.api.pathJoin(folderPath, '.drawindb');
      const diagramsPath = await window.api.pathJoin(folderPath, 'diagrams');

      // Folder sudah berupa vault: buka saja, jangan timpa.
      if (await window.api.pathExists(drawindbPath)) {
        await get().openVault(folderPath);
        get().loadRecentVaults();
        return;
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

      // Muat lewat loader yang sama supaya bentuknya identik dengan vault yang
      // dibuka (projects: [], documents: [], dst). Sebelumnya di sini diset
      // {path, name, diagrams: []} tanpa `projects`, sehingga Home tidak
      // merender empty state maupun kartu.
      await get().openVault(folderPath);
      get().loadRecentVaults();
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  closeVault: () => {
    set({ currentVault: null, error: null });
  },

  // --- PROJECT ACTIONS ---

  renameProject: async (projectId, newName) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ isLoading: true, error: null });
    try {
      const metaPath = await window.api.pathJoin(currentVault.path, 'projects', projectId, 'project.json');
      const content = await window.api.readFile(metaPath);
      const projectData = JSON.parse(content);

      projectData.name = newName;
      projectData.updatedAt = new Date().toISOString();

      await window.api.writeFile(metaPath, JSON.stringify(projectData, null, 2));

      const updatedProjects = currentVault.projects.map(p =>
        p.id === projectId ? { ...p, name: newName, updatedAt: projectData.updatedAt } : p
      );

      set({ currentVault: { ...currentVault, projects: updatedProjects }, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteProject: async (projectId) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ error: null });
    try {
      const projectPath = await window.api.pathJoin(currentVault.path, 'projects', projectId);

      // Folder project berisi diagrams/ + docs/; dipindah utuh ke Trash OS.
      await window.api.trashPath(projectPath);

      // State dibersihkan setelah trash sukses supaya gagal tidak menyisakan
      // baris hantu. recentVaults menyimpan vault, bukan project.
      set({ currentVault: { ...currentVault, projects: currentVault.projects.filter(p => p.id !== projectId) } });
    } catch (error) {
      throw new Error(ipcMessage(error));
    }
  },

  // --- DIAGRAM ACTIONS ---

  createDiagram: async (projectId, name, type, dbType = null) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ isLoading: true, error: null });
    try {
      const diagramsPath = await window.api.pathJoin(currentVault.path, 'projects', projectId, 'diagrams');
      const { filename, filePath } = await uniqueFilename(diagramsPath, name, type);

      const newDiagram = {
        version: "1.0",
        meta: {
          projectId: projectId,
          name: name,
          type: type,
          db_type: dbType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        canvas: {
          x: 0,
          y: 0,
          zoom: 1
        },
        tables: [],
        relationships: [],
        nodes: []
      };

      // Template awal tipe sequence: model berurutan, bukan node/edge.
      if (getDiagramType(type).dataShape === 'sequence') {
        const seq = emptySequence();
        newDiagram.participants = seq.participants;
        newDiagram.messages = seq.messages;
        newDiagram.options = seq.options;
      }

      await window.api.writeFile(filePath, JSON.stringify(newDiagram, null, 2));

      const newDiagramMeta = {
        filename,
        name: newDiagram.meta.name,
        type: newDiagram.meta.type,
        db_type: newDiagram.meta.db_type,
        updated_at: newDiagram.meta.updated_at
      };

      const updatedProjects = currentVault.projects.map(proj => {
        if (proj.id === projectId) {
          return { ...proj, diagrams: [newDiagramMeta, ...proj.diagrams] };
        }
        return proj;
      });

      set({
        currentVault: { ...currentVault, projects: updatedProjects },
        isLoading: false
      });

      return filename;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Salin diagram apa adanya (semua tipe, tanpa percabangan) dengan id/filename
   * baru dan nama "<nama> (salinan)". Riwayat undo tidak ada di file, jadi ikut
   * hilang dengan sendirinya. Kembalikan filename salinan untuk navigasi.
   */
  duplicateDiagram: async (projectId, filename) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ isLoading: true, error: null });
    try {
      const project = currentVault.projects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const diagramsPath = await window.api.pathJoin(currentVault.path, 'projects', projectId, 'diagrams');
      const source = JSON.parse(await window.api.readFile(await window.api.pathJoin(diagramsPath, filename)));

      const type = source.meta?.type || 'erd';
      const name = copyName(source.meta?.name || 'Untitled', (project.diagrams || []).map(d => d.name));
      const copy = buildDiagramCopy(source, { projectId, name });
      const { filename: newFilename, filePath } = await uniqueFilename(diagramsPath, name, type);

      await window.api.writeFile(filePath, JSON.stringify(copy, null, 2));

      const newDiagramMeta = {
        filename: newFilename,
        name: copy.meta.name,
        type,
        db_type: copy.meta.db_type,
        updated_at: copy.meta.updated_at
      };

      const updatedProjects = currentVault.projects.map(proj => {
        if (proj.id === projectId) {
          return { ...proj, diagrams: [newDiagramMeta, ...proj.diagrams] };
        }
        return proj;
      });

      set({
        currentVault: { ...currentVault, projects: updatedProjects },
        isLoading: false
      });

      return newFilename;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw new Error(ipcMessage(error));
    }
  },

  deleteDiagram: async (projectId, filename) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ error: null });
    try {
      const filePath = await window.api.pathJoin(currentVault.path, 'projects', projectId, 'diagrams', filename);
      await window.api.trashPath(filePath);

      const updatedProjects = currentVault.projects.map(proj => {
        if (proj.id === projectId) {
          return { ...proj, diagrams: proj.diagrams.filter(d => d.filename !== filename) };
        }
        return proj;
      });

      set({ currentVault: { ...currentVault, projects: updatedProjects } });
    } catch (error) {
      throw new Error(ipcMessage(error));
    }
  },

  renameDiagram: async (projectId, filename, newName) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ isLoading: true, error: null });
    try {
      const filePath = await window.api.pathJoin(currentVault.path, 'projects', projectId, 'diagrams', filename);
      const content = await window.api.readFile(filePath);
      const diagramData = JSON.parse(content);

      diagramData.meta.name = newName;
      diagramData.meta.updated_at = new Date().toISOString();

      await window.api.writeFile(filePath, JSON.stringify(diagramData, null, 2));

      const updatedProjects = currentVault.projects.map(proj => {
        if (proj.id === projectId) {
          const updatedDiagrams = proj.diagrams.map(d => {
            if (d.filename === filename) {
              return { ...d, name: newName, updated_at: diagramData.meta.updated_at };
            }
            return d;
          });
          // Sort ulang berdasarkan update terakhir
          updatedDiagrams.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          return { ...proj, diagrams: updatedDiagrams };
        }
        return proj;
      });

      set({
        currentVault: { ...currentVault, projects: updatedProjects },
        isLoading: false
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // --- DOCUMENT ACTIONS (PRD) ---
  // Bukan tipe diagram: file di projects/<id>/docs/, bukan diagrams/.

  createDocument: async (projectId, name) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ isLoading: true, error: null });
    try {
      const docsPath = await window.api.pathJoin(currentVault.path, 'projects', projectId, 'docs');
      await window.api.mkdir(docsPath); // recursive: dibuat saat dokumen pertama

      const base = sanitizeDocFilename(name).replace(/\.json$/, '');
      let filename = `${base}.json`;
      let counter = 1;
      let filePath = await window.api.pathJoin(docsPath, filename);

      while (await window.api.pathExists(filePath)) {
        filename = `${base}_${counter}.json`;
        filePath = await window.api.pathJoin(docsPath, filename);
        counter++;
      }

      const doc = createPrdDoc(projectId, name);
      await window.api.writeFile(filePath, JSON.stringify(doc, null, 2));

      const newDocMeta = {
        filename,
        name: doc.meta.name,
        type: doc.meta.type,
        updated_at: doc.meta.updated_at
      };

      const updatedProjects = currentVault.projects.map(proj => {
        if (proj.id === projectId) {
          return { ...proj, documents: [newDocMeta, ...(proj.documents || [])] };
        }
        return proj;
      });

      set({
        currentVault: { ...currentVault, projects: updatedProjects },
        isLoading: false
      });

      return filename;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  renameDocument: async (projectId, filename, newName) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ isLoading: true, error: null });
    try {
      const filePath = await window.api.pathJoin(currentVault.path, 'projects', projectId, 'docs', filename);
      const doc = JSON.parse(await window.api.readFile(filePath));

      doc.meta = { ...(doc.meta || {}), name: newName, updated_at: new Date().toISOString() };
      await window.api.writeFile(filePath, JSON.stringify(doc, null, 2));

      const updatedProjects = currentVault.projects.map(proj => {
        if (proj.id === projectId) {
          const documents = (proj.documents || []).map(d =>
            d.filename === filename ? { ...d, name: newName, updated_at: doc.meta.updated_at } : d
          );
          return { ...proj, documents };
        }
        return proj;
      });

      set({
        currentVault: { ...currentVault, projects: updatedProjects },
        isLoading: false
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteDocument: async (projectId, filename) => {
    const { currentVault } = get();
    if (!currentVault) return;

    set({ error: null });
    try {
      const filePath = await window.api.pathJoin(currentVault.path, 'projects', projectId, 'docs', filename);
      await window.api.trashPath(filePath);

      const updatedProjects = currentVault.projects.map(proj => {
        if (proj.id === projectId) {
          return { ...proj, documents: (proj.documents || []).filter(d => d.filename !== filename) };
        }
        return proj;
      });

      set({ currentVault: { ...currentVault, projects: updatedProjects } });
    } catch (error) {
      throw new Error(ipcMessage(error));
    }
  },

  /**
   * Perbarui metadata dokumen di daftar memori setelah autosave.
   * Tidak menyentuh isLoading (autosave tidak boleh memicu spinner) dan tidak
   * membaca ulang vault.
   */
  updateDocumentMeta: (projectId, filename, patch) => {
    const { currentVault } = get();
    if (!currentVault) return;

    const updatedProjects = currentVault.projects.map(proj => {
      if (proj.id !== projectId) return proj;
      const documents = (proj.documents || []).map(d =>
        d.filename === filename ? { ...d, ...patch } : d
      );
      return { ...proj, documents };
    });

    set({ currentVault: { ...currentVault, projects: updatedProjects } });
  }
}));
