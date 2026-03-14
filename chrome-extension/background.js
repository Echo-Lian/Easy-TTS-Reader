// Background service worker for Chrome extension

console.log('🚀 Easy TTS Reader - Background script loaded');

// Create context menu on installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('📦 Extension installed/updated:', details.reason);

  // Remove all existing context menus first
  chrome.contextMenus.removeAll(() => {
    console.log('🗑️ Removed old context menus');

    // Create new context menus
    chrome.contextMenus.create({
      id: 'readSelectedText',
      title: 'Read selected text with TTS',
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating readSelectedText menu:', chrome.runtime.lastError);
      } else {
        console.log('✅ Created: Read selected text with TTS');
      }
    });

    chrome.contextMenus.create({
      id: 'readPageText',
      title: 'Read entire page',
      contexts: ['page']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating readPageText menu:', chrome.runtime.lastError);
      } else {
        console.log('✅ Created: Read entire page');
      }
    });

    chrome.contextMenus.create({
      id: 'enhanceAndSpeak',
      title: 'Read with natural AI voice',
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating enhanceAndSpeak menu:', chrome.runtime.lastError);
      } else {
        console.log('✅ Created: Read with natural AI voice');
      }
    });

    chrome.contextMenus.create({
      id: 'summarizeAndSpeak',
      title: 'Summarize and speak',
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating summarizeAndSpeak menu:', chrome.runtime.lastError);
      } else {
        console.log('✅ Created: Summarize and speak');
      }
    });

    console.log('✨ Context menus setup complete');
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('🖱️ Context menu clicked:', info.menuItemId);

  if (info.menuItemId === 'readSelectedText') {
    const selectedText = info.selectionText;
    if (selectedText) {
      console.log('📖 Reading selected text:', selectedText.substring(0, 50) + '...');
      chrome.tabs.sendMessage(tab.id, {
        action: 'speakText',
        text: selectedText
      });
    }
  } else if (info.menuItemId === 'readPageText') {
    console.log('📄 Reading entire page');
    chrome.tabs.sendMessage(tab.id, {
      action: 'speakPageText'
    });
  } else if (info.menuItemId === 'enhanceAndSpeak') {
    console.log('🤖 Enhancing with AI and speaking');
    chrome.tabs.sendMessage(tab.id, {
      action: 'enhanceAndSpeak'
    });
  } else if (info.menuItemId === 'summarizeAndSpeak') {
    console.log('📝 Summarizing and speaking');
    chrome.tabs.sendMessage(tab.id, {
      action: 'summarizeAndSpeak'
    });
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('💬 Message received:', request.action);

  if (request.action === 'openPopup') {
    chrome.action.openPopup();
    sendResponse({ success: true });
  }

  if (request.action === 'getStoredPreferences') {
    chrome.storage.local.get('tts_preferences', (result) => {
      sendResponse(result.tts_preferences || null);
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'savePreferences') {
    chrome.storage.local.set({ tts_preferences: request.preferences }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Listen for keyboard shortcuts (optional)
chrome.commands.onCommand.addListener((command) => {
  console.log('⌨️ Keyboard command:', command);
  if (command === 'read-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'speakSelection'
      });
    });
  }
});

// Keep service worker alive by responding to startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Extension startup');
});

// Log when service worker becomes active
console.log('✅ Background service worker is now active');
