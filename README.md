# Easy TTS Reader 🐚

A clean, AI-powered **PDF-to-Audio** reader. Drop a PDF, hear it read aloud in natural-sounding voices — fully local and free.

![screenshot](https://img.shields.io/badge/status-active-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

---

## Quick Start

```bash
# Install Node.js dependencies
npm install

# Launch the desktop app
npm start
```

Then:
1. **Drop a PDF** (or click to browse) — text is extracted automatically
2. Click **▶ Play** — Kokoro-82M generates speech locally, and the language is auto-detected
3. Adjust **Speed** and **Voice** to your preference

No API key needed. No subscriptions. No internet required after first model download.

---

## Features

| Feature | Details |
|---|---|
| 📄 **PDF support** | Extract text from any PDF (also .txt, .md). Handles 100+ page documents |
| 🌍 **Language auto-detect** | Automatically detects the PDF language and picks the right Kokoro voice (9 languages) |
| 🗣️ **Kokoro-82M (local)** | Free, open-weight TTS with 54 voices across 9 languages. Runs entirely on your machine |
| 🎙️ **OpenAI TTS** | Optional cloud TTS — 6 voices, higher quality, $0.75 per typical paper |
| 🔊 **System TTS** | macOS fallback — free, offline, basic quality |
| ⏱️ **Speed control** | 0.5× to 2.0× playback speed |
| 💾 **Export audio** | Save generated speech as an audio file |
| 🔒 **Private** | Kokoro runs 100% locally. Your documents never leave your computer |
| 🚫 **No signup** | No accounts, no subscriptions, no tracking |

---

## TTS Engines

### 🥇 Kokoro-82M (Local) — Default

[Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) is an open-weight TTS model with **82 million parameters**. Despite its small size, it delivers quality comparable to much larger models. Apache 2.0 licensed.

**54 voices** across **9 languages**:

| Language | Code | Example Voices |
|---|---|---|
| American English | `a` | `af_bella` (🔥), `af_heart` (❤️), `am_adam`, `am_onyx` |
| British English | `b` | `bf_alice`, `bf_isabella`, `bm_george`, `bm_daniel` |
| Japanese | `j` | `jf_alpha`, `jf_gongitsune`, `jm_kumo` |
| Spanish | `e` | `ef_dora`, `em_alex`, `em_santa` |
| French | `f` | `ff_siwis` |
| Hindi | `h` | `hf_alpha`, `hf_beta`, `hm_omega` |
| Italian | `i` | `if_sara`, `im_nicola` |
| Brazilian Portuguese | `p` | `pf_dora`, `pm_alex`, `pm_santa` |
| Chinese (Mandarin) | `z` | `zf_xiaobei`, `zf_xiaoyi`, `zm_yunxi` |

**Voice naming:** `{language}{gender}_{name}` — e.g., `af_bella` = American English, female, Bella.

**Pricing:** Free (local). ~$0.06 per hour of audio (electricity cost).

### 🥈 OpenAI TTS (Cloud)

OpenAI's `tts-1` / `tts-1-hd` models — 6 voices, 57 languages, simple API.

**Pricing:** $15 per million characters (~$0.75 per research paper). Requires an API key.

### 🥉 System TTS (macOS)

Your Mac's built-in speech synthesizer (`say` command). Works offline, no setup.

**Pricing:** Free.

---

## TTS API Pricing Reference

| Provider | Price/1M chars | Quality | Voices | Languages | Needs Key? |
|---|---|---|---|---|---|
| **Kokoro-82M** (local) | **Free** | High | 54 | 9 | ❌ |
| **macOS System** | Free | Basic | 143 | Many | ❌ |
| **OpenAI tts-1** | $15 | High | 6 | 57 | ✅ |
| **Google Neural2** | $16 | High | 200+ | 40+ | ✅ |
| **Amazon Polly Neural** | $16 | Medium | 60+ | 30+ | ✅ |
| **ElevenLabs** | ~$165 | Highest | 1000+ | 32 | ✅ |

---

## Batch CLI (Batch PDF-to-Audio)

For users who prefer the command line or want to convert many PDFs at once (e.g., an audiobook by chapters), use the batch converter script.

### Quick Start

```bash
# Convert all PDFs in a folder to WAV files
node batch-convert.js ./path/to/pdfs ./path/to/output
```

### Usage

```
node batch-convert.js <input-dir> <output-dir> [options]
```

**Arguments**

| Argument | Description |
|---|---|
| `input-dir` | Directory containing PDF files |
| `output-dir` | Directory to save WAV audio files |

**Options**

| Option | Default | Description |
|---|---|---|
| `--voice <name>` | `af_nova` | Kokoro voice to use (see voice tables above) |
| `--file <pattern>` | `*.pdf` | Convert only files matching this pattern |
| `--list` | — | Preview matching files without converting |
| `--help` | — | Show full help |

### Examples

```bash
# Convert all PDFs with a British voice
node batch-convert.js ./pdfs ./audio --voice bm_daniel

# Convert specific chapters
node batch-convert.js ./pdfs ./audio --file "chapter*.pdf"

# Preview which files will be converted
node batch-convert.js ./pdfs ./audio --list
```

Output files are saved as `.wav` (compatible with Apple Music, VLC, and all standard media players).

---

## Architecture

```
Easy-TTS-Reader/
├── package.json              # Node.js + Electron deps
├── batch-convert.js          # CLI batch converter (Kokoro, no GUI needed)
├── .kokoro-venv/             # Python venv (Python 3.12) for Kokoro
├── desktop/
│   ├── main.js               # Electron main process (IPC handlers, menus)
│   ├── preload.js            # Secure bridge (renderer ↔ main)
│   ├── services/
│   │   ├── pdf-service.js    # PDF text extraction (pdf-parse)
│   │   ├── tts-service.js    # TTS API integration (all providers)
│   │   └── kokoro_tts.py     # Kokoro-82M Python wrapper (lang detect, generation)
│   └── renderer/
│       ├── index.html         # Dark-themed UI
│       ├── styles.css         # Styling
│       └── app.js             # Renderer logic
└── README.md
```

### Data Flow

```
PDF ──→ pdf-parse ──→ text ──→ kokoro_tts.py ──→ WAV audio ──→ Playback
                ↑                    ↑
          language detection    Kokoro-82M model
          (langdetect)          (local, 82M params)
```

---

## Privacy

- **Kokoro** and **System TTS** run 100% locally. Nothing leaves your machine.
- **OpenAI TTS** sends text to OpenAI's servers (requires API key, data subject to OpenAI's policy).
- All settings are stored locally via `electron-store`.

---

## Future Plans

- **Streaming playback** — start hearing audio while generation is still in progress
- **MP3 export** — concatenate and compress all audio chunks
- **More local models** — Piper, XTTS, Bark
- **Chapter markers** — for long audiobooks
- **EPUB support** — natively read ebook formats

---

## License

MIT
