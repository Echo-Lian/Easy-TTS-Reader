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

  if (request.action === 'stopPageSpeaking') {
    stopSpeaking();
    sendResponse({ success: true });
  }

  if (request.action === 'speakPageText') {
    const pageText = extractPageText();
    // Option A: Just start speaking immediately (Current behavior)
    speakText(pageText); 
    
    // Option B: Send the text back to the popup so it fills the box
    sendResponse({ text: pageText, success: true });
  }

  if (request.action === 'enhanceAndSpeak') {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      handleEnhanceAndSpeak(selectedText);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No text selected' });
    }
  }

  if (request.action === 'summarizeAndSpeak') {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      handleSummarizeAndSpeak(selectedText);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No text selected' });
    }
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

  // Actually start speaking
  speechSynthesis.speak(currentUtterance);
}

// Enhance text to sound natural using Ollama model via Node server
async function enhanceText(text) {
  try {
    const res = await fetch("http://localhost:3000/enhance", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }

    const data = await res.json();
    return data.result;
  } catch (error) {
    console.error('Error enhancing text:', error);
    throw error;
  }
}

// Summarize text using local Ollama model via Node server
async function summarizeText(text) {
  try {
    const res = await fetch("http://localhost:3000/summarize", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }

    const data = await res.json();
    return data.result;
  } catch (error) {
    console.error('Error summarizing text:', error);
    throw error;
  }
}

// Handle the complete workflow: select text -> enhance to natural speech -> speak
async function handleEnhanceAndSpeak(selectedText) {
  try {
    // Show loading indicator
    showSpeakingIndicator('Making text sound natural...');

    // Get enhanced, natural-sounding text from Ollama via Node server
    const enhancedText = await enhanceText(selectedText);

    // Update indicator
    hideSpeakingIndicator();
    showSpeakingIndicator('Reading with natural voice...');

    // Speak the enhanced text using chrome.tts API
    // The text is now more conversational, so TTS will sound less robotic
    chrome.tts.speak(enhancedText, {
      onEvent: (event) => {
        if (event.type === 'end') {
          hideSpeakingIndicator();
        } else if (event.type === 'error') {
          console.error('TTS error:', event);
          hideSpeakingIndicator();
        }
      }
    });

  } catch (error) {
    console.error('Error in enhance and speak workflow:', error);
    hideSpeakingIndicator();
    alert('Error: Could not connect to local server. Make sure the Node server is running on localhost:3000');
  }
}

// Handle the complete workflow: select text -> summarize -> speak
async function handleSummarizeAndSpeak(selectedText) {
  try {
    // Show loading indicator
    showSpeakingIndicator('Summarizing text...');

    // Get summary from Ollama via Node server
    const summary = await summarizeText(selectedText);

    // Update indicator
    hideSpeakingIndicator();
    showSpeakingIndicator('Reading summary...');

    // Speak the summary using chrome.tts API
    chrome.tts.speak(summary, {
      onEvent: (event) => {
        if (event.type === 'end') {
          hideSpeakingIndicator();
        } else if (event.type === 'error') {
          console.error('TTS error:', event);
          hideSpeakingIndicator();
        }
      }
    });

  } catch (error) {
    console.error('Error in summarize and speak workflow:', error);
    hideSpeakingIndicator();
    alert('Error: Could not connect to local server. Make sure the Node server is running on localhost:3000');
  }
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
