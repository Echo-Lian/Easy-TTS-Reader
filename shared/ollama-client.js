/**
 * Shared Ollama API Client
 * Used across all platforms: Chrome Extension (via server), Zotero Plugin, and Desktop App
 *
 * This module provides a unified interface for interacting with Ollama,
 * ensuring consistent prompts, error handling, and API calls across all platforms.
 */

class OllamaClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || 'qwen2:7b';
    this.timeout = config.timeout || 30000; // 30 seconds
  }

  /**
   * Check if Ollama is available and running
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.warn('Ollama health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Failed to list models:', error);
      throw error;
    }
  }

  /**
   * Generate text using Ollama
   * @private
   */
  async generate(prompt, model = null, options = {}) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || this.defaultModel,
          prompt: prompt,
          stream: false,
          ...options
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API responded with status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out. The text might be too long or the model is busy.');
      }
      throw error;
    }
  }

  /**
   * Summarize text for speech reading
   * Optimized prompt for converting long text into concise, speech-friendly summaries
   */
  async summarize(text, options = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text to summarize cannot be empty');
    }

    const model = options.model || this.defaultModel;
    const maxLength = options.maxLength || 500;

    const prompt = `Summarize the following text in a clear, concise way that's easy to understand when spoken aloud. Keep the summary natural and conversational, around ${maxLength} words or less:

${text}

Summary:`;

    try {
      const summary = await this.generate(prompt, model, {
        temperature: 0.7,
        top_p: 0.9,
        ...options.ollamaOptions
      });

      return {
        original: text,
        summary: summary.trim(),
        model: model,
        originalLength: text.length,
        summaryLength: summary.length
      };
    } catch (error) {
      console.error('Summarization failed:', error);
      throw new Error(`Failed to summarize text: ${error.message}`);
    }
  }

  /**
   * Enhance text to sound more natural when spoken by TTS
   * Transforms rigid, formal text into conversational, natural speech
   */
  async enhanceForSpeech(text, options = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text to enhance cannot be empty');
    }

    const model = options.model || this.defaultModel;
    const style = options.style || 'conversational'; // conversational, natural, storytelling

    let styleInstruction = '';
    switch(style) {
      case 'conversational':
        styleInstruction = 'Rewrite this in a friendly, conversational tone as if you\'re talking to a friend.';
        break;
      case 'natural':
        styleInstruction = 'Make this sound natural and easy to listen to when spoken aloud.';
        break;
      case 'storytelling':
        styleInstruction = 'Transform this into engaging, story-like narration.';
        break;
      default:
        styleInstruction = 'Make this sound natural when spoken aloud.';
    }

    const prompt = `${styleInstruction} Remove awkward phrasing, expand abbreviations, fix grammar, and make it flow smoothly. Keep all important information but make it sound like natural human speech, not robotic text.

Original text:
${text}

Natural speech version:`;

    try {
      const enhanced = await this.generate(prompt, model, {
        temperature: 0.7, // Higher temperature for more natural, varied output
        top_p: 0.9,
        ...options.ollamaOptions
      });

      return {
        original: text,
        enhanced: enhanced.trim(),
        model: model,
        style: style
      };
    } catch (error) {
      console.error('Enhancement failed:', error);
      // Return original text if enhancement fails
      console.warn('Returning original text due to enhancement failure');
      return {
        original: text,
        enhanced: text,
        model: model,
        error: error.message
      };
    }
  }

  /**
   * Translate text to another language (bonus feature)
   */
  async translate(text, targetLanguage, options = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text to translate cannot be empty');
    }

    const model = options.model || this.defaultModel;

    const prompt = `Translate the following text to ${targetLanguage}. Provide only the translation, no explanations:

${text}

Translation:`;

    try {
      const translation = await this.generate(prompt, model, {
        temperature: 0.3,
        ...options.ollamaOptions
      });

      return {
        original: text,
        translation: translation.trim(),
        targetLanguage: targetLanguage,
        model: model
      };
    } catch (error) {
      console.error('Translation failed:', error);
      throw new Error(`Failed to translate text: ${error.message}`);
    }
  }

  /**
   * Update the Ollama base URL
   */
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * Update the default model
   */
  setDefaultModel(model) {
    this.defaultModel = model;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      timeout: this.timeout
    };
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OllamaClient;
}

// For browser environments
if (typeof window !== 'undefined') {
  window.OllamaClient = OllamaClient;
}
