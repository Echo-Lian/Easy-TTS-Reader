/**
 * Easy TTS Reader — Renderer Process (Phase 1)
 *
 * UI logic: file loading, text display, TTS playback, settings
 */

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  currentText: '',
  currentFile: null,
  audioChunks: [],
  currentChunk: 0,
  isPlaying: false,
  isPaused: false,
  audioContext: null,
  audioSource: null,
  gainNode: null,
  speed: 1.0,
  voice: 'alloy',
  provider: 'openai',
  systemVoices: []
};

// ─── DOM References ──────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const els = {
  dropZone: $('drop-zone'),
  dropOverlay: $('drop-overlay'),
  browseLink: $('browse-link'),
  loadingBar: $('loading-bar'),
  loadingText: $('loading-text'),
  textSection: $('text-section'),
  textDisplay: $('text-display'),
  docTitle: $('doc-title'),
  docMeta: $('doc-meta'),
  fileLabel: $('file-label'),
  controls: $('controls'),
  btnPlay: $('btn-play'),
  btnStop: $('btn-stop'),
  btnExport: $('btn-export'),
  btnSettings: $('btn-settings'),
  speedSlider: $('speed-slider'),
  speedValue: $('speed-value'),
  voiceSelect: $('voice-select'),
  progress: $('progress'),
  progressFill: $('progress-fill'),
  progressText: $('progress-text'),
  status: $('status'),
  statusText: $('status-text'),

  // Modal
  settingsModal: $('settings-modal'),
  modalClose: $('modal-close'),
  modalDone: $('modal-done'),
  modalBackdrop: document.querySelector('.modal-backdrop'),
  providerSelect: $('provider-select'),
  providerPricing: $('provider-pricing'),
  apiKeyGroup: $('api-key-group'),
  apiKeyInput: $('api-key-input'),
  btnValidateKey: $('btn-validate-key'),
  apiKeyStatus: $('api-key-status'),
  openaiLink: $('openai-link'),
  modelSelect: $('model-select'),
  modelGroup: $('model-group'),

  // Pipeline
  pipeline: $('pipeline'),
  stepLoad: $('step-load'),
  stepDetect: $('step-detect'),
  stepGenerate: $('step-generate'),
  stepPlay: $('step-play'),
  detailLoad: $('detail-load'),
  detailDetect: $('detail-detect'),
  detailGenerate: $('detail-generate'),
  detailPlay: $('detail-play'),
  connLoadDetect: $('conn-load-detect'),
  connDetectGen: $('conn-detect-gen'),
  connGenPlay: $('conn-gen-play')
};

// ═════════════════════════════════════════════════════════════════════════════
// INIT
// ═════════════════════════════════════════════════════════════════════════════

async function init() {
  await loadSettings();
  setupDragDrop();
  setupButtons();
  setupKeyboardShortcuts();
  setupEvents();
  setupModal();
  checkApiKey();
}

// ═════════════════════════════════════════════════════════════════════════════
// PIPELINE VISUALIZATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Set the state of a pipeline step and its preceding connector.
 * States: 'pending', 'active', 'done', 'error'
 */
function setPipeline(activeStep, details = {}) {
  const steps = ['load', 'detect', 'generate', 'play'];
  const stepEls = {
    load:    { step: els.stepLoad,    detail: els.detailLoad,    conn: null },
    detect:  { step: els.stepDetect,  detail: els.detailDetect,  conn: els.connLoadDetect },
    generate:{ step: els.stepGenerate,detail: els.detailGenerate, conn: els.connDetectGen },
    play:    { step: els.stepPlay,    detail: els.detailPlay,    conn: els.connGenPlay }
  };

  // Show pipeline if hidden
  els.pipeline.classList.remove('hidden');

  const activeIdx = steps.indexOf(activeStep);

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const el = stepEls[s];
    let status;

    if (i < activeIdx) {
      status = 'done';
    } else if (i === activeIdx) {
      status = 'active';
    } else {
      status = 'pending';
    }

    el.step.dataset.status = status;

    // Set connector status (connector after this step)
    if (el.conn) {
      if (i < activeIdx) {
        el.conn.dataset.status = 'done';
      } else if (i === activeIdx) {
        el.conn.dataset.status = 'active';
      } else {
        el.conn.dataset.status = 'pending';
      }
    }

    // Update detail text
    if (details[s]) {
      el.detail.textContent = details[s];
    }
  }
}

