const axios = require('axios');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class TtsService {
  constructor(store) {
    this.store = store;
    this.abortController = null;
    this.activeSayProcess = null;
    this.activeKokoroProcess = null;
  }

  // ── Provider metadata ─────────────────────────────────────────────────

  getProviders() {
    return {
      kokoro: {
        name: 'Kokoro-82M (Local) — auto-detects PDF language',
        voices: [
          // American English
          'af_bella',  'af_heart',   'af_alloy',  'af_aoede',
          'af_jessica','af_kore',    'af_nicole',  'af_nova',
          'af_river',  'af_sarah',   'af_sky',
          'am_adam',   'am_echo',    'am_eric',    'am_fenrir',
          'am_liam',   'am_michael', 'am_onyx',    'am_puck',  'am_santa',
          // British English
          'bf_alice',  'bf_emma',    'bf_isabella','bf_lily',
          'bm_daniel', 'bm_fable',  'bm_george',  'bm_lewis',
          // Japanese
          'jf_alpha',  'jf_gongitsune','jf_nezumi','jf_tebukuro',
          'jm_kumo',
          // Spanish
          'ef_dora',   'em_alex',    'em_santa',
          // French
          'ff_siwis',
          // Hindi
          'hf_alpha',  'hf_beta',    'hm_omega',   'hm_psi',
          // Italian
          'if_sara',   'im_nicola',
          // Brazilian Portuguese
          'pf_dora',   'pm_alex',    'pm_santa',
          // Chinese (Mandarin)
          'zf_xiaobei','zf_xiaoni',  'zf_xiaoxiao','zf_xiaoyi',
          'zm_yunjian','zm_yunxi',   'zm_yunxia',  'zm_yunyang'
        ],
        models: ['v1.0'],
        defaultModel: 'v1.0',
        defaultVoice: 'af_bella',
        needsKey: false,
        pricing: 'Free (local, open-weight)'
      },
      openai: {
        name: 'OpenAI TTS',
        voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        models: ['tts-1', 'tts-1-hd'],
        defaultModel: 'tts-1',
        defaultVoice: 'alloy',
        needsKey: true,
        pricing: '$15 per million characters'
      },
      system: {
        name: 'System TTS (macOS)',
        voices: [],
        models: ['default'],
        defaultModel: 'default',
        defaultVoice: 'default',
        needsKey: false,
        pricing: 'Free (offline, lower quality)'
      }
    };
  }

  // ── OpenAI (keep as fallback) ─────────────────────────────────────────

  async synthesizeOpenAI(text, options = {}) {
    const apiKey = options.apiKey || this.store.get('openai-api-key');
    if (!apiKey) throw new Error('OpenAI API key not configured');
    const model = options.model || 'tts-1';
    const voice = options.voice || 'alloy';
    this.abortController = new AbortController();
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      { model, input: text, voice, response_format: 'mp3', speed: options.speed || 1.0 },
      {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        signal: this.abortController.signal,
        timeout: 60000
      }
    );
    return response.data;
  }

  async generateOpenAIAudio(text, options = {}) {
    const PdfService = require('./pdf-service');
    const pdfService = new PdfService();
    const chunks = text.length > 3000 ? pdfService.chunkText(text, 2800) : [text];
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      if (this.abortController?.signal.aborted) break;
      const mp3Buffer = await this.synthesizeOpenAI(chunks[i], options);
      const base64 = Buffer.from(mp3Buffer).toString('base64');
      results.push({
        index: i, total: chunks.length,
        data: `data:audio/mpeg;base64,${base64}`,
        mimeType: 'audio/mpeg', chunkText: chunks[i]
      });
    }
    return results;
  }

  // ── Kokoro-82M (local) ────────────────────────────────────────────────

  /**
   * Generate audio via Kokoro-82M by spawning the Python wrapper.
   * Yields audio chunks as they're generated (streaming-style).
   *
   * @param {string} text
   * @param {object} options
   * @returns {AsyncGenerator<{index:number, total:number, data:string}>}
   */
  async *generateKokoro(text, options = {}) {
    const voice = options.voice || this.store.get('tts-voice') || 'af_bella';
    const speed = options.speed || this.store.get('tts-speed') || 1.0;

    // Locate the Python venv
    const projectRoot = path.resolve(__dirname, '..', '..');
    const pythonBin = path.join(projectRoot, '.kokoro-venv', 'bin', 'python3');
    const scriptPath = path.join(projectRoot, 'desktop', 'services', 'kokoro_tts.py');

    // Build JSON input
    const input = JSON.stringify({ text, voice, speed });

    // Suppress Python stderr (torch warnings) — pipe to /dev/null
    const child = spawn(pythonBin, ['-u', '-W', 'ignore', scriptPath], {
      stdio: ['pipe', 'pipe', 'ignore'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTORCH_ENABLE_MPS_FALLBACK: '1'  // Enable Apple Silicon GPU (MPS)
      }
    });
    this.activeKokoroProcess = child;

    // ── Send JSON input via stdin ────────────────────────────────────────
    child.stdin.write(input);
    child.stdin.end();

    // ── Parse output lines ──────────────────────────────────────────────
    const lineReader = (async function* () {
      let buffer = '';
      for await (const chunk of child.stdout) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) yield line;
        }
      }
      if (buffer.trim()) yield buffer;
    })();

    try {
      for await (const line of lineReader) {
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }

        if (msg.type === 'done') {
          // Read the single concatenated WAV file
          const wavBuffer = await fs.readFile(msg.path);
          await fs.unlink(msg.path).catch(() => {});
          const base64 = Buffer.from(wavBuffer).toString('base64');
          yield {
            index: 1,
            total: 1,
            data: `data:audio/wav;base64,${base64}`,
            mimeType: 'audio/wav',
            totalPyChunks: msg.chunks || 1,
            detectedLanguage: msg.detectedLanguage || 'American English',
            detectedIso: msg.detectedIso || 'en',
            kokoroLang: msg.kokoroLang || 'a'
          };
          break;

        } else if (msg.type === 'error') {
          throw new Error(msg.message);
        }
      }
    } finally {
      this.activeKokoroProcess = null;
    }
  }

  /**
   * Generate all Kokoro audio at once (returns array for IPC)
   */
  async generateKokoroAudio(text, options = {}) {
    const results = [];
    for await (const chunk of this.generateKokoro(text, options)) {
      results.push(chunk);
    }
    return results;
  }

  // ── System TTS (macOS say) ────────────────────────────────────────────

  playDirectSystem(text, options = {}) {
    const args = [];
    const openAiVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const requestedVoice = options.voice || 'default';
    if (requestedVoice !== 'default' && !openAiVoices.includes(requestedVoice)) {
      args.push('-v', requestedVoice);
    }
    if (options.speed && options.speed !== 1.0) {
      args.push('-r', String(Math.round(175 * options.speed)));
    }

    const child = spawn('say', args, { stdio: ['pipe', 'inherit', 'pipe'] });
    child.stdin.write(text);
    child.stdin.end();
    this.activeSayProcess = child;

    return new Promise((resolve, reject) => {
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (err) => { this.activeSayProcess = null; reject(err); });
      child.on('close', (code) => {
        this.activeSayProcess = null;
        if (code !== 0 && code !== null) {
          return reject(new Error(`System TTS failed (${code}): ${stderr.trim()}`));
        }
        resolve({ success: true });
      });
    });
  }

  // ── Stop ──────────────────────────────────────────────────────────────

  stop() {
    if (this.abortController) { this.abortController.abort(); this.abortController = null; }
    if (this.activeSayProcess) { this.activeSayProcess.kill('SIGTERM'); this.activeSayProcess = null; }
    if (this.activeKokoroProcess) { this.activeKokoroProcess.kill('SIGTERM'); this.activeKokoroProcess = null; }
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  listSystemVoices() {
    return new Promise((resolve, reject) => {
      execFile('say', ['-v', '?'], (error, stdout) => {
        if (error) return reject(error);
        const voices = stdout.split('\n')
          .filter(line => line.trim())
          .map(line => { const m = line.match(/^(\S+)\s+/); return m ? m[1] : line.trim(); });
        resolve(voices);
      });
    });
  }
}

module.exports = TtsService;
