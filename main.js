const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');
const { exec } = require('child_process');

let mainWindow;
let fileToOpen = null; // Store file path from command line

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

function detectAndReadFile(filePath) {
  let content;
  let encoding = 'utf-8';
  let hasEncodingIssues = false;
  
  try {
    // Try UTF-8 first
    content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for BOM and remove if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    // Check for explicit replacement characters
    if (content.includes('\uFFFD') || content.includes('�')) {
      hasEncodingIssues = true;
      // Try latin1 (ISO-8859-1) which handles most Western European characters
      const latin1Content = fs.readFileSync(filePath, 'latin1');
      
      // Simple heuristic: if latin1 produces valid JSON, use it
      try {
        JSON.parse(latin1Content);
        content = latin1Content;
        encoding = 'latin1';
        hasEncodingIssues = false;
      } catch (e) {
        // Keep UTF-8 content if latin1 doesn't parse
      }
    }
  } catch (error) {
    // If UTF-8 fails entirely, try latin1
    try {
      content = fs.readFileSync(filePath, 'latin1');
      encoding = 'latin1';
    } catch (fallbackError) {
      throw error; // Re-throw original error
    }
  }
  
  // Flag if we auto-detected a non-UTF8 encoding
  const wasAutoDetected = encoding !== 'utf-8' && !hasEncodingIssues;
  
  return { content, encoding, hasEncodingIssues, wasAutoDetected };
}

function handleCommandLineFile() {
  // Check if a file was passed as argument
  const args = process.argv.slice(1); // Skip the first argument (electron executable)
  
  // In production, the file argument might be at different positions
  let filePath = null;
  
  // Look for a .json file in the arguments
  for (const arg of args) {
    if (arg.endsWith('.json') && fs.existsSync(arg)) {
      filePath = arg;
      break;
    }
  }
  
  // Also check if fileToOpen was set (for second-instance handling)
  if (!filePath && fileToOpen) {
    filePath = fileToOpen;
    fileToOpen = null; // Clear it after use
  }
  
  if (filePath) {
    // Wait for the window to be ready
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        openFileInWindow(filePath);
      }, 500); // Small delay to ensure renderer is ready
    });
  }
}

function openFileInWindow(filePath) {
  try {
    const { content, encoding, hasEncodingIssues, wasAutoDetected } = detectAndReadFile(filePath);
    const fileName = path.basename(filePath);
    mainWindow.webContents.send('file-opened', { content, fileName, filePath, encoding, hasEncodingIssues, wasAutoDetected });
    addRecentFile(filePath);
    
    // Bring window to front
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } catch (error) {
    dialog.showErrorBox('Error', `Failed to open file: ${error.message}`);
  }
}

