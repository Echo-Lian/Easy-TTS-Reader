# Easy TTS Reader

A free, AI-powered Text-to-Speech (TTS) reader built with offline LLM Ollama. Convert text to natural-sounding speech across multiple platforms with a beautiful, intuitive interface.

## Features

- **Free and Open-Source**: No subscription, no API keys, completely free
- **AI-Powered Enhancement**: Optional Ollama integration to clean and optimize text before TTS
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

### Chrome Extension

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build:chrome
   ```
   check if the icons are generated in `dist/chrome-extension/icons/`. If not, run:
   ```bash
   npm install canvas
   ```
   Then run the build command again.

3. Load in Chrome:
   - Open `chrome://extensions/manage extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist/chrome-extension` folder

4. Start using:
   - Click the extension icon in the toolbar
   - Or right-click selected text → "Read selected text with TTS"

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

2. **Customizing Voice**:
   - Click the extension icon
   - Adjust speed, pitch, and volume sliders
   - Select language from dropdown
   - Changes are saved automatically

3. **AI Enhancement**:
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

## Development

### Project Structure

```
Easy-TTS-Reader/
├── chrome-extension/     # Chrome extension source
│   ├── manifest.json
│   ├── popup.html/js/css
│   ├── background.js
│   └── content.js
│   └── generate-icons.html
├── zotero-plugin/        # Zotero plugin source
│   ├── manifest.json
│   ├── bootstrap.js
│   └── content/
├── desktop/              # Electron desktop app
│   ├── main.js           # Main process
│   ├── preload.js        # Preload script
│   └── renderer/         # UI files
├── shared/               # Shared code
│   ├── tts-service.js    # TTS logic
│   └── storage-adapter.js # Storage abstraction
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

- **Extension won't load**: Make sure you're loading the `dist/chrome-extension` folder, not the source folder
- **Can't hear speech**: Check that Web Speech API is supported in your browser
- **Ollama not working**: Ensure Ollama is running on http://localhost:11434

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