/**
 * popup.js
 * Script for Chrome Extension popup actions and settings management.
 */

import { DEFAULT_CONFIG } from '../lib/vbdCore.js';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../lib/storage.js';
import { extractDraftId } from '../lib/sleeperApi.js';

document.addEventListener('DOMContentLoaded', async () => {
  const versionEl = document.getElementById('app-version');
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('status-text');
  const statusHelp = document.getElementById('status-help');
  const mySlotSelect = document.getElementById('my-slot');
  const numTeamsInput = document.getElementById('num-teams');
  const benchSizeInput = document.getElementById('bench-size');
  const autoDetectCheckbox = document.getElementById('auto-detect');
  const baseStartInput = document.getElementById('base-start');
  const baseEndInput = document.getElementById('base-end');
  const saveBtn = document.getElementById('save-btn');
  const openSiteBtn = document.getElementById('open-site-btn');

  // Display version
  if (versionEl && chrome.runtime?.getManifest) {
    versionEl.textContent = `v${chrome.runtime.getManifest().version}`;
  }

  // Load config & settings
  const config = await getStorageItem(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
  const autoDetect = await getStorageItem(STORAGE_KEYS.AUTO_DETECT_CONFIG, true);
  const savedSlot = await getStorageItem(STORAGE_KEYS.MY_SLOT, 1);

  if (numTeamsInput) numTeamsInput.value = config.numTeams || 10;
  if (benchSizeInput) benchSizeInput.value = config.benchSize || 7;
  if (autoDetectCheckbox) autoDetectCheckbox.checked = Boolean(autoDetect);
  if (baseStartInput) baseStartInput.value = config.baselineRangeStart || 90;
  if (baseEndInput) baseEndInput.value = config.baselineRangeEnd || 170;
  if (mySlotSelect) mySlotSelect.value = String(savedSlot);

  // Check active tab for Sleeper draft
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const draftId = extractDraftId(tab.url);
      if (draftId) {
        statusDot?.classList.add('active');
        if (statusText) statusText.textContent = `Connected to Draft: ${draftId.substring(0, 10)}...`;
        if (statusHelp) statusHelp.textContent = 'Live pick tracking and VBD calculations are active.';
        if (openSiteBtn) openSiteBtn.href = `http://localhost:3000?sleeper_draft_id=${draftId}&my_slot=${savedSlot}`;
      } else {
        if (statusText) statusText.textContent = 'No active Sleeper draft on tab';
        if (statusHelp) statusHelp.textContent = 'Open a Sleeper draft room to activate the live assistant.';
      }
    }
  } catch (err) {
    console.debug('Tab query error:', err);
  }

  // Save Settings
  saveBtn?.addEventListener('click', async () => {
    const updatedConfig = {
      ...config,
      numTeams: parseInt(numTeamsInput.value, 10) || 10,
      benchSize: parseInt(benchSizeInput.value, 10) || 7,
      baselineRangeStart: parseInt(baseStartInput.value, 10) || 90,
      baselineRangeEnd: parseInt(baseEndInput.value, 10) || 170,
    };

    const selectedSlot = parseInt(mySlotSelect.value, 10) || 1;

    await setStorageItem(STORAGE_KEYS.CONFIG, updatedConfig);
    await setStorageItem(STORAGE_KEYS.AUTO_DETECT_CONFIG, autoDetectCheckbox.checked);
    await setStorageItem(STORAGE_KEYS.MY_SLOT, selectedSlot);

    saveBtn.textContent = 'Saved!';
    setTimeout(() => {
      saveBtn.textContent = 'Save Settings';
    }, 1500);
  });
});