function openRecentFile(filePath) {
  try {
    const { content, encoding, hasEncodingIssues, wasAutoDetected } = detectAndReadFile(filePath);
    const fileName = path.basename(filePath);
    mainWindow.webContents.send('file-opened', { content, fileName, filePath, encoding, hasEncodingIssues, wasAutoDetected });
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
                const { content, encoding, hasEncodingIssues, wasAutoDetected } = detectAndReadFile(filePath);
                const fileName = path.basename(filePath);
                mainWindow.webContents.send('file-opened', { content, fileName, filePath, encoding, hasEncodingIssues, wasAutoDetected });
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
        {
          label: 'System Integration',
          submenu: [
            {
              label: 'Register as JSON Handler',
              click: () => registerFileAssociation()
            },
            {
              label: 'Unregister as JSON Handler',
              click: () => unregisterFileAssociation()
            }
          ]
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
  
  // Handle file passed as command line argument
  handleCommandLineFile();

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

ipcMain.handle('reload-with-encoding', async (event, { filePath, encoding }) => {
  try {
    let content;
    
    // Use iconv-lite for encodings not supported by Node.js
    if (encoding === 'cp1252' || encoding === 'windows-1252' || encoding === 'win1252') {
      const buffer = fs.readFileSync(filePath);
      content = iconv.decode(buffer, 'win1252');
    } else {
      // Use Node.js built-in for standard encodings
      content = fs.readFileSync(filePath, encoding);
      
      // Remove BOM if present
      if (encoding === 'utf-8' && content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
    }
    
    const fileName = path.basename(filePath);
    return { success: true, content, fileName, filePath, encoding };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle show-open-dialog from renderer
ipcMain.on('show-open-dialog', async (event) => {
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
      const { content, encoding, hasEncodingIssues, wasAutoDetected } = detectAndReadFile(filePath);
      const fileName = path.basename(filePath);
      mainWindow.webContents.send('file-opened', { content, fileName, filePath, encoding, hasEncodingIssues, wasAutoDetected });
      addRecentFile(filePath);
    } catch (error) {
      dialog.showErrorBox('Error', `Failed to read file: ${error.message}`);
    }
  }
});

// File association functions
function registerFileAssociation() {
  if (process.platform === 'win32') {
    // Windows registry approach for portable version
    const appPath = process.execPath;
    const appName = 'JSONinja';
    
    // Create a batch script to add registry entries
    const regCommands = `
@echo off
echo Registering JSONinja as JSON file handler...
echo Executable path: ${appPath}

REM Add JSONinja to Open With menu
reg add "HKEY_CURRENT_USER\\Software\\Classes\\Applications\\JSONinja.exe\\shell\\open\\command" /ve /d "\\"${appPath}\\" \\"%%1\\"" /f

REM Associate with .json files
reg add "HKEY_CURRENT_USER\\Software\\Classes\\.json\\OpenWithList\\JSONinja.exe" /ve /d "" /f

REM Add to context menu with icon
reg add "HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.json\\shell\\Open with JSONinja" /ve /d "Open with JSONinja" /f
reg add "HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.json\\shell\\Open with JSONinja" /v "Icon" /d "\\"${appPath}\\",0" /f
reg add "HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.json\\shell\\Open with JSONinja\\command" /ve /d "\\"${appPath}\\" \\"%%1\\"" /f

REM Also add to standard .json handler
reg add "HKEY_CURRENT_USER\\Software\\Classes\\.json" /ve /d "JSONinja.Document" /f
reg add "HKEY_CURRENT_USER\\Software\\Classes\\JSONinja.Document" /ve /d "JSON Document" /f
reg add "HKEY_CURRENT_USER\\Software\\Classes\\JSONinja.Document\\DefaultIcon" /ve /d "\\"${appPath}\\",0" /f
reg add "HKEY_CURRENT_USER\\Software\\Classes\\JSONinja.Document\\shell\\open\\command" /ve /d "\\"${appPath}\\" \\"%%1\\"" /f

echo.
echo Registration complete!
echo You may need to restart Explorer or log off/on for changes to take effect.
pause
`;

    // Save to temp file and execute
    const tempBatPath = path.join(app.getPath('temp'), 'jsoninja_register.bat');
    fs.writeFileSync(tempBatPath, regCommands);
    
    exec(`start cmd /c "${tempBatPath}"`, (error) => {
      if (error) {
        dialog.showErrorBox('Registration Error', 'Failed to register file association. You may need to run as administrator.');
      } else {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Success',
          message: 'JSONinja has been registered as a JSON file handler.',
          detail: 'You can now right-click JSON files and select "Open with JSONinja"'
        });
      }
      
      // Clean up temp file
      setTimeout(() => {
        try { fs.unlinkSync(tempBatPath); } catch (e) {}
      }, 5000);
    });
  } else if (process.platform === 'darwin') {
    // macOS approach
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'macOS File Association',
      message: 'To associate JSON files with JSONinja on macOS:',
      detail: '1. Right-click any .json file\n2. Select "Get Info"\n3. Under "Open with", select JSONinja\n4. Click "Change All..."'
    });
  } else {
    // Linux approach
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Linux File Association',
      message: 'File association on Linux varies by desktop environment.',
      detail: 'Right-click a JSON file and look for "Open With" or "Properties" to set JSONinja as the default handler.'
    });
  }
}

function unregisterFileAssociation() {
  if (process.platform === 'win32') {
    const regCommands = `
@echo off
echo Unregistering JSONinja file associations...

REM Remove from Open With menu
reg delete "HKEY_CURRENT_USER\\Software\\Classes\\Applications\\JSONinja.exe" /f 2>nul

REM Remove from .json associations
reg delete "HKEY_CURRENT_USER\\Software\\Classes\\.json\\OpenWithList\\JSONinja.exe" /f 2>nul

REM Remove from context menu
reg delete "HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.json\\shell\\Open with JSONinja" /f 2>nul

REM Remove document type
reg delete "HKEY_CURRENT_USER\\Software\\Classes\\JSONinja.Document" /f 2>nul

echo Unregistration complete!
pause
`;

    const tempBatPath = path.join(app.getPath('temp'), 'jsoninja_unregister.bat');
    fs.writeFileSync(tempBatPath, regCommands);
    
    exec(`start cmd /c "${tempBatPath}"`, (error) => {
      if (!error) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Success',
          message: 'JSONinja file associations have been removed.'
        });
      }
      
      setTimeout(() => {
        try { fs.unlinkSync(tempBatPath); } catch (e) {}
      }, 5000);
    });
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is running, quit this one
  app.quit();
} else {
  // Handle when another instance tries to run
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Check if they're trying to open a file
      for (const arg of commandLine.slice(1)) {
        if (arg.endsWith('.json') && fs.existsSync(arg)) {
          openFileInWindow(arg);
          break;
        }
      }
    }
  });

  app.whenReady().then(createWindow);
}

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
