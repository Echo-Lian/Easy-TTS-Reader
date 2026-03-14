# Shared Code - Cross-Platform Components

This directory contains shared code used across all Easy TTS Reader platforms (Chrome Extension, Zotero Plugin, and Desktop App).

## Files

### ollama-client.js

**Purpose:** Unified Ollama API client for all platforms

**Features:**
- Consistent API calls to Ollama across all platforms
- **Text enhancement for natural-sounding speech** (main feature - makes TTS sound less robotic)
- Text summarization optimized for speech (bonus feature)
- Translation support (bonus feature)
- Health checking and model listing
- Error handling and timeout management
- Configurable model and base URL

**Usage:**

#### In Desktop/Zotero (Direct Node.js)
```javascript
const OllamaClient = require('./shared/ollama-client');

const client = new OllamaClient({
  baseUrl: 'http://localhost:11434',
  defaultModel: 'qwen2:7b'
});

// Enhance text to sound more natural (primary use case)
const enhanced = await client.enhanceForSpeech(rigidText, { style: 'conversational' });
console.log(enhanced.enhanced); // Will sound more natural when spoken by TTS

// Summarize text (bonus feature)
const result = await client.summarize(longText, { maxLength: 500 });
console.log(result.summary);
```

#### In Chrome Extension (Via Server)
The Chrome extension cannot call Ollama directly due to CORS. It uses `/server/index.js` which imports and uses this client.

```javascript
// Chrome extension calls server endpoint to enhance text
const response = await fetch('http://localhost:3000/enhance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: selectedText })
});
const data = await response.json();
// data.result is now natural-sounding text
chrome.tts.speak(data.result); // Sounds less robotic!
```

### tts-service.js

**Purpose:** Text-to-Speech service using Web Speech API with Ollama integration

**Features:**
- Cross-platform TTS using Web Speech API
- Preference management (speed, pitch, volume, language)
- Cache management for repeated text
- Ollama integration for text enhancement
- Batch processing support
- Storage adapter integration

**Usage:**

```javascript
const TTSService = require('./shared/tts-service');
const StorageAdapter = require('./shared/storage-adapter');

const storage = new StorageAdapter();
const ttsService = new TTSService('http://localhost:11434', 'qwen2:7b');

// Load saved preferences
await ttsService.loadPreferences(storage);

// Enhance and speak
const enhancedText = await ttsService.enhanceTextWithAI(rawText);
await ttsService.textToSpeech(enhancedText);

// Or summarize and speak
const summary = await ttsService.summarizeText(longText, 500);
await ttsService.textToSpeech(summary);
```

### storage-adapter.js

**Purpose:** Unified storage interface across platforms

**Features:**
- Abstracts storage differences between platforms
- Chrome Extension → chrome.storage.local
- Zotero Plugin → Zotero.Prefs
- Desktop App → electron-store (via preload)
- Fallback → localStorage

**Usage:**

```javascript
const StorageAdapter = require('./shared/storage-adapter');

const storage = new StorageAdapter();

// Save data
await storage.set('preferences', { theme: 'dark' });

// Load data
const prefs = await storage.get('preferences');

// Remove data
await storage.remove('preferences');

// Clear all
await storage.clear();
```

## Architecture

### Platform-Specific Usage

```
┌─────────────────────────────────────────────────────────────┐
│                      Easy TTS Reader                         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼─────┐         ┌────▼─────┐         ┌────▼─────┐
   │  Chrome  │         │  Zotero  │         │ Desktop  │
   │Extension │         │  Plugin  │         │   App    │
   └────┬─────┘         └────┬─────┘         └────┬─────┘
        │                     │                     │
        │ (Via Server)        │ (Direct)            │ (Direct)
        │                     │                     │
   ┌────▼─────┐         ┌────▼─────────────────────▼─────┐
   │  Server  │         │      shared/ollama-client.js    │
   │index.js  │────────►│                                  │
   └──────────┘         └──────────────────────────────────┘
                                      │
                                ┌─────▼─────┐
                                │  Ollama   │
                                │localhost  │
                                │  :11434   │
                                └───────────┘
```

### Why This Architecture?

1. **Chrome Extension Limitation:** Chrome extensions cannot directly call localhost APIs due to CORS restrictions
   - **Solution:** `/server/index.js` acts as a proxy
   - Server imports `shared/ollama-client.js` for Ollama communication

2. **Desktop & Zotero Freedom:** No browser restrictions
   - **Solution:** Directly import and use `shared/ollama-client.js`

3. **Code Reusability:** All Ollama prompts and logic are centralized
   - Changes to prompts automatically apply to all platforms
   - Consistent behavior across Chrome, Zotero, and Desktop

## Adding New Ollama Features

To add a new Ollama-powered feature:

1. **Add method to `ollama-client.js`:**
   ```javascript
   async yourNewFeature(text, options = {}) {
     const prompt = `Your custom prompt: ${text}`;
     return await this.generate(prompt, options.model);
   }
   ```

2. **Add server endpoint (for Chrome):**
   ```javascript
   // In server/index.js
   app.post("/your-feature", async (req, res) => {
     const result = await ollamaClient.yourNewFeature(req.body.text);
     res.json({ result });
   });
   ```

3. **Use in Desktop/Zotero directly:**
   ```javascript
   const result = await ollamaClient.yourNewFeature(text);
   ```

## Benefits

- ✅ **Single source of truth** for Ollama integration
- ✅ **Consistent prompts** across all platforms
- ✅ **Easy maintenance** - update once, apply everywhere
- ✅ **Platform-optimized** - Chrome via server, Desktop/Zotero direct
- ✅ **No code duplication** - DRY principle

## Development Tips

1. **Testing Ollama features:** Test in Desktop app first (easier debugging)
2. **Chrome extension:** Always test with server running
3. **Shared changes:** Any change to shared files affects all platforms
4. **Model switching:** Change default model in platform-specific config files

## License

MIT
