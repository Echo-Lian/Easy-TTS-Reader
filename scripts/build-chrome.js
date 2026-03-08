/**
 * Build script for Chrome Extension
 */

const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, '../chrome-extension');
const sharedDir = path.join(__dirname, '../shared');
const outputDir = path.join(__dirname, '../dist/chrome-extension');

async function build() {
  try {
    console.log('Building Chrome Extension...');

    // Clean output directory
    await fs.remove(outputDir);
    await fs.ensureDir(outputDir);

    // Copy extension files
    await fs.copy(sourceDir, outputDir);

    // Copy shared files
    const sharedOutputDir = path.join(outputDir, 'shared');
    await fs.ensureDir(sharedOutputDir);
    await fs.copy(sharedDir, sharedOutputDir);

    // Create placeholder icons
    const iconsDir = path.join(outputDir, 'icons');
    await fs.ensureDir(iconsDir);
    console.log('Note: Add icon files to chrome-extension/icons/');

    console.log('Chrome Extension built successfully!');
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
