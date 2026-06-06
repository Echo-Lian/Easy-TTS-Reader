/**
 * Preload Script — Secure bridge between main and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('easyTTS', {
  // ─── File ─────────────────────────────────────────────────────────────
  openFile: () => ipcRenderer.invoke('open-file'),
  openFilePath: (filePath) => ipcRenderer.invoke('open-file-path', filePath),

  // ─── TTS (all providers — returns audio chunks for renderer playback) ─
  speakText: (options) => ipcRenderer.invoke('speak-text', options),

  stopSpeaking: () => ipcRenderer.invoke('stop-speaking'),
  getProviders: () => ipcRenderer.invoke('get-providers'),
  listSystemVoices: () => ipcRenderer.invoke('list-system-voices'),

  // ─── Settings ─────────────────────────────────────────────────────────
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  getAllSettings: () => ipcRenderer.invoke('get-all-settings'),

  // ─── Export ───────────────────────────────────────────────────────────
  exportAudio: (dataUrl) => ipcRenderer.invoke('export-audio', dataUrl),

  // ─── Events (main → renderer) ─────────────────────────────────────────
  onFileLoaded: (callback) => {
    const h = (_e, d) => callback(d);
    ipcRenderer.on('file-loaded', h);
    return () => ipcRenderer.removeListener('file-loaded', h);
  },
  onLoadingStart: (callback) => {
    const h = (_e, n) => callback(n);
    ipcRenderer.on('loading-start', h);
    return () => ipcRenderer.removeListener('loading-start', h);
  },
  onLoadingError: (callback) => {
    const h = (_e, m) => callback(m);
    ipcRenderer.on('loading-error', h);
    return () => ipcRenderer.removeListener('loading-error', h);
  },
  onSystemPlaying: (callback) => {
    const h = (_e, d) => callback(d);
    ipcRenderer.on('system-playing', h);
    return () => ipcRenderer.removeListener('system-playing', h);
  },
  onSystemDone: (callback) => {
    const h = () => callback();
    ipcRenderer.on('system-done', h);
    return () => ipcRenderer.removeListener('system-done', h);
  },

  // Menu accelerators
  onTriggerPlay: (cb) => { const h = () => cb(); ipcRenderer.on('trigger-play', h); return () => ipcRenderer.removeListener('trigger-play', h); },
  onTriggerPause: (cb) => { const h = () => cb(); ipcRenderer.on('trigger-pause', h); return () => ipcRenderer.removeListener('trigger-pause', h); },
  onTriggerStop: (cb) => { const h = () => cb(); ipcRenderer.on('trigger-stop', h); return () => ipcRenderer.removeListener('trigger-stop', h); },
  onTriggerSpeedUp: (cb) => { const h = () => cb(); ipcRenderer.on('trigger-speed-up', h); return () => ipcRenderer.removeListener('trigger-speed-up', h); },
  onTriggerSpeedDown: (cb) => { const h = () => cb(); ipcRenderer.on('trigger-speed-down', h); return () => ipcRenderer.removeListener('trigger-speed-down', h); },
  onTriggerExport: (cb) => { const h = () => cb(); ipcRenderer.on('trigger-export', h); return () => ipcRenderer.removeListener('trigger-export', h); }
});
