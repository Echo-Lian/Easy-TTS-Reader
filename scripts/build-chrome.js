/**
 * Build script for Chrome Extension
 */

const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, '../chrome-extension');
const sharedDir = path.join(__dirname, '../shared');
const outputDir = path.join(__dirname, '../dist/chrome-extension');

/**
 * Generate icon using canvas
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

    // Draw the 'T' letter
    ctx.fillStyle = 'white';
    const fontSize = Math.floor(size * 0.55);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', size / 2, size / 2);

    // Add a subtle sound wave indicator in the corner
    const cornerSize = size * 0.2;
    const cornerX = size - cornerSize * 1.5;
    const cornerY = cornerSize;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cornerX + i * cornerSize * 0.3, cornerY, cornerSize * 0.15, 0, 2 * Math.PI);
      ctx.fill();
    }

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
    console.log('Building Chrome Extension...');

    // Clean output directory
    await fs.remove(outputDir);
    await fs.ensureDir(outputDir);

    // Copy extension files
    await fs.copy(sourceDir, outputDir, {
      filter: (src) => {
        // Exclude generate-icons.html from the build output
        return !src.endsWith('generate-icons.html');
      }
    });

    // Copy shared files
    const sharedOutputDir = path.join(outputDir, 'shared');
    await fs.ensureDir(sharedOutputDir);
    await fs.copy(sharedDir, sharedOutputDir);

    // Generate icons
    await generateIcons();

    console.log('\nChrome Extension built successfully!');
    console.log(`Output: ${outputDir}`);
    console.log('\nTo load in Chrome:');
    console.log('1. Open chrome://extensions/');
    console.log('2. Enable "Developer mode"');
    console.log('3. Click "Load unpacked"');
    console.log(`4. Select: ${outputDir}`);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
