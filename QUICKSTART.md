# Quick Start Guide

Get up and running with Easy TTS Reader in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Choose Your Platform

### Option A: Desktop Application (Recommended for first-time users)

```bash
npm run start:desktop
```

That's it! The desktop app will open and you can start using it immediately.

### Option B: Chrome Extension

```bash
npm run build:chrome
```

Then load the extension in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/chrome-extension` folder

### Option C: Zotero Plugin

```bash
npm install archiver --save-dev
npm run build:zotero
```

Then install in Zotero:
1. Open Zotero
2. Tools → Add-ons → Gear icon → Install Add-on From File
3. Select `dist/zotero-plugin/easytts-zotero.xpi`

## Step 3: (Optional) Set Up Ollama for AI Enhancement

1. Download and install Ollama: https://ollama.ai/
2. Open terminal and run:
   ```bash
   ollama pull llama2
   ```
3. Make sure Ollama is running (it runs in the background)
4. Enable "Enhance with AI" in the app

## Step 4: Start Using It!

### Desktop App
- Type or paste text
- Click "Speak" or press Ctrl+S
- Adjust speed, pitch, volume to your preference

### Chrome Extension
- Select text on any webpage
- Right-click → "Read selected text with TTS"

### Zotero Plugin
- Select a paper in your library
- Right-click → "Read Abstract with TTS"

## Tips

- All settings are saved automatically
- Use the cache to quickly replay previously converted text
- Batch process multiple files in the desktop app
- Use OCR to extract text from images (desktop app)

## Need Help?

Check the main [README.md](README.md) for detailed documentation and troubleshooting.