/** Reset pipeline to default state */
function resetPipeline() {
  els.pipeline.classList.add('hidden');
  ['load', 'detect', 'generate', 'play'].forEach(s => {
    const step = document.querySelector(`[data-step="${s}"]`);
    if (step) step.dataset.status = 'pending';
  });
  [els.connLoadDetect, els.connDetectGen, els.connGenPlay].forEach(c => {
    if (c) c.dataset.status = 'pending';
  });
  els.detailLoad.textContent = '';
  els.detailDetect.textContent = '';
  els.detailGenerate.textContent = '';
  els.detailPlay.textContent = '';
}

// ═════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═════════════════════════════════════════════════════════════════════════════

async function loadSettings() {
  state.speed = parseFloat(await window.easyTTS.getSetting('tts-speed')) || 1.0;
  state.provider = await window.easyTTS.getSetting('tts-provider') || 'openai';
  state.voice = await window.easyTTS.getSetting('tts-voice') || 'alloy';

  // Preload macOS voices for system provider
  state.systemVoices = await window.easyTTS.listSystemVoices();

  els.speedSlider.value = state.speed;
  els.speedValue.textContent = state.speed.toFixed(1) + '×';

  // Populate voice dropdown based on provider
  await populateVoices(state.provider);
}

async function saveSetting(key, value) {
  await window.easyTTS.setSetting(key, value);
}

// Check if API key is set
async function checkApiKey() {
  const key = await window.easyTTS.getSetting('openai-api-key');
  const provider = await window.easyTTS.getSetting('tts-provider') || 'kokoro';

  if (provider === 'openai' && !key) {
    showStatus('🔑 Set your OpenAI API key in Settings to enable speech');
  } else if (provider === 'kokoro') {
    // Kokoro is ready to go — no key needed
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// DRAG & DROP
// ═════════════════════════════════════════════════════════════════════════════

function setupDragDrop() {
  // Click to browse
  els.dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A') handleBrowse();
  });
  els.browseLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleBrowse();
  });

  // Drag events
  let dragCounter = 0;

  els.dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    els.dropZone.classList.add('drag-over');
  });

  els.dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) els.dropZone.classList.remove('drag-over');
  });

  els.dropZone.addEventListener('dragover', (e) => e.preventDefault());

  els.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    els.dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileDrop(files[0].path);
    }
  });
}

async function handleBrowse() {
  await window.easyTTS.openFile();
}

async function handleFileDrop(filePath) {
  await window.easyTTS.openFilePath(filePath);
}

// ═════════════════════════════════════════════════════════════════════════════
// UI BUTTONS
// ═════════════════════════════════════════════════════════════════════════════

