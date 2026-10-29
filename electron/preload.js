const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),
  listFiles: (dirPath) => ipcRenderer.invoke('fs:listFiles', dirPath),
  mkdir: (dirPath) => ipcRenderer.invoke('fs:mkdir', dirPath),
  deleteFile: (path) => ipcRenderer.invoke('fs:deleteFile', path),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('fs:renameFile', oldPath, newPath),
  pathExists: (path) => ipcRenderer.invoke('fs:pathExists', path),
  pathJoin: (...paths) => ipcRenderer.invoke('path:join', ...paths),
  getRecentVaults: () => ipcRenderer.invoke('store:getRecentVaults'),
  saveRecentVault: (vaultPath) => ipcRenderer.invoke('store:saveRecentVault', vaultPath),
  setCurrentVaultPath: (vaultPath) => ipcRenderer.invoke('vault:setCurrentPath', vaultPath),
  setWindowTitle: (title) => ipcRenderer.invoke('window:setTitle', title),
});
