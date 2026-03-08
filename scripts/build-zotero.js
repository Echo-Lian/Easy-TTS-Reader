/**
 * Build script for Zotero Plugin
 */

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const sourceDir = path.join(__dirname, '../zotero-plugin');
const sharedDir = path.join(__dirname, '../shared');
const outputDir = path.join(__dirname, '../dist/zotero-plugin');
const xpiPath = path.join(outputDir, 'easytts-zotero.xpi');

async function build() {
  try {
    console.log('Building Zotero Plugin...');

    // Clean output directory
    await fs.remove(outputDir);
    await fs.ensureDir(outputDir);

    // Create temp build directory
    const tempDir = path.join(outputDir, 'temp');
    await fs.ensureDir(tempDir);

    // Copy plugin files
    await fs.copy(sourceDir, tempDir);

    // Copy shared files
    const sharedOutputDir = path.join(tempDir, 'shared');
    await fs.ensureDir(sharedOutputDir);
    await fs.copy(sharedDir, sharedOutputDir);

    // Create placeholder icons
    const iconsDir = path.join(tempDir, 'icons');
    await fs.ensureDir(iconsDir);

    // Create XPI (ZIP) file
    await createXPI(tempDir, xpiPath);

    // Clean up temp directory
    await fs.remove(tempDir);

    console.log('Zotero Plugin built successfully!');
    console.log(`Output: ${xpiPath}`);
    console.log('\nTo install in Zotero:');
    console.log('1. Open Zotero');
    console.log('2. Go to Tools → Add-ons');
    console.log('3. Click the gear icon → Install Add-on From File');
    console.log(`4. Select: ${xpiPath}`);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

function createXPI(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`XPI created: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Check if archiver is installed
try {
  require.resolve('archiver');
  build();
} catch (e) {
  console.error('Error: archiver package is required');
  console.log('Please run: npm install archiver --save-dev');
  process.exit(1);
}
