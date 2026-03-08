// Content script for Chrome extension
// Runs on all web pages

// Initialize a simple TTS helper
let currentUtterance = null;

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    const selectedText = window.getSelection().toString();
    sendResponse({ text: selectedText });
  }

  if (request.action === 'speakText') {
    speakText(request.text);
    sendResponse({ success: true });
  }

  if (request.action === 'speakSelection') {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      speakText(selectedText);
    }
    sendResponse({ success: true });
  }

  if (request.action === 'speakPageText') {
    const pageText = extractPageText();
    speakText(pageText);
    sendResponse({ success: true });
  }

  if (request.action === 'stopSpeaking') {
    stopSpeaking();
    sendResponse({ success: true });
  }

  return true;
});

// Extract readable text from page
function extractPageText() {
  // Try to get main content
  const mainContent = document.querySelector('main, article, .content, #content');
  if (mainContent) {
    return mainContent.innerText;
  }

  // Fallback to body text
  const bodyText = document.body.innerText;

  // Clean up: remove excessive whitespace
  return bodyText.replace(/\s+/g, ' ').trim();
}

// Speak text using Web Speech API
async function speakText(text) {
  if (!text) return;

  // Stop any current speech
  stopSpeaking();

  // Get stored preferences
  const prefs = await getPreferences();

  // Create utterance
  currentUtterance = new SpeechSynthesisUtterance(text);

  // Apply preferences
  if (prefs) {
    currentUtterance.rate = prefs.speed || 1.0;
    currentUtterance.pitch = prefs.pitch || 1.0;
    currentUtterance.volume = prefs.volume || 1.0;
    currentUtterance.lang = prefs.language || 'en-US';

    // Try to find matching voice
    const voices = speechSynthesis.getVoices();
    const matchingVoice = voices.find(v =>
      v.lang === currentUtterance.lang ||
      v.name.includes(prefs.voice || '')
    );
    if (matchingVoice) {
      currentUtterance.voice = matchingVoice;
    }
  }

  // Add visual indicator
  showSpeakingIndicator(text);

  // Handle events
  currentUtterance.onend = () => {
    hideSpeakingIndicator();
    currentUtterance = null;
  };

  currentUtterance.onerror = (error) => {
    console.error('Speech synthesis error:', error);
    hideSpeakingIndicator();
    currentUtterance = null;
  };

  // Speak
  speechSynthesis.speak(currentUtterance);
}

// Stop speaking
function stopSpeaking() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  hideSpeakingIndicator();
  currentUtterance = null;
}

// Get stored preferences
function getPreferences() {
  return new Promise((resolve) => {
    chrome.storage.local.get('tts_preferences', (result) => {
      resolve(result.tts_preferences);
    });
  });
}

// Visual indicator for speaking
function showSpeakingIndicator(text) {
  // Remove existing indicator
  hideSpeakingIndicator();

  // Create indicator
  const indicator = document.createElement('div');
  indicator.id = 'easytts-indicator';
  indicator.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div class="easytts-pulse"></div>
      <span>Reading aloud...</span>
      <button id="easytts-stop" style="margin-left: auto; padding: 4px 8px; background: white; border: none; border-radius: 4px; cursor: pointer;">Stop</button>
    </div>
  `;

  document.body.appendChild(indicator);

  // Add stop button handler
  document.getElementById('easytts-stop').addEventListener('click', stopSpeaking);
}

// Hide speaking indicator
function hideSpeakingIndicator() {
  const indicator = document.getElementById('easytts-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Load voices when available
if (speechSynthesis) {
  speechSynthesis.addEventListener('voiceschanged', () => {
    // Voices are now loaded
  });
}
