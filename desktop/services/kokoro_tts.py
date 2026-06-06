#!/usr/bin/env python3
"""
Kokoro-82M TTS wrapper — forked as a subprocess by the Electron main process.

Features:
  - Language auto-detection from text (langdetect)
  - Automatic voice selection per language
  - User-requested voice is respected when explicitly chosen
  - Falls back to English if language module isn't installed

Protocol (stdin/stdout):
  Input:  JSON → {"text": "...", "voice": "af_bella", "speed": 1.0}
  Output: JSON → {"type": "done", "path": "/tmp/xxx.wav", "detectedLanguage": "..."}
"""

import json
import sys
import os
import tempfile
import traceback


# ═════════════════════════════════════════════════════════════════════════════
# Language & Voice Configuration
# ═════════════════════════════════════════════════════════════════════════════

# ISO 639-1 → (kokoro_code, default_voice, display_name)
LANGUAGE_MAP = {
    'en':    ('a', 'af_bella',       'American English'),
    'ja':    ('j', 'jf_alpha',       'Japanese'),
    'es':    ('e', 'ef_dora',        'Spanish'),
    'fr':    ('f', 'ff_siwis',       'French'),
    'hi':    ('h', 'hf_alpha',       'Hindi'),
    'it':    ('i', 'im_nicola',      'Italian'),
    'pt':    ('p', 'pf_dora',        'Brazilian Portuguese'),
    'zh-cn': ('z', 'zf_xiaobei',     'Chinese (Mandarin)'),
    'zh':    ('z', 'zf_xiaobei',     'Chinese (Mandarin)'),
}

# Voice prefix → kokoro language code
VOICE_PREFIX_TO_LANG = {}
for code, prefixes in {
    'a': ('af_', 'am_'),
    'b': ('bf_', 'bm_'),
    'j': ('jf_', 'jm_'),
    'e': ('ef_', 'em_'),
    'f': ('ff_', 'fm_'),
    'h': ('hf_', 'hm_'),
    'i': ('if_', 'im_'),
    'p': ('pf_', 'pm_'),
    'z': ('zf_', 'zm_'),
}.items():
    for p in prefixes:
        VOICE_PREFIX_TO_LANG[p] = code


def detect_language(text: str) -> str:
    """Detect ISO 639-1 language code from text sample (first 2000 chars)."""
    sample = text.strip()[:2000]
    if not sample:
        return 'en'
    try:
        from langdetect import detect
        return detect(sample)
    except Exception:
        return 'en'


def resolve_language(iso_code: str, requested_voice: str):
    """
    Determine language code and voice to use.

    - If user explicitly picked a non-default voice, respect it and use its lang.
    - Otherwise, auto-detect from text.
    """
    # User explicitly chose a voice → use its language
    if requested_voice and requested_voice not in ('', 'af_bella'):
        prefix = requested_voice[:3]
        if prefix in VOICE_PREFIX_TO_LANG:
            code = VOICE_PREFIX_TO_LANG[prefix]
            return code, requested_voice

    # Auto-detect
    for iso_key, (code, voice, _) in LANGUAGE_MAP.items():
        if iso_code.startswith(iso_key) or iso_key.startswith(iso_code):
            return code, voice

    # Ultimate fallback
    return 'a', 'af_bella'


def check_lang_support(lang_code: str) -> bool:
    """Test if the Kokoro language G2P module can be loaded (cached)."""
    if not hasattr(check_lang_support, 'cache'):
        check_lang_support.cache = {}
    if lang_code in check_lang_support.cache:
        return check_lang_support.cache[lang_code]

    try:
        from kokoro import KPipeline
        _ = KPipeline(lang_code=lang_code, repo_id='hexgrad/Kokoro-82M')
        check_lang_support.cache[lang_code] = True
        return True
    except ImportError:
        check_lang_support.cache[lang_code] = False
        return False
    except Exception:
        check_lang_support.cache[lang_code] = True
        return True


# ═════════════════════════════════════════════════════════════════════════════

def main():
    # ── Read input ──────────────────────────────────────────────────────
    raw = sys.stdin.read()
    try:
        opts = json.loads(raw)
    except json.JSONDecodeError as e:
        emit_error(f"Invalid JSON input: {e}")
        sys.exit(1)

    text = opts.get("text", "")
    requested_voice = opts.get("voice", "") or ""
    speed = float(opts.get("speed", 1.0))

    if not text.strip():
        emit_error("No text provided")
        sys.exit(1)

    # ── Language detection ──────────────────────────────────────────────
    detected_iso = detect_language(text)
    lang_code, voice = resolve_language(detected_iso, requested_voice)

    # ── Check support, fallback to English if missing ───────────────────
    fallback_note = ''
    if not check_lang_support(lang_code):
        lang_code, voice = 'a', 'af_bella'
        fallback_note = f' (unsupported, fell back to English)'

    # ── Look up display name ────────────────────────────────────────────
    lang_name = 'Unknown'
    for _iso, (_code, _voice, name) in LANGUAGE_MAP.items():
        if _code == lang_code:
            lang_name = name
            break

    # ── Import kokoro ───────────────────────────────────────────────────
    try:
        from kokoro import KPipeline
        import soundfile as sf
        import numpy as np
    except ImportError as e:
        emit_error(f"Kokoro not installed: {e}")
        sys.exit(1)

    try:
        pipeline = KPipeline(lang_code=lang_code, repo_id='hexgrad/Kokoro-82M')

        # ── Generate audio and concatenate ─────────────────────────────
        all_audio = []
        generator = pipeline(text, voice=voice)

        for graphemes, phonemes, audio in generator:
            if audio is not None and len(audio) > 0:
                if hasattr(audio, 'numpy'):
                    all_audio.append(audio.numpy())
                else:
                    all_audio.append(audio)

        if not all_audio:
            emit_error("No audio generated")
            sys.exit(1)

        combined = np.concatenate(all_audio)

        fd, tmp_path = tempfile.mkstemp(suffix='.wav', prefix='kokoro_')
        os.close(fd)
        sf.write(tmp_path, combined, 24000)

        payload = json.dumps({
            "type": "done",
            "path": tmp_path,
            "sampleRate": 24000,
            "chunks": len(all_audio),
            "detectedLanguage": lang_name + fallback_note,
            "detectedIso": detected_iso,
            "kokoroLang": lang_code,
            "voice": voice
        })
        sys.stdout.write(payload + "\n")
        sys.stdout.flush()

    except Exception as e:
        emit_error(f"Kokoro failed: {e}\n{traceback.format_exc()}")
        sys.exit(1)


def emit_error(msg: str):
    err = json.dumps({"type": "error", "message": msg})
    sys.stdout.write(err + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
