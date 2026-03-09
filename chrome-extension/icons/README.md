# Chrome Extension Icons

Icons for the Easy TTS Reader extension are automatically generated during the build process.

## Icon Sizes

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Automatic Generation

When you run `npm run build:chrome`, the build script automatically generates all three icon sizes with the Easy TTS Reader gradient style (purple gradient with white "T" and sound wave indicators).

The icons are created using the `canvas` package and saved directly to `dist/chrome-extension/icons/`.

## Manual Generation

If you need to generate icons manually or customize them:

1. Open `generate-icons.html` in a browser
2. Click individual download buttons or use "Download All Icons"
3. The icons will feature the official TTS Reader gradient style

## Design

The icons feature:
- Linear gradient background (#667eea to #764ba2)
- Bold white "T" letter in the center
- Subtle sound wave indicators in the top-right corner
- Clean, modern design matching the extension UI
