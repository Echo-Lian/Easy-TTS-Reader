// Initialize TTS service and storage
const ttsService = new TTSService();
const storage = new StorageAdapter();

// DOM elements
const textInput = document.getElementById('text-input');
const speedSlider = document.getElementById('speed');
const pitchSlider = document.getElementById('pitch');
const volumeSlider = document.getElementById('volume');
const languageSelect = document.getElementById('language');
const aiEnhanceCheckbox = document.getElementById('ai-enhance');
const speakBtn = document.getElementById('speak-btn');
const stopBtn = document.getElementById('stop-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const getSelectionBtn = document.getElementById('get-selection-btn');
const statusMessage = document.getElementById('status-message');
const cacheInfo = document.getElementById('cache-info');
const speedValue = document.getElementById('speed-value');
const pitchValue = document.getElementById('pitch-value');
const volumeValue = document.getElementById('volume-value');

// Initialize
async function init() {
  await ttsService.loadPreferences(storage);
  loadPreferencesUI();
  updateCacheInfo();
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

// Event listeners
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

speakBtn.addEventListener('click', async () => {
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
});

stopBtn.addEventListener('click', async () => {
  // Stop popup-context speech
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  // Also stop content script speech
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'stopPageSpeaking' });
  } catch (_) {}
  showStatus('Stopped', 'info');
});

clearCacheBtn.addEventListener('click', () => {
  ttsService.clearCache();
  updateCacheInfo();
  showStatus('Cache cleared', 'success');
});

getSelectionBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: 'getSelection' }, (response) => {
      if (response && response.text) {
        textInput.value = response.text;
        showStatus('Selection loaded', 'success');
      } else {
        showStatus('No text selected on page', 'warning');
      }
    });
  } catch (error) {
    showStatus('Failed to get selection', 'error');
  }
});

// Function to automatically grab page text and start speaking when the popup opens
async function autoCrawlText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'speakPageText' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Could not connect to page', 'error');
        return;
      }
      if (response && response.text) {
        textInput.value = response.text;
        showStatus('Reading page aloud...', 'success');
      }
    });
  } catch (error) {
    showStatus('Failed to read page', 'error');
  }
}

// Trigger this when the DOM of the popup is loaded
document.addEventListener('DOMContentLoaded', autoCrawlText);

// Initialize on load
init();
