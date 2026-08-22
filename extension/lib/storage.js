/**
 * storage.js
 * Unified storage wrapper for Chrome Extension using chrome.storage.local
 * with fallback to localStorage.
 */

import { DEFAULT_CONFIG } from './vbdCore.js';

export const STORAGE_KEYS = {
  CONFIG: 'vbd_config',
  DRAFTED: 'vbd_drafted_players',
  MY_SLOT: 'vbd_my_slot',
  MY_USER_ID: 'vbd_my_user_id',
  FILTER: 'vbd_position_filter',
  OVERLAY_POSITION: 'vbd_overlay_position',
  OVERLAY_COLLAPSED: 'vbd_overlay_collapsed',
  AUTO_DETECT_CONFIG: 'vbd_auto_detect_config',
  DATASET_OVERRIDE: 'vbd_dataset_override',
};

export async function getStorageItem(key, defaultValue = null) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime?.lastError) {
          console.warn('Storage read error:', chrome.runtime.lastError);
          resolve(defaultValue);
        } else {
          resolve(result[key] !== undefined ? result[key] : defaultValue);
        }
      });
    });
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    return defaultValue;
  }
}

export async function setStorageItem(key, value) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime?.lastError) {
          console.warn('Storage write error:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage write failed', err);
  }
}

export async function loadConfig() {
  const saved = await getStorageItem(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG, ...saved };
}

export async function saveConfig(config) {
  await setStorageItem(STORAGE_KEYS.CONFIG, config);
}
