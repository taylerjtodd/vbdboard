/**
 * service-worker.js
 * Background service worker for Sleeper VBD Chrome Extension (Manifest V3).
 */

import { DEFAULT_CONFIG } from '../lib/vbdCore.js';
import { STORAGE_KEYS } from '../lib/storage.js';

// Setup on installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Sleeper VBD] Extension installed / updated:', details.reason);

  const existingConfig = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
  if (!existingConfig || !existingConfig[STORAGE_KEYS.CONFIG]) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.CONFIG]: DEFAULT_CONFIG,
      [STORAGE_KEYS.AUTO_DETECT_CONFIG]: true,
    });
  }
});

// Handle incoming messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DRAFT_STATUS_UPDATE') {
    const { isDraft, draftId, pickCount } = message;
    if (isDraft && sender.tab?.id) {
      chrome.action.setBadgeText({
        tabId: sender.tab.id,
        text: pickCount !== undefined ? String(pickCount) : 'VBD',
      });
      chrome.action.setBadgeBackgroundColor({
        tabId: sender.tab.id,
        color: '#06b6d4', // Cyan
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_EXTENSION_INFO') {
    sendResponse({
      version: chrome.runtime.getManifest().version,
      name: chrome.runtime.getManifest().name,
    });
    return true;
  }
});
