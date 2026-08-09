const { app, Menu } = require('electron');

function setupMenu(mainWindow) {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Diagram', click: () => { /* Handle in React via IPC later */ } },
        { label: 'Open Vault', click: () => { /* Handle in React via IPC later */ } },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => { /* Handle in React via IPC later */ } },
        { label: 'Export PNG', click: () => { /* Handle in React via IPC later */ } },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', click: () => { /* Handle in React later */ } },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'toggledevtools' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About DrawInDB',
          click: async () => {
            const { dialog } = require('electron');
            await dialog.showMessageBox({
              type: 'info',
              title: 'About DrawInDB',
              message: 'DrawInDB - Offline ERD Tool\nVersion 1.0.0',
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = setupMenu;
