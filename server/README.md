# Easy TTS Reader - Local Server

This Node.js server acts as a middleware between the Chrome extension and Ollama, enabling AI-powered text summarization before text-to-speech conversion.

## Purpose

The Chrome extension cannot directly communicate with Ollama due to browser security restrictions (CORS). This server solves that by:

1. Receiving text from the Chrome extension
2. Forwarding it to Ollama for AI enhancement (makes text sound more natural)
3. Returning the enhanced text to the extension
4. The extension then uses `chrome.tts.speak()` to read it aloud
5. Result: TTS sounds much less robotic because the text is now conversational!

## Architecture

```
Chrome Extension (User selects text)
         ↓
    POST /summarize
         ↓
  This Server (localhost:3000)
         ↓
    Ollama API (localhost:11434)
         ↓
    qwen2:7b model generates summary
         ↓
  Return to Chrome Extension
         ↓
   chrome.tts.speak(summary)
```

## Prerequisites

- Node.js (v16 or higher)
- Ollama installed and running
- qwen2:7b model pulled

## Installation

1. Install dependencies from the project root:
   ```bash
   npm install
   ```

2. Pull the Ollama model:
   ```bash
   ollama pull qwen2:7b
   ```

## Running the Server

### Quick Start

From the project root:
```bash
npm run start:server
```

### Manual Start

```bash
node server/index.js
```

### With Custom Configuration

```bash
PORT=3001 OLLAMA_MODEL=llama2 node server/index.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `qwen2:7b` | Ollama model to use |

## API Endpoints

### GET /health

Health check endpoint to verify the server and Ollama are running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-03-14T12:00:00.000Z",
  "ollamaUrl": "http://localhost:11434",
  "model": "qwen2:7b",
  "ollamaAvailable": true
}
```

### POST /summarize

Summarizes text using the configured Ollama model, optimized for text-to-speech.

**Request:**
```json
{
  "text": "Your long text to summarize...",
  "maxLength": 500
}
```

**Success Response (200):**
```json
{
  "result": "Summarized text optimized for speech...",
  "model": "qwen2:7b",
  "originalLength": 1500,
  "summaryLength": 300
}
```

**Error Response (400/500):**
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": "Additional context"
}
```

### POST /enhance

Enhances text for better TTS readability (removes formatting, fixes typos, expands abbreviations).

**Request:**
```json
{
  "text": "Txt w/ formatting issues & abbrev."
}
```

**Success Response (200):**
```json
{
  "result": "Text with formatting issues and abbreviations.",
  "model": "qwen2:7b",
  "originalLength": 42,
  "enhancedLength": 55,
  "error": null
}
```

**Error Response (400/500):**
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": "Additional context"
}
```

## Architecture

This server uses the **shared Ollama client** (`/shared/ollama-client.js`) for all Ollama interactions. This ensures:

- Consistent prompts across Chrome, Desktop, and Zotero platforms
- Single source of truth for Ollama integration
- Easy maintenance and updates

```
Chrome Extension → Server (localhost:3000) → shared/ollama-client.js → Ollama
Desktop App     → shared/ollama-client.js → Ollama (direct)
Zotero Plugin   → shared/ollama-client.js → Ollama (direct)
```

See `/shared/README.md` for more details on the shared architecture.

## Usage with Chrome Extension

1. Start the server:
   ```bash
   npm run start:server
   ```

2. Make sure Ollama is running:
   ```bash
   ollama serve
   ```

3. In Chrome:
   - Select text on any webpage
   - Right-click → "Read with natural AI voice" (makes text sound conversational)
   - Or right-click → "Summarize and speak" (condenses long text)
   - The text will be enhanced/summarized and read aloud with less robotic sound

## Troubleshooting

### Server won't start

- **Port already in use**: Change the port with `PORT=3001 npm run start:server`
- **Missing dependencies**: Run `npm install` from project root

### "Failed to generate summary" error

- **Ollama not running**: Start Ollama with `ollama serve`
- **Model not available**: Pull the model with `ollama pull qwen2:7b`
- **Wrong Ollama URL**: Check if Ollama is running on a different port

### CORS errors in Chrome

- The server already has CORS enabled for all origins
- Make sure you're accessing from `http://localhost:3000`

## Development

### Adding New Endpoints

Edit `server/index.js` and add new Express routes:

```javascript
app.post("/your-endpoint", async (req, res) => {
  // Your logic here
});
```

### Using Different Models

Change the model in the environment variable:
```bash
OLLAMA_MODEL=llama3 npm run start:server
```

Or modify the default in `server/index.js`:
```javascript
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "your-model";
```

### Logging

The server logs all requests with timestamps:
```
[2024-03-14T12:00:00.000Z] Summarizing text (1500 chars)...
[2024-03-14T12:00:05.000Z] Summary generated successfully
```

## Security Notes

- This server is designed for **local use only**
- Do not expose it to the internet without proper authentication
- The default CORS policy allows all origins for local development
- For production use, restrict CORS to specific origins

## License

MIT