function setupButtons() {
  // Play / Pause
  els.btnPlay.addEventListener('click', handlePlay);

  // Stop
  els.btnStop.addEventListener('click', handleStop);

  // Export
  els.btnExport.addEventListener('click', handleExport);

  // Settings
  els.btnSettings.addEventListener('click', () => openModal());

  // Speed
  els.speedSlider.addEventListener('input', () => {
    state.speed = parseFloat(els.speedSlider.value);
    els.speedValue.textContent = state.speed.toFixed(1) + '×';
    saveSetting('tts-speed', state.speed);
  });

  // Voice
  els.voiceSelect.addEventListener('change', () => {
    state.voice = els.voiceSelect.value;
    saveSetting('tts-voice', state.voice);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═════════════════════════════════════════════════════════════════════════════

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Space for play/pause (only when not typing in contenteditable)
    if (e.code === 'Space' && !e.target.isContentEditable && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
      e.preventDefault();
      handlePlay();
    }
    // Escape to stop
    if (e.code === 'Escape') {
      handleStop();
    }
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// IPC EVENTS (from main process)
// ═════════════════════════════════════════════════════════════════════════════

function setupEvents() {
  window.easyTTS.onFileLoaded((data) => {
    state.currentText = data.text;
    state.currentFile = data.fileName;
    els.fileLabel.textContent = data.fileName;
    els.docTitle.textContent = data.title || data.fileName;
    els.docMeta.textContent = data.pages ? `${data.pages} pages · ${data.text.length.toLocaleString()} chars` : `${data.text.length.toLocaleString()} chars`;
    els.textDisplay.textContent = data.text;

    // Hide drop zone, show text + controls
    els.dropZone.classList.add('hidden');
    els.textSection.classList.remove('hidden');
    els.loadingBar.classList.add('hidden');
    els.controls.classList.remove('hidden');

    // Pipeline: load done → detecting
    const charCount = data.text.length.toLocaleString();
    const pageInfo = data.pages ? `${data.pages}p` : '';
    setPipeline('detect', {
      load: pageInfo ? `${pageInfo} · ${charCount}c` : `${charCount} chars`,
      detect: 'Detecting…'
    });

    // Reset playback
    resetPlayback();
    showStatus(`Loaded: ${data.fileName} (${charCount} chars)`);
  });

  window.easyTTS.onLoadingStart((fileName) => {
    els.loadingBar.classList.remove('hidden');
    els.loadingText.textContent = `Loading ${fileName}…`;
    setPipeline('load', { load: `Reading ${fileName}…` });
  });

  window.easyTTS.onLoadingError((msg) => {
    els.loadingBar.classList.add('hidden');
    els.pipeline.classList.add('hidden');
    showStatus(`⚠️ ${msg}`);
  });

  // System TTS progress events
  window.easyTTS.onSystemPlaying((data) => {
    updateProgressSystem(data.current, data.total);
  });
  window.easyTTS.onSystemDone(() => {
    finishPlayback();
    showStatus('✅ Done');
  });

  // Menu accelerator handlers
  window.easyTTS.onTriggerPlay(() => handlePlay());
  window.easyTTS.onTriggerPause(() => handlePause());
  window.easyTTS.onTriggerStop(() => handleStop());
  window.easyTTS.onTriggerSpeedUp(() => adjustSpeed(0.1));
  window.easyTTS.onTriggerSpeedDown(() => adjustSpeed(-0.1));
  window.easyTTS.onTriggerExport(() => handleExport());
}

function adjustSpeed(delta) {
  state.speed = Math.max(0.5, Math.min(2.0, state.speed + delta));
  els.speedSlider.value = state.speed;
  els.speedValue.textContent = state.speed.toFixed(1) + '×';
  saveSetting('tts-speed', state.speed);
}

// ═════════════════════════════════════════════════════════════════════════════
// PLAYBACK
// ═════════════════════════════════════════════════════════════════════════════

async function handlePlay() {
  if (state.isPaused) {
    resumePlayback();
    return;
  }

  if (state.isPlaying) {
    pausePlayback();
    return;
  }

  const text = state.currentText;
  if (!text || !text.trim()) {
    showStatus('⚠️ No text to speak. Open a PDF first.');
    return;
  }

  const provider = state.provider;

  // ── System TTS: play directly through macOS speakers ────────────────
  if (provider === 'system') {
    setPlaying(true);
    els.btnPlay.textContent = '⏸ Play';
    els.btnStop.disabled = false;
    els.btnExport.disabled = true;
    els.progress.classList.remove('hidden');
    showStatus('🔊 Speaking…');

    // Pipeline: skip to play for system TTS
    setPipeline('play', {
      detect: 'System (macOS)',
      generate: 'Direct',
      play: 'Speaking…'
    });

    try {
      const result = await window.easyTTS.speakText({ text, voice: state.voice, speed: state.speed });
      if (!result.success) throw new Error(result.error);
      updateProgressSystem(1, result.totalChunks);
    } catch (error) {
      const activeStep = document.querySelector('[data-step][data-status="active"]');
      if (activeStep) activeStep.dataset.status = 'error';
      showStatus(`⚠️ ${error.message}`);
      finishPlayback();
    }
    return;
  }

  // ── Kokoro / OpenAI: generate audio chunks, play in renderer ────────
  if (provider === 'openai') {
    const apiKey = await window.easyTTS.getSetting('openai-api-key');
    if (!apiKey) {
      openModal();
      showStatus('🔑 Set your OpenAI API key in Settings');
      return;
    }
  }

  // Pipeline: detect → generating
  const langInfo = await window.easyTTS.getSetting('tts-provider');
  if (provider === 'kokoro') {
    setPipeline('generate', {
      detect: 'Kokoro-82M',
      generate: 'Generating…'
    });
  } else {
    setPipeline('generate', {
      detect: provider === 'openai' ? 'OpenAI TTS' : 'System',
      generate: 'Generating…'
    });
  }

  setPlaying(true);
  els.btnPlay.textContent = '⏸ Pause';
  els.btnStop.disabled = false;
  showStatus('🔊 Generating speech…');
  els.progress.classList.remove('hidden');

  try {
    const result = await window.easyTTS.speakText({ text, voice: state.voice, speed: state.speed });

    if (!result.success) throw new Error(result.error);

    // 'direct' mode = system TTS (handled above via events)
    if (result.mode === 'direct') return;

    state.audioChunks = result.chunks;
    state.currentChunk = 0;

    if (state.audioChunks.length === 0) throw new Error('No audio was generated');

    // Pipeline: generate done → now playing
    const detectedLang = result.detectedLanguage || '';
    setPipeline('play', {
      detect: detectedLang || 'English',
      generate: `${state.audioChunks.length} chunk${state.audioChunks.length > 1 ? 's' : ''}`,
      play: 'Playing…'
    });

    const detectedInfo = detectedLang ? ` [${detectedLang}]` : '';
    showStatus(`🔊 Speaking${detectedInfo} (${state.audioChunks.length} part${state.audioChunks.length > 1 ? 's' : ''})…`);
    await playChunks();

  } catch (error) {
    // Pipeline: mark current step as error
    const activeStep = document.querySelector('[data-step][data-status="active"]');
    if (activeStep) activeStep.dataset.status = 'error';
    showStatus(`⚠️ ${error.message}`);
    finishPlayback();
  }
}

async function playChunks() {
  if (state.currentChunk >= state.audioChunks.length) {
    // Done
    finishPlayback();
    return;
  }

  updateProgress();

  const chunk = state.audioChunks[state.currentChunk];
  const audio = new Audio(chunk.data);
  audio.playbackRate = state.speed;

  // When this chunk finishes, play next
  audio.onended = () => {
    if (!state.isPlaying) return; // was stopped
    state.currentChunk++;
    playChunks();
  };

  audio.onerror = () => {
    showStatus('⚠️ Audio playback error');
    setPlaying(false);
  };

  // Store reference for pause/stop
  state.currentAudio = audio;

  // Wait for it to actually play
  try {
    await audio.play();
    state.isPaused = false;
    state.isPlaying = true;
  } catch (err) {
    if (err.name !== 'AbortError') {
      showStatus(`⚠️ Playback failed: ${err.message}`);
      setPlaying(false);
    }
  }
}

function pausePlayback() {
  if (state.currentAudio) {
    state.currentAudio.pause();
    state.isPaused = true;
    state.isPlaying = true;
    els.btnPlay.textContent = '▶ Resume';
    showStatus('⏸ Paused');
  }
}

function resumePlayback() {
  if (state.currentAudio && state.isPaused) {
    state.currentAudio.play()
      .then(() => {
        state.isPaused = false;
        els.btnPlay.textContent = '⏸ Pause';
        showStatus('🔊 Speaking…');
      })
      .catch(err => showStatus(`⚠️ ${err.message}`));
  }
}

async function handleStop() {
  // Stop Audio element playback
  if (state.currentAudio) {
    state.currentAudio.pause();
    state.currentAudio = null;
  }

  // Signal main process to stop (kills say process or aborts OpenAI request)
  await window.easyTTS.stopSpeaking();

  finishPlayback('Stopped');
}

function finishPlayback(playDetail) {
  setPlaying(false);
  state.isPaused = false;
  state.currentChunk = 0;
  state.currentAudio = null;
  els.btnPlay.textContent = '▶ Play';
  els.btnStop.disabled = true;
  els.btnExport.disabled = false;
  els.progress.classList.add('hidden');

  // Pipeline: mark play as done
  setPipeline('done', {});
  const playStep = els.stepPlay;
  if (playStep) playStep.dataset.status = 'done';
  if (els.connGenPlay) els.connGenPlay.dataset.status = 'done';
  if (els.detailPlay) els.detailPlay.textContent = playDetail || 'Complete';

  // Don't overwrite status if there's already an error/status message
  if (els.statusText.textContent.includes('⚠️') || els.statusText.textContent.includes('✅ Done')) {
    // keep it
  } else {
    showStatus('✅ Done');
  }
}

function resetPlayback() {
  if (state.currentAudio) {
    state.currentAudio.pause();
    state.currentAudio = null;
  }
  setPlaying(false);
  state.isPaused = false;
  state.isPlaying = false;
  state.currentChunk = 0;
  state.audioChunks = [];
  els.btnPlay.textContent = '▶ Play';
  els.btnStop.disabled = true;
  els.btnExport.disabled = true;
  els.progress.classList.add('hidden');
}

function setPlaying(val) {
  state.isPlaying = val;
}

function updateProgress() {
  const total = state.audioChunks.length || 1;
  const current = state.currentChunk + 1;
  const pct = Math.round((current / total) * 100);
  els.progressFill.style.width = pct + '%';
  els.progressText.textContent = `${current} / ${total}`;
}

function updateProgressSystem(current, total) {
  const pct = Math.round((current / total) * 100);
  els.progressFill.style.width = pct + '%';
  els.progressText.textContent = `${current} / ${total}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

async function handleExport() {
  if (state.audioChunks.length === 0) {
    showStatus('⚠️ No audio to export. Play something first.');
    return;
  }

  // Concatenate all chunks into one data URL
  // For now, export the first chunk (full solution would merge MP3s)
  const firstChunk = state.audioChunks[0];
  if (!firstChunk) return;

  showStatus('💾 Exporting…');

  const result = await window.easyTTS.exportAudio(firstChunk.data);

  if (result.success) {
    showStatus(`✅ Exported to ${result.filePath}`);
  } else if (result.error) {
    showStatus(`⚠️ Export failed: ${result.error}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// STATUS
// ═════════════════════════════════════════════════════════════════════════════

function showStatus(msg) {
  els.statusText.textContent = msg;
  els.status.classList.remove('hidden');
}

// ═════════════════════════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═════════════════════════════════════════════════════════════════════════════

async function openModal() {
  const providers = await window.easyTTS.getProviders();
  const currentProvider = await window.easyTTS.getSetting('tts-provider') || 'kokoro';
  const apiKey = await window.easyTTS.getSetting('openai-api-key') || '';

  // Populate provider dropdown
  els.providerSelect.innerHTML = Object.entries(providers).map(([key, p]) =>
    `<option value="${key}" ${key === currentProvider ? 'selected' : ''}>
      ${p.name} (${p.pricing})
    </option>`
  ).join('');

  // Show pricing info
  const selectedProvider = providers[currentProvider];
  if (selectedProvider) {
    els.providerPricing.textContent = selectedProvider.pricing;
  }

  // Show/hide fields based on provider
  const showOpenAi = currentProvider === 'openai';
  els.apiKeyInput.value = apiKey;
  els.apiKeyGroup.classList.toggle('hidden', !showOpenAi);
  els.modelGroup.classList.toggle('hidden', !showOpenAi);

  // Provider change
  els.providerSelect.onchange = () => {
    const prov = els.providerSelect.value;
    const isOpenAi = prov === 'openai';
    els.apiKeyGroup.classList.toggle('hidden', !isOpenAi);
    els.modelGroup.classList.toggle('hidden', !isOpenAi);
    if (providers[prov]) {
      els.providerPricing.textContent = providers[prov].pricing;
    }
  };

  // Validate API key
  els.btnValidateKey.onclick = async () => {
    const key = els.apiKeyInput.value.trim();
    if (!key) {
      els.apiKeyStatus.textContent = 'Please enter an API key';
      els.apiKeyStatus.style.color = 'var(--accent)';
      return;
    }

    els.btnValidateKey.disabled = true;
    els.btnValidateKey.textContent = 'Checking…';
    els.apiKeyStatus.textContent = '';

    const result = await window.easyTTS.validateApiKey(key);
    if (result.valid) {
      els.apiKeyStatus.textContent = '✅ Key is valid';
      els.apiKeyStatus.style.color = '#4ade80';
    } else {
      els.apiKeyStatus.textContent = result.error || '❌ Invalid key';
      els.apiKeyStatus.style.color = 'var(--accent)';
    }

    els.btnValidateKey.disabled = false;
    els.btnValidateKey.textContent = 'Validate';
  };

  // OpenAI link
  els.openaiLink.onclick = (e) => {
    e.preventDefault();
    // In Electron we can use shell.openExternal, but from renderer we just send the URL
    window.open('https://platform.openai.com/api-keys', '_blank');
  };

  els.settingsModal.classList.remove('hidden');
}

function closeModal() {
  els.settingsModal.classList.add('hidden');
}

async function populateVoices(provider) {
  const providers = await window.easyTTS.getProviders();
  let voiceList = [];

  if (provider === 'kokoro' && providers.kokoro) {
    voiceList = providers.kokoro.voices;
  } else if (provider === 'openai' && providers.openai) {
    voiceList = providers.openai.voices;
  } else if (provider === 'system' && state.systemVoices.length > 0) {
    voiceList = state.systemVoices;
  }

  if (voiceList.length === 0) return;

  const current = state.voice;
  const isValid = voiceList.includes(current);
  els.voiceSelect.innerHTML = voiceList.map(v =>
    `<option value="${v}" ${v === current ? 'selected' : ''}>${v}</option>`
  ).join('');

  if (!isValid) {
    state.voice = voiceList[0];
    els.voiceSelect.value = state.voice;
    await saveSetting('tts-voice', state.voice);
  }
}

async function saveModalSettings() {
  const provider = els.providerSelect.value;
  const apiKey = els.apiKeyInput.value.trim();

  state.provider = provider;
  await saveSetting('tts-provider', provider);

  if (provider === 'openai') {
    await saveSetting('tts-model', els.modelSelect.value);
    if (apiKey) await saveSetting('openai-api-key', apiKey);
  }

  // Update voice dropdown to match the new provider
  await populateVoices(provider);

  closeModal();
  showStatus('Settings saved');
  checkApiKey();
}

function setupModal() {
  els.modalClose.addEventListener('click', closeModal);
  els.modalDone.addEventListener('click', saveModalSettings);
  els.modalBackdrop.addEventListener('click', closeModal);

  // Enter key to save
  els.apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveModalSettings();
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// GO
// ═════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', init);
