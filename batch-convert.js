/**
 * Batch PDF-to-Audio converter using Kokoro-82M
 *
 * Reads PDF files, extracts text, generates speech via Kokoro,
 * saves WAV files to output directory.
 */

const path = require('path');
const fs = require('fs').promises;
const PdfService = require('./desktop/services/pdf-service');
const TtsService = require('./desktop/services/tts-service');
const Store = require('electron-store');

const pdfService = new PdfService();
const ttsService = new TtsService(new Store({ defaults: {} }));

const VOICE = 'af_nova';
const INPUT_DIR = '/Users/echolian/Downloads/Empire of AI dreams and nightmares in Sam Altman\'s OpenAI audio book/Audio_pdf';
const OUTPUT_DIR = '/Users/echolian/Downloads/Empire of AI dreams and nightmares in Sam Altman\'s OpenAI audio book/Audio';

async function convertPdf(fileName) {
  const inputPath = path.join(INPUT_DIR, fileName);
  const outputName = fileName.replace(/\.pdf$/i, '.wav');
  const outputPath = path.join(OUTPUT_DIR, outputName);

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
    return;
  }

  // 2. Generate audio
  console.log(`   Generating audio with Kokoro (voice: ${VOICE})...`);
  const genStart = Date.now();
  const chunks = await ttsService.generateKokoroAudio(text, { voice: VOICE });

  if (chunks.length === 0) {
    console.log(`   ❌ No audio generated`);
    return;
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
}

async function main() {
  console.log(`🎧  Easy TTS Reader — Batch Converter`);
  console.log(`   Voice: ${VOICE}`);
  console.log(`   Input:  ${INPUT_DIR}`);
  console.log(`   Output: ${OUTPUT_DIR}`);

  const files = [
    'Author\'s note and Prologue.pdf',
    'Chapter 1.pdf'
  ];

  // Verify input files exist
  for (const f of files) {
    try {
      await fs.access(path.join(INPUT_DIR, f));
    } catch {
      console.error(`❌ File not found: ${f}`);
      process.exit(1);
    }
  }

  for (const f of files) {
    try {
      await convertPdf(f);
    } catch (err) {
      console.error(`\n❌ Failed on ${f}: ${err.message}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅  Done! Files saved to:`);
  console.log(`   ${OUTPUT_DIR}/`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
