/**
 * Shared TTS Service using Ollama
 * This service is used across Chrome Extension, Zotero Plugin, and Desktop App
 */

// Import OllamaClient if available
let OllamaClient;
if (typeof require !== 'undefined') {
  try {
    OllamaClient = require('./ollama-client');
  } catch (e) {
    // Will be loaded via script tag in browser
  }
}

class TTSService {
  constructor(ollamaUrl = 'http://localhost:11434', model = 'qwen2:7b') {
    this.ollamaUrl = ollamaUrl;
    this.cache = new Map();
    this.preferences = {
      model: model,
      voice: 'default',
      pitch: 1.0,
      speed: 1.0,
      volume: 1.0,
      language: 'en-US'
    };

    // Initialize Ollama client for desktop and Zotero
    if (OllamaClient || (typeof window !== 'undefined' && window.OllamaClient)) {
      const Client = OllamaClient || window.OllamaClient;
      this.ollamaClient = new Client({
        baseUrl: ollamaUrl,
        defaultModel: this.preferences.model
      });
    }
  }

  /**
   * Load preferences from storage
   */
  async loadPreferences(storage) {
    try {
      const saved = await storage.get('tts_preferences');
      if (saved) {
        this.preferences = { ...this.preferences, ...saved };
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  /**
   * Save preferences to storage
   */
  async savePreferences(storage) {
    try {
      await storage.set('tts_preferences', this.preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  /**
   * Update preferences
   */
  updatePreferences(newPrefs) {
    this.preferences = { ...this.preferences, ...newPrefs };

    // Update Ollama client model if changed
    if (this.ollamaClient && newPrefs.model) {
      this.ollamaClient.setDefaultModel(newPrefs.model);
    }
  }

  /**
   * Generate cache key for text
   */
  getCacheKey(text, settings) {
    const settingsStr = JSON.stringify(settings);
    return `${text}_${settingsStr}`;
  }

  /**
   * Convert text to speech using Web Speech API with custom settings
   */
  async textToSpeech(text, options = {}) {
    const settings = { ...this.preferences, ...options };
    const cacheKey = this.getCacheKey(text, settings);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use Web Speech API for actual TTS
      const result = await this.synthesizeSpeech(text, settings);

      // Cache the result
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('TTS conversion failed:', error);
      throw error;
    }
  }

  /**
   * Synthesize speech using Web Speech API
   */
  synthesizeSpeech(text, settings) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        // For Node.js environments (desktop app), use alternative method
        resolve({ text, settings, audio: null });
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = settings.language;
      utterance.pitch = settings.pitch;
      utterance.rate = settings.speed;
      utterance.volume = settings.volume;

      // Try to find matching voice
      const voices = speechSynthesis.getVoices();
      const matchingVoice = voices.find(v =>
        v.lang === settings.language ||
        v.name.includes(settings.voice)
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onend = () => resolve({ text, settings, utterance });
      utterance.onerror = (error) => reject(error);

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Enhance text using Ollama AI before TTS
   * Uses shared OllamaClient for consistent behavior across platforms
   */
  async enhanceTextWithAI(text) {
    try {
      // Use shared Ollama client if available (desktop, Zotero)
      if (this.ollamaClient) {
        const result = await this.ollamaClient.enhanceForSpeech(text, {
          model: this.preferences.model
        });
        return result.enhanced;
      }

      // Fallback to direct fetch for compatibility
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.preferences.model,
          prompt: `Clean and format the following text for text-to-speech reading. Remove any unnecessary formatting, fix obvious typos, and make it flow naturally when read aloud:\n\n${text}`,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('Ollama API request failed');
      }

      const data = await response.json();
      return data.response || text;
    } catch (error) {
      console.warn('AI enhancement failed, using original text:', error);
      return text;
    }
  }

  /**
   * Summarize text using Ollama AI
   * Uses shared OllamaClient for consistent behavior across platforms
   */
  async summarizeText(text, maxLength = 500) {
    try {
      if (this.ollamaClient) {
        const result = await this.ollamaClient.summarize(text, {
          model: this.preferences.model,
          maxLength: maxLength
        });
        return result.summary;
      }

      // Fallback for environments without OllamaClient
      throw new Error('Summarization requires OllamaClient or server endpoint');
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }

  /**
   * Batch process multiple texts
   */
  async batchProcess(texts, options = {}) {
    const results = [];
    for (const text of texts) {
      try {
        const result = await this.textToSpeech(text, options);
        results.push({ success: true, text, result });
      } catch (error) {
        results.push({ success: false, text, error: error.message });
      }
    }
    return results;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    return this.cache.size;
  }

  /**
   * Export audio to file (for desktop app)
   */
  async exportToAudio(text, outputPath, format = 'mp3') {
    // This will be implemented in the desktop app with node modules
    throw new Error('Export to audio is only available in desktop application');
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TTSService;
}
