/**
 * Easy TTS Reader Window for Zotero
 */

let ttsService;
let storageAdapter;

// Initialize when window loads
window.addEventListener('load', async () => {
  await init();
});

async function init() {
  // Initialize services
  ttsService = new TTSService();
  storageAdapter = new StorageAdapter();

  // Load preferences
  await ttsService.loadPreferences(storageAdapter);

  // Setup UI
  setupUI();
  loadPreferencesUI();
  updateCacheInfo();
}

function setupUI() {
  // Get DOM elements
  const textInput = document.getElementById('text-input');
  const speedSlider = document.getElementById('speed-slider');
  const pitchSlider = document.getElementById('pitch-slider');
  const volumeSlider = document.getElementById('volume-slider');
  const languageSelect = document.getElementById('language-select');
  const aiEnhance = document.getElementById('ai-enhance');
  const speakBtn = document.getElementById('speak-btn');
  const stopBtn = document.getElementById('stop-btn');
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  const loadAbstractBtn = document.getElementById('load-abstract-btn');
  const loadNotesBtn = document.getElementById('load-notes-btn');

  // Slider change handlers
  speedSlider.addEventListener('change', () => {
    const value = parseFloat(speedSlider.value);
    document.getElementById('speed-value').value = value.toFixed(1);
    ttsService.updatePreferences({ speed: value });
    ttsService.savePreferences(storageAdapter);
  });

  pitchSlider.addEventListener('change', () => {
    const value = parseFloat(pitchSlider.value);
    document.getElementById('pitch-value').value = value.toFixed(1);
    ttsService.updatePreferences({ pitch: value });
    ttsService.savePreferences(storageAdapter);
  });

  volumeSlider.addEventListener('change', () => {
    const value = parseFloat(volumeSlider.value);
    document.getElementById('volume-value').value = value.toFixed(1);
    ttsService.updatePreferences({ volume: value });
    ttsService.savePreferences(storageAdapter);
  });

  languageSelect.addEventListener('command', () => {
    const value = languageSelect.selectedItem.value;
    ttsService.updatePreferences({ language: value });
    ttsService.savePreferences(storageAdapter);
  });

  // Button handlers
  speakBtn.addEventListener('command', async () => {
    await handleSpeak();
  });

  stopBtn.addEventListener('command', () => {
    handleStop();
  });

  clearCacheBtn.addEventListener('command', () => {
    handleClearCache();
  });

  loadAbstractBtn.addEventListener('command', async () => {
    await loadSelectedAbstract();
  });

  loadNotesBtn.addEventListener('command', async () => {
    await loadSelectedNotes();
  });
}

function loadPreferencesUI() {
  const prefs = ttsService.preferences;

  document.getElementById('speed-slider').value = prefs.speed;
  document.getElementById('speed-value').value = prefs.speed.toFixed(1);

  document.getElementById('pitch-slider').value = prefs.pitch;
  document.getElementById('pitch-value').value = prefs.pitch.toFixed(1);

  document.getElementById('volume-slider').value = prefs.volume;
  document.getElementById('volume-value').value = prefs.volume.toFixed(1);

  const languageSelect = document.getElementById('language-select');
  const items = languageSelect.menupopup.children;
  for (let item of items) {
    if (item.value === prefs.language) {
      languageSelect.selectedItem = item;
      break;
    }
  }
}

async function handleSpeak() {
  const textInput = document.getElementById('text-input');
  const text = textInput.value.trim();

  if (!text) {
    showStatus('Please enter some text', 'error');
    return;
  }

  try {
    document.getElementById('speak-btn').disabled = true;
    showStatus('Processing...', 'info');

    let processedText = text;

    // Enhance with AI if enabled
    const aiEnhance = document.getElementById('ai-enhance');
    if (aiEnhance.checked) {
      showStatus('Enhancing with AI...', 'info');
      processedText = await ttsService.enhanceTextWithAI(text);
    }

    // Speak
    const options = {
      speed: parseFloat(document.getElementById('speed-slider').value),
      pitch: parseFloat(document.getElementById('pitch-slider').value),
      volume: parseFloat(document.getElementById('volume-slider').value),
      language: document.getElementById('language-select').selectedItem.value
    };

    await ttsService.textToSpeech(processedText, options);
    showStatus('Speaking...', 'success');
    updateCacheInfo();
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    document.getElementById('speak-btn').disabled = false;
  }
}

function handleStop() {
  // Stop speech synthesis
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking) {
    speechSynthesis.cancel();
    showStatus('Stopped', 'info');
  }
}

function handleClearCache() {
  ttsService.clearCache();
  updateCacheInfo();
  showStatus('Cache cleared', 'success');
}

async function loadSelectedAbstract() {
  try {
    const ZoteroPane = window.opener.Zotero.getActiveZoteroPane();
    const items = ZoteroPane.getSelectedItems();

    if (!items || items.length === 0) {
      showStatus('Please select an item in Zotero', 'warning');
      return;
    }

    const item = items[0];
    const abstract = item.getField('abstractNote');

    if (!abstract) {
      showStatus('No abstract found', 'warning');
      return;
    }

    document.getElementById('text-input').value = abstract;
    showStatus('Abstract loaded', 'success');
  } catch (error) {
    showStatus('Failed to load abstract', 'error');
  }
}

async function loadSelectedNotes() {
  try {
    const ZoteroPane = window.opener.Zotero.getActiveZoteroPane();
    const items = ZoteroPane.getSelectedItems();

    if (!items || items.length === 0) {
      showStatus('Please select an item in Zotero', 'warning');
      return;
    }

    const item = items[0];
    const notes = item.getNotes();

    if (!notes || notes.length === 0) {
      showStatus('No notes found', 'warning');
      return;
    }

    // Combine all notes
    let allNotesText = '';
    for (const noteID of notes) {
      const note = window.opener.Zotero.Items.get(noteID);
      const noteHTML = note.getNote();
      // Strip HTML tags
      const noteText = noteHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      allNotesText += noteText + '\n\n';
    }

    document.getElementById('text-input').value = allNotesText;
    showStatus('Notes loaded', 'success');
  } catch (error) {
    showStatus('Failed to load notes', 'error');
  }
}

function showStatus(message, type = 'info') {
  const statusMessage = document.getElementById('status-message');
  statusMessage.value = message;
  statusMessage.className = `status-message status-${type}`;

  setTimeout(() => {
    statusMessage.value = '';
    statusMessage.className = 'status-message';
  }, 3000);
}

function updateCacheInfo() {
  const size = ttsService.getCacheSize();
  const cacheInfo = document.getElementById('cache-info');
  cacheInfo.value = `Cache: ${size} item${size !== 1 ? 's' : ''}`;
}
