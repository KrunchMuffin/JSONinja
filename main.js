const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Recent files management
function getRecentFiles() {
  try {
    const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json');
    if (fs.existsSync(recentFilesPath)) {
      return JSON.parse(fs.readFileSync(recentFilesPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading recent files:', error);
  }
  return [];
}

function addRecentFile(filePath) {
  try {
    let recentFiles = getRecentFiles();
    // Remove if already exists
    recentFiles = recentFiles.filter(f => f.path !== filePath);
    // Add to beginning
    recentFiles.unshift({
      path: filePath,
      name: path.basename(filePath),
      timestamp: Date.now()
    });
    // Keep only last 10
    recentFiles = recentFiles.slice(0, 10);
    
    const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json');
    fs.writeFileSync(recentFilesPath, JSON.stringify(recentFiles, null, 2));
    
    // Rebuild menu
    const template = buildMenuTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } catch (error) {
    console.error('Error saving recent files:', error);
  }
}

function openRecentFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    mainWindow.webContents.send('file-opened', { content, fileName, filePath });
    addRecentFile(filePath);
  } catch (error) {
    dialog.showErrorBox('Error', `Failed to open recent file: ${error.message}`);
  }
}

function buildMenuTemplate() {
  const recentFiles = getRecentFiles();
  const recentFilesMenu = recentFiles.length > 0 ? 
    recentFiles.map(file => ({
      label: file.name,
      click: () => openRecentFile(file.path)
    })) : 
    [{ label: 'No recent files', enabled: false }];

  return [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open JSON File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const fileName = path.basename(filePath);
                mainWindow.webContents.send('file-opened', { content, fileName, filePath });
                addRecentFile(filePath);
              } catch (error) {
                dialog.showErrorBox('Error', `Failed to read file: ${error.message}`);
              }
            }
          }
        },
        {
          label: 'Recent Files',
          submenu: recentFilesMenu
        },
        { type: 'separator' },
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('new-tab');
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.webContents.send('close-tab');
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('toggle-settings');
          }
        },
        { type: 'separator' },
        { role: 'quit' }
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
        { role: 'paste' },
        { role: 'selectall' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('toggle-search');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Expand All',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('expand-all');
          }
        },
        {
          label: 'Collapse All',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            mainWindow.webContents.send('collapse-all');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About JSONinja',
              message: 'JSONinja - Advanced JSON Viewer v1.0.0',
              detail: 'A powerful, customizable JSON viewer with multi-tab support.\nBuilt with Electron.'
            });
          }
        }
      ]
    }
  ];
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'JSONinja - Advanced JSON Viewer',
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // Create application menu with recent files
  const template = buildMenuTemplate();
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      return { success: true, settings };
    }
    return { success: true, settings: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
