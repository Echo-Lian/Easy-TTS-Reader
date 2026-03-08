// Background service worker for Chrome extension

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'readSelectedText',
    title: 'Read selected text with TTS',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'readPageText',
    title: 'Read entire page',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'readSelectedText') {
    const selectedText = info.selectionText;
    if (selectedText) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'speakText',
        text: selectedText
      });
    }
  } else if (info.menuItemId === 'readPageText') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'speakPageText'
    });
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
  if (command === 'read-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'speakSelection'
      });
    });
  }
});
