const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),

  // File operations
  onFileOpened: (callback) => ipcRenderer.on('file-opened', callback),

  // Menu actions
  onNewTab: (callback) => ipcRenderer.on('new-tab', callback),
  onCloseTab: (callback) => ipcRenderer.on('close-tab', callback),
  onToggleSettings: (callback) => ipcRenderer.on('toggle-settings', callback),
  onToggleSearch: (callback) => ipcRenderer.on('toggle-search', callback),
  onExpandAll: (callback) => ipcRenderer.on('expand-all', callback),
  onCollapseAll: (callback) => ipcRenderer.on('collapse-all', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
