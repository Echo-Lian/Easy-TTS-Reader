#!/usr/bin/env node
/**
 * Batch PDF-to-Audio converter using Kokoro-82M
 *
 * Usage:
 *   node batch-convert.js <input-dir> <output-dir> [options]
 *
 * Options:
 *   --voice <name>     Kokoro voice name (default: af_nova)
 *   --file <pattern>   Convert matching files only (default: *.pdf)
 *   --list             List matching files without converting
 *   --help             Show this help
 *
 * Examples:
 *   # Convert all PDFs in a folder
 *   node batch-convert.js ./pdfs ./audio
 *
 *   # Convert specific PDFs with a British voice
 *   node batch-convert.js ./pdfs ./audio --voice bm_daniel --file "chapter*.pdf"
 *
 *   # Preview which files will be converted
 *   node batch-convert.js ./pdfs ./audio --list
 */

const path = require('path');
const fs = require('fs').promises;
const PdfService = require('./desktop/services/pdf-service');
const TtsService = require('./desktop/services/tts-service');
const Store = require('electron-store');

const pdfService = new PdfService();
const ttsService = new TtsService(new Store({ defaults: {} }));

// ─── Parse CLI arguments ──────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const inputDir = args[0];
  const outputDir = args[1];
  if (!inputDir || !outputDir) {
    console.error('❌ Usage: node batch-convert.js <input-dir> <output-dir> [options]');
    process.exit(1);
  }

  const voice = extractFlag(args, '--voice') || 'af_nova';
  const filePattern = extractFlag(args, '--file') || '*.pdf';
  const listOnly = args.includes('--list');

  return { inputDir, outputDir, voice, filePattern, listOnly };
}

function extractFlag(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return null;
}

function printHelp() {
  console.log(`
🎧  Easy TTS Reader — Batch CLI Converter

USAGE:
  node batch-convert.js <input-dir> <output-dir> [options]

ARGUMENTS:
  input-dir     Directory containing PDF files
  output-dir    Directory to save WAV audio files

OPTIONS:
  --voice <name>    Kokoro voice name (default: af_nova)
  --file <pattern>  Convert only files matching this glob (default: *.pdf)
  --list            List matching files without converting
  --help            Show this help

EXAMPLES:
  # Convert all PDFs in a folder
  node batch-convert.js ./pdfs ./audio

  # Use a different voice
  node batch-convert.js ./pdfs ./audio --voice bm_daniel

  # Convert specific files
  node batch-convert.js ./pdfs ./audio --file "chapter*.pdf"

  # Preview without converting
  node batch-convert.js ./pdfs ./audio --list

VOICES:
  See the README for available Kokoro voices (af_bella, bm_daniel, etc.).
`);
}

// ─── File matching ─────────────────────────────────────────────────────────────

async function findPdfFiles(dir, pattern) {
  try {
    const entries = await fs.readdir(dir);
    // Convert simple glob (*.pdf) to regex
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      'i'
    );
    return entries
      .filter(f => regex.test(f))
      .sort();
  } catch {
    console.error(`❌ Cannot read input directory: ${dir}`);
    process.exit(1);
  }
}

// ─── Conversion ────────────────────────────────────────────────────────────────

async function convertPdf(fileName, inputDir, outputDir, voice) {
  const inputPath = path.join(inputDir, fileName);
  const outputName = fileName.replace(/\.pdf$/i, '.wav');
  const outputPath = path.join(outputDir, outputName);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📄  ${fileName}`);
  console.log(`${'═'.repeat(60)}`);

  // 1. Extract text
  console.log(`   Extracting text...`);
  const start = Date.now();
  const { text, pages } = await pdfService.extract(inputPath);
  console.log(`   ✅ ${pages} pages, ${text.length.toLocaleString()} chars (${((Date.now()-start)/1000).toFixed(1)}s)`);

  if (!text || !text.trim()) {
    console.log(`   ⚠️  No text found, skipping`);
    return null;
  }

  // 2. Generate audio
  console.log(`   Generating audio with Kokoro (voice: ${voice})...`);
  const genStart = Date.now();
  const chunks = await ttsService.generateKokoroAudio(text, { voice });

  if (chunks.length === 0) {
    console.log(`   ❌ No audio generated`);
    return null;
  }

  // 3. Save WAV file
  const base64Data = chunks[0].data.replace(/^data:audio\/wav;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  await fs.writeFile(outputPath, buffer);

  const totalTime = ((Date.now() - start) / 1000).toFixed(1);
  const genTime = ((Date.now() - genStart) / 1000).toFixed(1);
  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);

  const detectedLang = chunks[0].detectedLanguage || 'detected';
  console.log(`   ✅ Saved: ${outputName}`);
  console.log(`   📊  ${sizeMB}MB  |  Language: ${detectedLang}  |  Generate: ${genTime}s  |  Total: ${totalTime}s`);

  return { outputName, sizeMB, totalTime, detectedLang };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { inputDir, outputDir, voice, filePattern, listOnly } = parseArgs();

  console.log(`🎧  Easy TTS Reader — Batch Converter`);
  console.log(`   Voice: ${voice}`);
  console.log(`   Input:  ${path.resolve(inputDir)}`);
  console.log(`   Output: ${path.resolve(outputDir)}`);

  // Find matching files
  const files = await findPdfFiles(inputDir, filePattern);

  if (files.length === 0) {
    console.log(`\n⚠️  No files matching "${filePattern}" found in input directory.`);
    process.exit(0);
  }

  console.log(`   Found: ${files.length} file${files.length > 1 ? 's' : ''}\n`);

  if (listOnly) {
    for (const f of files) {
      console.log(`   📄 ${f}`);
    }
    console.log();
    process.exit(0);
  }

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true }).catch(() => {});

  // Convert each file
  const results = [];
  for (const f of files) {
    try {
      const r = await convertPdf(f, inputDir, outputDir, voice);
      if (r) results.push(r);
    } catch (err) {
      console.error(`\n❌ Failed on ${f}: ${err.message}`);
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅  Done! ${results.length}/${files.length} files converted.`);
  if (results.length > 0) {
    console.log(`   Saved to: ${path.resolve(outputDir)}/`);
    const totalMB = results.reduce((s, r) => s + parseFloat(r.sizeMB), 0);
    console.log(`   Total size: ${totalMB.toFixed(1)}MB`);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
