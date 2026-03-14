# Easy TTS Reader

A free, AI-powered Text-to-Speech (TTS) reader built with offline LLM Ollama. Convert text to natural-sounding speech across multiple platforms with a concise and intuitive interface.

## Features

- **Free and Open-Source**: No subscription, no API keys, completely free
- **AI-Powered Natural Voice**: Use Ollama to transform rigid text into natural, conversational speech (sounds way less robotic!)
- **Multi-Platform Support**:
  - Chrome Extension for reading web content
  - Zotero Plugin for academic papers and research
  - Desktop Application with OCR support for images
- **Smart Cache Management**: Instantly replay previously converted text
- **Customizable Voice Settings**:
  - Adjustable speed (0.5x - 2.0x)
  - Adjustable pitch (0.5 - 2.0)
  - Volume control
- **Multi-Language Support**: English, Spanish, French, German, Italian, Japanese, Chinese, Korean, Russian
- **Batch Processing**: Convert multiple text files at once (Desktop app)
- **OCR Support**: Extract text from images (Desktop app)

## Prerequisites

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **Ollama** (optional, for AI enhancement) - [Download here](https://ollama.ai/)
   - After installing Ollama, run: `ollama pull llama2`

## Installation

### Chrome Extension (Complete Setup from Scratch)

#### Prerequisites
Before starting, make sure you have:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Ollama** (for AI enhancement) - [Download here](https://ollama.ai/)

#### Step 1: Install Dependencies

Open your terminal and navigate to the project folder, then run:

```bash
npm install
```

This installs all required packages. If you encounter issues with icon generation later, also run:

```bash
npm install canvas
```

#### Step 2: Install and Setup Ollama

1. **Install Ollama** from [ollama.ai](https://ollama.ai/)

2. **Pull the qwen2:7b model** (required for AI enhancement):
   ```bash
   ollama pull qwen2:7b
   ```

3. **Start Ollama** (it needs to be running for AI features to work):
   ```bash
   ollama serve
   ```

   Leave this terminal window open. Ollama must keep running in the background.

#### Step 3: Build the Chrome Extension

In a **new terminal window** (keep Ollama running), run:

```bash
npm run build:chrome
```

This will:
- Copy all extension files to `dist/chrome-extension/`
- Copy shared files (ollama-client.js, tts-service.js, etc.)
- Generate extension icons
- Verify all files are present

**Output location:** `dist/chrome-extension/`

#### Step 4: Start the Local Server

The Chrome extension needs a local server to communicate with Ollama (due to browser security restrictions). Start it with:

```bash
npm run start:server
```

**Important:** Keep this terminal window open. The server must stay running for AI features to work.

You should see:
```
✓ Server running on http://localhost:3000
✓ Ollama URL: http://localhost:11434
✓ Model: qwen2:7b
```

#### Step 5: Load Extension in Chrome

1. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

2. **Enable "Developer mode"** (toggle in the top right corner)

3. Click **"Load unpacked"** button

4. Navigate to and select:
   ```
   /path/to/Easy-TTS-Reader/dist/chrome-extension/
   ```

5. The extension should now appear in your extensions list

#### Step 6: Test the Extension

**For First-Time Use:**
1. Go to any webpage
2. Select some text
3. Right-click and choose **"Read with natural AI voice"**
4. The text will be enhanced by AI and spoken in a more natural voice

**For Regular TTS (without AI):**
- Right-click selected text → **"Read selected text with TTS"**

**For Summarization:**
- Right-click selected text → **"Summarize and speak"** (great for long articles)

**Using the Popup:**
1. Click the extension icon in the toolbar
2. Paste or type text
3. Check **"Enhance with AI (Ollama)"** for natural voice
4. Adjust speed, pitch, volume settings
5. Click **"Speak"**

#### Updating the Extension After Changes

If you make changes to the code and rebuild:

1. Run the build command again:
   ```bash
   npm run build:chrome
   ```

2. **Reload the extension in Chrome:**
   - Go to `chrome://extensions/`
   - Find "Easy TTS Reader"
   - Click the **reload icon (🔄)** on the extension card

**Important:** You MUST reload the extension after every rebuild for changes to take effect!

#### Quick Start Commands Summary

```bash
# 1. Install dependencies (one time)
npm install

# 2. Start Ollama (keep running)
ollama serve

# 3. Build the extension (run after any code changes)
npm run build:chrome

# 4. Start the local server (keep running)
npm run start:server
```

Then load `dist/chrome-extension/` in Chrome.

### Zotero Plugin

1. Install dependencies:
   ```bash
   npm install
   npm install archiver --save-dev
   ```

2. Build the plugin:
   ```bash
   npm run build:zotero
   ```

3. Install in Zotero:
   - Open Zotero
   - Go to Tools → Add-ons
   - Click the gear icon → "Install Add-on From File"
   - Select `dist/zotero-plugin/easytts-zotero.xpi`
   - Restart Zotero

4. Start using:
   - Select an item in your library
   - Right-click → "Read Abstract with TTS"
   - Or Tools → "Easy TTS Reader" to open the full interface

### Desktop Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. For OCR support (optional):
   ```bash
   npm install tesseract.js
   ```

3. Run in development mode:
   ```bash
   npm run start:desktop
   ```

4. Build for production:
   ```bash
   npm run build:desktop
   ```
   - macOS: Find the `.app` in `dist/desktop/`
   - Windows: Find the `.exe` in `dist/desktop/`
   - Linux: Find the `.AppImage` in `dist/desktop/`

## Usage

### Chrome Extension

1. **Reading Selected Text**:
   - Select text on any webpage
   - Right-click → "Read selected text with TTS"
   - Or click the extension icon and paste text

2. **AI-Enhanced Natural Voice**:
   - Make sure the local server is running: `npm run start:server`
   - Make sure Ollama is running with qwen2:7b model
   - Select text on any webpage
   - Right-click → "Read with natural AI voice"
   - The text will be:
     1. Sent to the local Node.js server
     2. Transformed into natural, conversational language by Ollama
     3. Spoken using Chrome TTS API (sounds much less robotic!)
   - Perfect for making rigid, formal text sound more natural and pleasant to listen to

3. **AI-Powered Summarization** (Bonus):
   - Right-click → "Summarize and speak"
   - Great for long articles, research papers, or blog posts
   - Gets a concise summary before speaking

4. **Customizing Voice**:
   - Click the extension icon
   - Adjust speed, pitch, and volume sliders
   - Select language from dropdown
   - Changes are saved automatically

5. **AI Enhancement**:
   - Enable "Enhance with AI (Ollama)" checkbox
   - Make sure Ollama is running locally
   - Text will be cleaned and optimized before speaking

### Zotero Plugin

1. **Reading Item Abstracts**:
   - Select an item in your library
   - Right-click → "Read Abstract with TTS"

2. **Reading Item Notes**:
   - Select an item with notes
   - Right-click → "Read Notes with TTS"

3. **Full Interface**:
   - Tools → "Easy TTS Reader"
   - Type or paste text
   - Click "Load Selected Abstract" or "Load Selected Notes"
   - Adjust voice settings
   - Click "Speak"

### Desktop Application

1. **Basic Text-to-Speech**:
   - Type or paste text in the editor
   - Adjust voice settings on the right panel
   - Click "Speak" button (or Ctrl+S)

2. **Opening Text Files**:
   - Click "Open Text" button
   - Or File → Open Text File (Ctrl+O)
   - Select a .txt, .md, or .rtf file

3. **OCR from Images**:
   - Click "Open Image" button
   - Or File → Open Image (Ctrl+Shift+O)
   - Select an image file
   - Text will be extracted automatically

4. **Batch Processing**:
   - Click "Add Multiple Files" in the Batch Processing section
   - Select multiple text files
   - Click "Process Batch"
   - All files will be converted to speech sequentially

5. **Exporting Audio**:
   - Enter text to convert
   - File → Export Audio (Ctrl+E)
   - Note: Requires additional setup (see Development section)

## Configuration

### Voice Settings

All platforms save your preferences automatically:
- **Speed**: How fast the text is read (1.0 = normal)
- **Pitch**: Voice pitch/tone (1.0 = normal)
- **Volume**: Playback volume (1.0 = maximum)
- **Language**: Choose from 10+ supported languages

### Ollama Integration

1. Install Ollama: https://ollama.ai/
2. Pull a model: `ollama pull llama2`
3. Make sure Ollama is running (default: http://localhost:11434)
4. Enable "Enhance with AI" in the interface

The AI will:
- Remove formatting artifacts
- Fix typos
- Improve readability
- Make text flow naturally when spoken

## Architecture

### Shared Ollama Integration

All platforms use a unified Ollama client (`shared/ollama-client.js`) for consistent AI-powered features:

- **Chrome Extension:** Uses `/server/` as a proxy (CORS restriction workaround)
  - Extension → Server (localhost:3000) → Ollama
- **Desktop & Zotero:** Call Ollama directly (no browser restrictions)
  - App → Ollama (localhost:11434)

This architecture ensures:
- ✅ Same prompts and behavior across all platforms
- ✅ Single source of truth for AI features
- ✅ Easy maintenance and updates
- ✅ Platform-optimized communication

See `/shared/README.md` for detailed architecture documentation.

## Development

### Project Structure

```
Easy-TTS-Reader/
├── chrome-extension/     # Chrome extension source
│   ├── manifest.json
│   ├── popup.html/js/css
│   ├── background.js
│   └── content.js
├── zotero-plugin/        # Zotero plugin source
│   ├── manifest.json
│   ├── bootstrap.js
│   └── content/
├── desktop/              # Electron desktop app
│   ├── main.js           # Main process
│   ├── preload.js        # Preload script
│   └── renderer/         # UI files
├── server/               # Local Node.js server (Chrome extension proxy)
│   ├── index.js          # Express server for Ollama integration
│   └── README.md         # Server documentation
├── shared/               # Shared code (all platforms)
│   ├── ollama-client.js  # Unified Ollama API client
│   ├── tts-service.js    # TTS logic
│   ├── storage-adapter.js # Storage abstraction
│   └── README.md         # Shared architecture docs
└── scripts/              # Build scripts
```

### Build Commands

```bash
npm run build:chrome      # Build Chrome extension
npm run build:zotero      # Build Zotero plugin
npm run build:desktop     # Build desktop app
npm run build:all         # Build everything
npm run start:desktop     # Run desktop app in dev mode
```

### Adding Audio Export

To enable audio export in the desktop app:

1. Install text-to-speech library:
   ```bash
   npm install @google-cloud/text-to-speech
   # or
   npm install say
   ```

2. Update `desktop/main.js` to implement audio export

### Adding Better OCR

1. Install tesseract.js:
   ```bash
   npm install tesseract.js
   ```

2. Update the `perform-ocr` handler in `desktop/main.js`:
   ```javascript
   const Tesseract = require('tesseract.js');
   const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
   ```

## Troubleshooting

### Chrome Extension

#### Extension won't load
- Make sure you're loading the **`dist/chrome-extension`** folder, not the source `chrome-extension` folder
- Verify the build completed successfully: check that `dist/chrome-extension/` contains manifest.json and all other files

#### Still hearing robotic voice (AI not working)
This is the most common issue. Check these steps:

1. **Is the server running?**
   ```bash
   curl http://localhost:3000/health
   ```
   If it fails, start the server: `npm run start:server`

2. **Is Ollama running?**
   ```bash
   ollama list
   ```
   Should show `qwen2:7b` model. If Ollama isn't running: `ollama serve`

3. **Did you reload the extension after rebuilding?**
   - Go to `chrome://extensions/`
   - Click the reload icon (🔄) on "Easy TTS Reader"

4. **Are you using the right context menu option?**
   - Use **"Read with natural AI voice"** (not "Read selected text with TTS")
   - Or check the **"Enhance with AI (Ollama)"** checkbox in the popup

5. **Check the browser console for errors:**
   - Right-click the page → Inspect → Console tab
   - Look for connection errors to localhost:3000

#### Server won't start - "Port already in use"
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (replace PID with the number from above)
kill -9 PID

# Or use a different port
PORT=3001 npm run start:server
```

If using a different port, update `chrome-extension/content.js` line 126 and 147 to use the new port.

#### Icons not generated during build
```bash
npm install canvas
npm run build:chrome
```

If that fails, open `chrome-extension/generate-icons.html` in a browser and manually download the icons to `dist/chrome-extension/icons/`.

#### Extension interface hasn't changed after rebuild
You MUST reload the extension in Chrome after every rebuild:
1. Go to `chrome://extensions/`
2. Find "Easy TTS Reader"
3. Click the circular reload icon (🔄)

Simply rebuilding is not enough - Chrome caches the old version.

#### Can't hear any speech
- Check that Web Speech API is supported in your browser (Chrome, Edge, Safari)
- Check browser volume and system volume
- Try the simple "Read selected text with TTS" option first (doesn't need AI)

### Zotero Plugin

- **Plugin won't install**: Make sure you're selecting the .xpi file, not the folder
- **Can't read abstracts**: Ensure the item has an abstract field
- **UI not showing**: Try restarting Zotero

### Desktop Application

- **App won't start**: Run `npm install` to ensure all dependencies are installed
- **OCR not working**: Install tesseract.js (see Development section)
- **No audio**: Check system audio settings and permissions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Uses [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- AI enhancement powered by [Ollama](https://ollama.ai/)
- OCR support via [Tesseract.js](https://tesseract.projectnaptha.com/)

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

## Roadmap

- [ ] Support for more TTS engines (Google Cloud TTS, Azure TTS)
- [ ] Mobile app versions (iOS/Android)
- [ ] Cloud sync for preferences
- [ ] More language support
- [ ] Voice cloning features
- [ ] PDF direct reading support