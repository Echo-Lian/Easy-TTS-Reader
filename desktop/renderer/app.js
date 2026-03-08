/**
 * Easy TTS Reader - Desktop Application
 * Renderer Process
 */

// Initialize services
const ttsService = new TTSService();
const storage = new StorageAdapter();

// Batch processing state
let batchFiles = [];

// DOM Elements
const textInput = document.getElementById('text-input');
const speedSlider = document.getElementById('speed');
const pitchSlider = document.getElementById('pitch');
const volumeSlider = document.getElementById('volume');
const languageSelect = document.getElementById('language');
const aiEnhanceCheckbox = document.getElementById('ai-enhance');
const speakBtn = document.getElementById('speak-btn');
const stopBtn = document.getElementById('stop-btn');
const exportBtn = document.getElementById('export-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const openTextBtn = document.getElementById('open-text-btn');
const openImageBtn = document.getElementById('open-image-btn');
const clearTextBtn = document.getElementById('clear-text-btn');
const pasteBtn = document.getElementById('paste-btn');
const statusMessage = document.getElementById('status-message');
const cacheInfo = document.getElementById('cache-info');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const speedValue = document.getElementById('speed-value');
const pitchValue = document.getElementById('pitch-value');
const volumeValue = document.getElementById('volume-value');
const addBatchBtn = document.getElementById('add-batch-btn');
const processBatchBtn = document.getElementById('process-batch-btn');
const batchList = document.getElementById('batch-list');

// Initialize
async function init() {
  await ttsService.loadPreferences(storage);
  loadPreferencesUI();
  updateCacheInfo();
  setupEventListeners();
  setupIPCListeners();
  updateTextStats();
}

// Load preferences into UI
function loadPreferencesUI() {
  const prefs = ttsService.preferences;
  speedSlider.value = prefs.speed;
  pitchSlider.value = prefs.pitch;
  volumeSlider.value = prefs.volume;
  languageSelect.value = prefs.language;
  updateSliderValues();
}

// Update slider value displays
function updateSliderValues() {
  speedValue.textContent = speedSlider.value;
  pitchValue.textContent = pitchSlider.value;
  volumeValue.textContent = volumeSlider.value;
}

// Update text statistics
function updateTextStats() {
  const text = textInput.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  charCount.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
  wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

// Update cache info
function updateCacheInfo() {
  const size = ttsService.getCacheSize();
  cacheInfo.textContent = `Cache: ${size} item${size !== 1 ? 's' : ''}`;
}

// Show status message
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-${type}`;
  setTimeout(() => {
    statusMessage.textContent = '';
    statusMessage.className = '';
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  // Text input
  textInput.addEventListener('input', updateTextStats);

  // Sliders
  speedSlider.addEventListener('input', () => {
    updateSliderValues();
    ttsService.updatePreferences({ speed: parseFloat(speedSlider.value) });
    ttsService.savePreferences(storage);
  });

  pitchSlider.addEventListener('input', () => {
    updateSliderValues();
    ttsService.updatePreferences({ pitch: parseFloat(pitchSlider.value) });
    ttsService.savePreferences(storage);
  });

  volumeSlider.addEventListener('input', () => {
    updateSliderValues();
    ttsService.updatePreferences({ volume: parseFloat(volumeSlider.value) });
    ttsService.savePreferences(storage);
  });

  languageSelect.addEventListener('change', () => {
    ttsService.updatePreferences({ language: languageSelect.value });
    ttsService.savePreferences(storage);
  });

  // Buttons
  speakBtn.addEventListener('click', handleSpeak);
  stopBtn.addEventListener('click', handleStop);
  exportBtn.addEventListener('click', handleExport);
  clearCacheBtn.addEventListener('click', handleClearCache);
  openTextBtn.addEventListener('click', handleOpenText);
  openImageBtn.addEventListener('click', handleOpenImage);
  clearTextBtn.addEventListener('click', () => {
    textInput.value = '';
    updateTextStats();
  });
  pasteBtn.addEventListener('click', async () => {
    const text = await navigator.clipboard.readText();
    textInput.value = text;
    updateTextStats();
  });

  // Batch processing
  addBatchBtn.addEventListener('click', handleAddBatch);
  processBatchBtn.addEventListener('click', handleProcessBatch);
}

// Setup IPC listeners from main process
function setupIPCListeners() {
  if (window.electronIPC) {
    window.electronIPC.onFileLoaded((data) => {
      if (data.type === 'text') {
        textInput.value = data.content;
        updateTextStats();
        showStatus('File loaded successfully', 'success');
      }
    });

    window.electronIPC.onImageSelected(async (data) => {
      await handleOCR(data.filePath);
    });

    window.electronIPC.onSpeak(() => handleSpeak());
    window.electronIPC.onStop(() => handleStop());
    window.electronIPC.onClearCache(() => handleClearCache());
    window.electronIPC.onExportAudio(() => handleExport());
  }
}

// Handle speak
async function handleSpeak() {
  const text = textInput.value.trim();
  if (!text) {
    showStatus('Please enter some text', 'error');
    return;
  }

  try {
    speakBtn.disabled = true;
    showStatus('Processing...', 'info');

    let processedText = text;

    // Enhance with AI if enabled
    if (aiEnhanceCheckbox.checked) {
      showStatus('Enhancing with AI...', 'info');
      processedText = await ttsService.enhanceTextWithAI(text);
    }

    // Convert to speech
    const options = {
      speed: parseFloat(speedSlider.value),
      pitch: parseFloat(pitchSlider.value),
      volume: parseFloat(volumeSlider.value),
      language: languageSelect.value
    };

    await ttsService.textToSpeech(processedText, options);
    showStatus('Speaking...', 'success');
    updateCacheInfo();
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    speakBtn.disabled = false;
  }
}

// Handle stop
function handleStop() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    showStatus('Stopped', 'info');
  }
}

// Handle export audio
async function handleExport() {
  const text = textInput.value.trim();
  if (!text) {
    showStatus('Please enter some text to export', 'error');
    return;
  }

  try {
    const result = await window.electronFS.saveFile({
      title: 'Export Audio',
      defaultPath: 'speech.mp3',
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      showStatus('Audio export functionality requires additional setup', 'warning');
      // In production, you would implement actual audio export here
      // This requires additional dependencies like 'text-to-speech' npm package
    }
  } catch (error) {
    showStatus(`Export failed: ${error.message}`, 'error');
  }
}

// Handle clear cache
function handleClearCache() {
  ttsService.clearCache();
  updateCacheInfo();
  showStatus('Cache cleared', 'success');
}

// Handle open text file
async function handleOpenText() {
  // This is handled by the main process menu
  // File loading happens via IPC
}

// Handle open image file
async function handleOpenImage() {
  // This is handled by the main process menu
  // Image selection happens via IPC
}

// Handle OCR
async function handleOCR(imagePath) {
  try {
    showStatus('Performing OCR...', 'info');

    const result = await window.electronOCR.performOCR(imagePath);

    if (result.success) {
      textInput.value = result.text;
      updateTextStats();
      showStatus('OCR completed successfully', 'success');
    } else {
      showStatus(result.error, 'error');
    }
  } catch (error) {
    showStatus(`OCR failed: ${error.message}`, 'error');
  }
}

// Handle add batch files
async function handleAddBatch() {
  try {
    const result = await window.electronFS.selectFile({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md', 'rtf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      batchFiles.push(...result.filePaths);
      updateBatchList();
      processBatchBtn.disabled = false;
      showStatus(`Added ${result.filePaths.length} file(s)`, 'success');
    }
  } catch (error) {
    showStatus(`Failed to add files: ${error.message}`, 'error');
  }
}

// Update batch list UI
function updateBatchList() {
  batchList.innerHTML = '';
  if (batchFiles.length === 0) {
    batchList.innerHTML = '<div style="color: #999; text-align: center;">No files added</div>';
    return;
  }

  batchFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'batch-item';
    item.textContent = file;
    batchList.appendChild(item);
  });
}

// Handle process batch
async function handleProcessBatch() {
  if (batchFiles.length === 0) return;

  try {
    processBatchBtn.disabled = true;
    showStatus('Processing batch...', 'info');

    const texts = [];
    for (const filePath of batchFiles) {
      const result = await window.electronFS.readFile(filePath);
      if (result.success) {
        texts.push(result.content);
      }
    }

    const options = {
      speed: parseFloat(speedSlider.value),
      pitch: parseFloat(pitchSlider.value),
      volume: parseFloat(volumeSlider.value),
      language: languageSelect.value
    };

    const results = await ttsService.batchProcess(texts, options);
    const successCount = results.filter(r => r.success).length;

    showStatus(`Batch processed: ${successCount}/${results.length} succeeded`, 'success');
    updateCacheInfo();

    // Clear batch
    batchFiles = [];
    updateBatchList();
  } catch (error) {
    showStatus(`Batch processing failed: ${error.message}`, 'error');
  } finally {
    processBatchBtn.disabled = true;
  }
}

// Initialize on load
init();
