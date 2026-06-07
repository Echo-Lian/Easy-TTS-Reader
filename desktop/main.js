/**
 * Easy TTS Reader — Electron Main Process
 *
 * Phase 1: PDF extraction + TTS playback
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const PdfService = require('./services/pdf-service');
const TtsService = require('./services/tts-service');

// ─── Persistence ──────────────────────────────────────────────────────────────
const store = new Store({
  defaults: {
    'tts-provider': 'kokoro',
    'tts-voice': 'af_bella',
    'tts-speed': 1.0,
    'window-width': 900,
    'window-height': 700
  }
});

// ─── Services ─────────────────────────────────────────────────────────────────
const pdfService = new PdfService();
const ttsService = new TtsService(store);

// ─── Window ───────────────────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  const [width, height] = [store.get('window-width'), store.get('window-height')];

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 700,
    minHeight: 500,
    title: 'Easy TTS Reader',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Save window size on resize
  mainWindow.on('resize', () => {
    const [w, h] = mainWindow.getSize();
    store.set('window-width', w);
    store.set('window-height', h);
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  buildMenu();

  // Open DevTools in dev mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open PDF / Text File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFile()
        },
        { type: 'separator' },
        {
          label: 'Export Audio...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('trigger-export');
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play / Resume',
          accelerator: 'Space',
          click: () => mainWindow?.webContents.send('trigger-play')
        },
        {
          label: 'Pause',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.send('trigger-pause')
        },
        {
          label: 'Stop',
          accelerator: 'Escape',
          click: () => mainWindow?.webContents.send('trigger-stop')
        },
        { type: 'separator' },
        {
          label: 'Speed Up',
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow?.webContents.send('trigger-speed-up')
        },
        {
          label: 'Slow Down',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow?.webContents.send('trigger-speed-down')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Easy TTS Reader',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Easy TTS Reader',
              message: 'Easy TTS Reader v2.0',
              detail: 'PDF-to-Audio reader powered by AI TTS\n\nBuilt with Electron ❤️'
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── File Open ────────────────────────────────────────────────────────────────
async function openFile(targetPath) {
  if (!mainWindow) return;

  let filePath = targetPath;

  if (!filePath) {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'txt', 'md'] },
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) return;
    filePath = result.filePaths[0];
  }

  try {
    mainWindow.webContents.send('loading-start', path.basename(filePath));

    const result = await pdfService.extractAny(filePath);

    mainWindow.webContents.send('file-loaded', {
      filePath,
      fileName: path.basename(filePath),
      text: result.text,
      pages: result.pages,
      title: result.title
    });

    // Remember last opened directory
    store.set('last-dir', path.dirname(filePath));

  } catch (error) {
    mainWindow.webContents.send('loading-error', error.message);
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// Open a file (called from renderer or menu)
ipcMain.handle('open-file', async () => {
  await openFile();
  return true;
});

// Handle dropped files
ipcMain.handle('open-file-path', async (_event, filePath) => {
  await openFile(filePath);
  return true;
});

// API key validation
ipcMain.handle('validate-api-key', async (_event, apiKey) => {
  try {
    const valid = await ttsService.validateApiKey(apiKey);
    if (valid) store.set('openai-api-key', apiKey);
    return { valid };
  } catch (error) {
    return { valid: false, error: error.message };
  }
});

// ── Synthesize speech (generic, provider-aware) ────────────────────────
ipcMain.handle('speak-text', async (_event, options) => {
  try {
    const { text, voice, speed } = options;
    if (!text || !text.trim()) throw new Error('No text to speak');

    // Normalize text: remove mid-sentence line breaks from PDF layout
    // so TTS doesn't pause at artificial line boundaries.
    const normalizedText = pdfService.normalizeForTTS(text);

    const provider = store.get('tts-provider') || 'kokoro';

    // Kokoro: generate WAV chunks via Python (auto-detects language)
    if (provider === 'kokoro') {
      const results = await ttsService.generateKokoroAudio(normalizedText, {
        voice: voice || store.get('tts-voice'),
        speed: speed || store.get('tts-speed')
      });
      const detectedLang = results[0]?.detectedLanguage || null;
      const detectedIso = results[0]?.detectedIso || null;
      return { success: true, chunks: results, detectedLanguage: detectedLang, detectedIso: detectedIso };
    }

    // OpenAI: generate MP3 chunks
    if (provider === 'openai') {
      const results = await ttsService.generateOpenAIAudio(normalizedText, {
        apiKey: store.get('openai-api-key'),
        voice: voice || store.get('tts-voice'),
        model: 'tts-1',
        speed: speed || store.get('tts-speed')
      });
      return { success: true, chunks: results };
    }

    // System TTS: play directly through speakers
    if (provider === 'system') {
      const PdfService = require('./services/pdf-service');
      const pdfService = new PdfService();
      const chunks = normalizedText.length > 5000 ? pdfService.chunkText(normalizedText, 4000) : [normalizedText];

      // Fire chunks in background, send events
      playSystemChunks(chunks, { voice, speed });
      return { success: true, mode: 'direct', totalChunks: chunks.length };
    }

    throw new Error(`Unknown provider: ${provider}`);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

async function playSystemChunks(chunks, opts) {
  for (let i = 0; i < chunks.length; i++) {
    if (mainWindow) {
      mainWindow.webContents.send('system-playing', { current: i + 1, total: chunks.length });
    }
    try {
      await ttsService.playDirectSystem(chunks[i], { voice: opts.voice, speed: opts.speed });
    } catch { break; }
  }
  if (mainWindow) mainWindow.webContents.send('system-done');
}

// Stop speech (both OpenAI generation and system TTS)
ipcMain.handle('stop-speaking', () => {
  ttsService.stop();
  return true;
});

function getTtsService() { return ttsService; }

// Settings
ipcMain.handle('get-setting', (_event, key) => {
  return store.get(key);
});

ipcMain.handle('set-setting', (_event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('get-all-settings', () => {
  return store.store;
});

// Provider info
ipcMain.handle('get-providers', () => {
  return ttsService.getProviders();
});

// System voices
ipcMain.handle('list-system-voices', async () => {
  try {
    return await ttsService.listSystemVoices();
  } catch {
    return [];
  }
});

// Export audio to file
ipcMain.handle('export-audio', async (_event, audioDataUrl) => {
  // Detect actual format from data URL (WAV for Kokoro, MP3 for OpenAI)
  const formatMatch = audioDataUrl.match(/^data:audio\/(\w+);base64,/);
  const format = formatMatch ? formatMatch[1] : 'mp3';
  const base64Data = audioDataUrl.replace(/^data:audio\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const extMap = { wav: 'wav', mpeg: 'mp3', mp3: 'mp3', ogg: 'ogg', flac: 'flac' };
  const ext = extMap[format] || 'mp3';
  const label = ext.toUpperCase();

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Audio',
    defaultPath: `speech.${ext}`,
    filters: [
      { name: `${label} Audio`, extensions: [ext] }
    ]
  });

  if (result.canceled) return { success: false };

  try {
    const fs = require('fs').promises;
    await fs.writeFile(result.filePath, buffer);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle file open from OS (macOS: open file with app)
app.on('open-file', (_event, filePath) => {
  _event.preventDefault();
  if (mainWindow) {
    openFile(filePath);
  } else {
    app.whenReady().then(() => openFile(filePath));
  }
});
