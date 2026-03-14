# How to Reload the Chrome Extension Properly

## The Problem
When you rebuild the extension, Chrome doesn't automatically pick up the changes. The context menus (right-click options) are only created when the extension is **first installed**, not when you reload it.

## Solution: Force Chrome to Re-install the Extension

### Step 1: Open Chrome Extensions Page
Go to: `chrome://extensions/`

### Step 2: Remove the Old Extension
1. Find "Easy TTS Reader"
2. Click **"Remove"** button
3. Confirm removal

### Step 3: Load the New Extension
1. Make sure **"Developer mode"** is ON (toggle in top-right)
2. Click **"Load unpacked"**
3. Navigate to and select:
   ```
   /Users/echolian/Documents/GitHub/Easy-TTS-Reader/dist/chrome-extension
   ```
4. Click "Select"

### Step 4: Verify the Extension Loaded
You should see:
- Extension name: "Easy TTS Reader"
- Version: 1.0.0
- Status: No errors

### Step 5: Test the Context Menus
1. Go to any webpage (e.g., google.com)
2. Select some text
3. Right-click on the selected text
4. You should see these options:
   - ✅ "Read selected text with TTS"
   - ✅ "Read with natural AI voice" ← AI feature
   - ✅ "Read entire page"
   - ✅ "Summarize and speak" ← AI feature

## If You Still Don't See the New Options

### Check the Extension Console for Errors
1. Go to `chrome://extensions/`
2. Find "Easy TTS Reader"
3. Click **"service worker"** link (under "Inspect views")
4. Look for any errors in red

### Verify the Server is Running
Open a new terminal and run:
```bash
curl http://localhost:3000/health
```

You should see:
```json
{"status":"ok","ollamaAvailable":true,...}
```

If not, start the server:
```bash
npm run start:server
```

## Common Issues

### "Port already in use" when starting server
The server is already running! Check with:
```bash
lsof -i :3000
```

If you see a process, the server is running. You're good to go!

### Context menus still showing old options
1. Completely restart Chrome (quit and reopen)
2. Remove and re-add the extension (follow steps above)
3. Try on a fresh webpage (open a new tab)

### Extension shows errors
Check that all these files exist in `dist/chrome-extension/`:
- manifest.json
- background.js
- content.js
- popup.html, popup.js, popup.css
- shared/ollama-client.js
- shared/tts-service.js
- shared/storage-adapter.js

If any are missing, rebuild:
```bash
npm run build:chrome
```
