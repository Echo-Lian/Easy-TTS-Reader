# Easy TTS Reader 🐚

A clean, AI-powered **PDF-to-Audio** reader. Drop a PDF, hear it read aloud in natural-sounding voices.

Built with Electron + OpenAI TTS (or free macOS system TTS).

## Quick Start

```bash
npm install
npm start
```

Then:
1. Click **⚙️ Settings** → paste your [OpenAI API key](https://platform.openai.com/api-keys)
2. Drop a PDF or click to browse
3. Click **▶ Play**

## Features

- 📄 **PDF text extraction** — drag-drop any PDF, get clean readable text
- 🎙️ **Natural-sounding TTS** — OpenAI tts-1/tts-1-hd with 6 voices (more coming)
- ⚡ **Speed control** — 0.5× to 2.0× playback speed
- 💾 **Export audio** — save speech as MP3
- 🚫 **No subscriptions** — pay-as-you-go OpenAI ($15 per million chars ≈ $0.75 per research paper)
- 🔑 **Offline option** — macOS system TTS (free, no API key needed)

## Tech Stack

| Layer | Choice |
|---|---|
| Desktop | Electron |
| PDF parsing | pdf-parse |
| TTS (primary) | OpenAI tts-1 / tts-1-hd |
| TTS (fallback) | macOS `say` command |
| Persistence | electron-store |
| HTTP | axios |

## Architecture

```
desktop/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── services/
│   ├── pdf-service.js   # PDF text extraction + chunking
│   └── tts-service.js   # TTS API calls (OpenAI + system)
└── renderer/
    ├── index.html       # UI
    ├── styles.css       # Styling (dark theme)
    └── app.js           # UI logic
```

## TTS Pricing

See [TTS API comparison](https://docs.google.com/spreadsheets/d/...) or check the `docs/` folder.

| Provider | Price/1M chars | Quality | Voices | Needs Key? |
|---|---|---|---|---|
| OpenAI tts-1 | $15 | High | 6 | Yes |
| macOS `say` | Free | Basic | Many | No |

A typical 20-page research paper (~50K chars) costs **~$0.75** with OpenAI TTS.

## License

MIT
