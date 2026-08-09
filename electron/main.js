const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const setupMenu = require('./menu');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let store;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  async function initStore() {
    const { default: Store } = await import('electron-store');
    store = new Store();
  }

  async function createWindow() {
    await initStore();

    mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 1280,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    setupMenu(mainWindow);

    // Security Hardening
    // Prevent navigation to external URLs
    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
        event.preventDefault();
      }
    });

    // Prevent new window creation
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // In development, load the Vite dev server
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    // Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (isDev) {
        callback({ responseHeaders: details.responseHeaders });
        return;
      }

      const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self';";

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp]
        }
      });
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer] ${message}`);
    });
    
    if (isDev) {
      try {
        await mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools();
      } catch (e) {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      }
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      
      // Auto-updater check in production
      autoUpdater.checkForUpdatesAndNotify();
    }
  }

  app.setAppUserModelId('com.drawindb.app');
  app.setAboutPanelOptions({
    applicationName: 'DrawInDB',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2026 DrawInDB',
    credits: 'Built with Electron, React, and React Flow'
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  // IPC Handlers
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return result.filePaths;
  });

  ipcMain.handle('fs:readFile', async (event, filePath) => {
    return fs.promises.readFile(filePath, 'utf-8');
  });

  ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('fs:listFiles', async (event, dirPath) => {
    try {
      const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
      return files.map(file => ({ name: file.name, isDirectory: file.isDirectory() }));
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('fs:mkdir', async (event, dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return true;
  });

  ipcMain.handle('fs:deleteFile', async (event, filePath) => {
    await fs.promises.unlink(filePath);
    return true;
  });

  ipcMain.handle('fs:renameFile', async (event, oldPath, newPath) => {
    await fs.promises.rename(oldPath, newPath);
    return true;
  });

  ipcMain.handle('fs:pathExists', async (event, checkPath) => {
    try {
      await fs.promises.access(checkPath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('path:join', (event, ...paths) => {
    return path.join(...paths);
  });

  ipcMain.handle('store:getRecentVaults', async () => {
    if (!store) return [];
    return store.get('recentVaults') || [];
  });

  ipcMain.handle('window:setTitle', (event, title) => {
    if (mainWindow) {
      mainWindow.setTitle(title);
    }
  });

  ipcMain.handle('store:saveRecentVault', async (event, vaultPath) => {
    if (!store) return;
    const recent = store.get('recentVaults') || [];
    if (!recent.includes(vaultPath)) {
      recent.unshift(vaultPath);
      // Keep only last 10
      store.set('recentVaults', recent.slice(0, 10));
    }
    return true;
  });
}
