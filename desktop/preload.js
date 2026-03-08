/**
 * Preload script for Electron
 * Exposes safe APIs to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose electron store API
contextBridge.exposeInMainWorld('electronStore', {
  get: (key) => ipcRenderer.invoke('get-store-value', key),
  set: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
  delete: (key) => ipcRenderer.invoke('delete-store-value', key),
  clear: () => ipcRenderer.invoke('clear-store')
});

// Expose file system APIs
contextBridge.exposeInMainWorld('electronFS', {
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content)
});

// Expose OCR API
contextBridge.exposeInMainWorld('electronOCR', {
  performOCR: (imagePath) => ipcRenderer.invoke('perform-ocr', imagePath)
});

// Expose event listeners
contextBridge.exposeInMainWorld('electronIPC', {
  onFileLoaded: (callback) => ipcRenderer.on('file-loaded', (event, data) => callback(data)),
  onImageSelected: (callback) => ipcRenderer.on('image-selected', (event, data) => callback(data)),
  onSpeak: (callback) => ipcRenderer.on('speak', () => callback()),
  onStop: (callback) => ipcRenderer.on('stop', () => callback()),
  onClearCache: (callback) => ipcRenderer.on('clear-cache', () => callback()),
  onExportAudio: (callback) => ipcRenderer.on('export-audio', () => callback())
});
