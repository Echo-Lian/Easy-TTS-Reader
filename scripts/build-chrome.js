/**
 * Build script for Chrome Extension
 */

const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, '../chrome-extension');
const sharedDir = path.join(__dirname, '../shared');
const outputDir = path.join(__dirname, '../dist/chrome-extension');

/**
 * Generate icon using canvas - matches the logic from generate-icons.html
 */
function generateIcon(size) {
  // Try to use canvas package if available, otherwise fall back to placeholder
  try {
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Create gradient background matching TTS Reader style
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Draw speaker icon
    ctx.fillStyle = 'white';

    // Calculate scaling
    const centerX = size / 2;
    const centerY = size / 2;
    const scale = size / 100;

    // Draw speaker body (trapezoid/cone)
    ctx.beginPath();
    ctx.moveTo(centerX - 20 * scale, centerY - 15 * scale);
    ctx.lineTo(centerX - 20 * scale, centerY + 15 * scale);
    ctx.lineTo(centerX - 5 * scale, centerY + 10 * scale);
    ctx.lineTo(centerX - 5 * scale, centerY - 10 * scale);
    ctx.closePath();
    ctx.fill();

    // Draw speaker box
    ctx.fillRect(centerX - 30 * scale, centerY - 10 * scale, 10 * scale, 20 * scale);

    // Draw sound waves
    ctx.strokeStyle = 'white';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, size / 32);

    // Small wave
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15 * scale, -Math.PI / 4, Math.PI / 4, false);
    ctx.stroke();

    // Medium wave
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25 * scale, -Math.PI / 4, Math.PI / 4, false);
    ctx.stroke();

    // Large wave
    ctx.beginPath();
    ctx.arc(centerX, centerY, 35 * scale, -Math.PI / 4, Math.PI / 4, false);
    ctx.stroke();

    return canvas.toBuffer('image/png');
  } catch (error) {
    console.log(`  Canvas package not available, skipping automatic icon generation`);
    console.log(`  Please open chrome-extension/generate-icons.html in a browser to generate icons`);
    return null;
  }
}

async function generateIcons() {
  const iconsDir = path.join(outputDir, 'icons');
  await fs.ensureDir(iconsDir);

  console.log('Generating icons...');

  const sizes = [16, 48, 128];
  let allGenerated = true;

  for (const size of sizes) {
    const iconBuffer = generateIcon(size);
    if (iconBuffer) {
      const iconPath = path.join(iconsDir, `icon${size}.png`);
      await fs.writeFile(iconPath, iconBuffer);
      console.log(`  ✓ Generated icon${size}.png`);
    } else {
      allGenerated = false;
      break;
    }
  }

  if (!allGenerated) {
    console.log('\nAlternative: Open the following file in your browser to manually generate icons:');
    console.log(`  file://${path.join(sourceDir, 'generate-icons.html')}`);
    console.log('  Then download and place them in: dist/chrome-extension/icons/\n');
  }
}

async function build() {
  try {
    console.log('========================================');
    console.log('Building Chrome Extension...');
    console.log('========================================\n');

    // Clean output directory
    console.log('Step 1: Cleaning output directory...');
    await fs.remove(outputDir);
    await fs.ensureDir(outputDir);
    console.log('  ✓ Output directory cleaned\n');

    // Copy extension files
    console.log('Step 2: Copying extension files...');
    await fs.copy(sourceDir, outputDir, {
      filter: (src) => {
        // Exclude generate-icons.html from the build output
        return !src.endsWith('generate-icons.html');
      }
    });
    console.log('  ✓ manifest.json');
    console.log('  ✓ background.js');
    console.log('  ✓ content.js');
    console.log('  ✓ content.css');
    console.log('  ✓ popup.html');
    console.log('  ✓ popup.js');
    console.log('  ✓ popup.css\n');

    // Copy shared files
    console.log('Step 3: Copying shared files...');
    const sharedOutputDir = path.join(outputDir, 'shared');
    await fs.ensureDir(sharedOutputDir);
    await fs.copy(sharedDir, sharedOutputDir);
    console.log('  ✓ shared/ollama-client.js');
    console.log('  ✓ shared/tts-service.js');
    console.log('  ✓ shared/storage-adapter.js\n');

    // Generate icons
    console.log('Step 4: Generating icons...');
    await generateIcons();
    console.log('');

    // Verify build
    console.log('Step 5: Verifying build...');
    const requiredFiles = [
      'manifest.json',
      'background.js',
      'content.js',
      'popup.html',
      'popup.js',
      'shared/ollama-client.js',
      'shared/tts-service.js',
      'shared/storage-adapter.js'
    ];

    let allFilesPresent = true;
    for (const file of requiredFiles) {
      const filePath = path.join(outputDir, file);
      if (await fs.pathExists(filePath)) {
        console.log(`  ✓ ${file}`);
      } else {
        console.log(`  ✗ ${file} - MISSING!`);
        allFilesPresent = false;
      }
    }

    if (!allFilesPresent) {
      throw new Error('Some required files are missing from the build!');
    }

    console.log('\n========================================');
    console.log('✓ Chrome Extension built successfully!');
    console.log('========================================\n');
    console.log(`Build output: ${outputDir}\n`);
    console.log('Next steps:');
    console.log('1. Start the local server:');
    console.log('   npm run start:server');
    console.log('');
    console.log('2. Load extension in Chrome:');
    console.log('   a. Open chrome://extensions/');
    console.log('   b. Enable "Developer mode" (top right)');
    console.log('   c. Click "Load unpacked"');
    console.log(`   d. Select: ${outputDir}`);
    console.log('');
    console.log('3. If updating existing extension:');
    console.log('   a. Go to chrome://extensions/');
    console.log('   b. Find "Easy TTS Reader"');
    console.log('   c. Click the reload icon (🔄)');
    console.log('');
    console.log('4. Test the AI features:');
    console.log('   - Select text on any webpage');
    console.log('   - Right-click → "Read with natural AI voice"');
    console.log('   - Or use the popup and check "Enhance with AI (Ollama)"');
    console.log('');
    console.log('Make sure Ollama is running with qwen2:7b model:');
    console.log('   ollama pull qwen2:7b');
    console.log('   ollama serve');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

build();
