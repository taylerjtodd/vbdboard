/**
 * domObserver.js
 * Injects VBD badges onto Sleeper DOM player rows/cards with batched requestAnimationFrame updates.
 */

import { matchPlayer } from '../lib/nameMatcher.js';

let observer = null;
let isUpdating = false;

/**
 * Searches the DOM for candidate player name elements on Sleeper
 */
function findPlayerElements() {
  // Common Sleeper DOM selectors for player rows/cards/lists
  const selectors = [
    '.player-row',
    '.player-card',
    '.draft-player-col',
    '.cell-player',
    '.player-name',
    '[class*="player-name"]',
    '[class*="playerName"]',
    '.item-player',
    '.pick-cell',
    '.player-tile',
  ];

  const elements = [];
  const found = document.querySelectorAll(selectors.join(', '));
  found.forEach((el) => {
    // Look for text container
    if (el.textContent && el.textContent.trim().length > 2) {
      elements.push(el);
    }
  });

  return elements;
}

/**
 * Batched update of inline badges across all visible player elements
 */
export async function updateDomBadges(vbdPlayers) {
  if (isUpdating || !vbdPlayers || vbdPlayers.length === 0) return;
  isUpdating = true;

  try {
    const playerElements = findPlayerElements();
    const BATCH_SIZE = 25;

    for (let i = 0; i < playerElements.length; i += BATCH_SIZE) {
      const batch = playerElements.slice(i, i + BATCH_SIZE);

      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          batch.forEach((el) => {
            // Check if element has already been processed with latest state
            const rawText = el.textContent || '';
            const player = matchPlayer(rawText, vbdPlayers);

            if (player) {
              let badge = el.querySelector('.vbd-inline-badge');
              const badgeText = `VBD ${player.pointDif > 0 ? '+' : ''}${player.pointDif}`;

              if (!badge) {
                badge = document.createElement('span');
                badge.className = 'vbd-inline-badge';
                el.appendChild(badge);
              }

              if (badge.dataset.vbdId !== player.name || badge.textContent !== badgeText) {
                badge.dataset.vbdId = player.name;
                badge.textContent = badgeText;
                badge.title = `V-Rank #${player.vrank} | Pos ${player.displayPosition || player.pos} | Tier ${player.tier} | ADP ${player.adp}`;

                badge.className = 'vbd-inline-badge';
                if (player.pointDif >= 20) {
                  badge.classList.add('vbd-val-high');
                } else if (player.pointDif >= 0) {
                  badge.classList.add('vbd-val-mid');
                } else {
                  badge.classList.add('vbd-val-low');
                }
              }
            }
          });
          resolve();
        });
      });

      if (globalThis.scheduler?.yield) {
        await scheduler.yield();
      }
    }
  } catch (err) {
    console.debug('[Sleeper VBD] DOM badge update skipped:', err);
  } finally {
    isUpdating = false;
  }
}

/**
 * Starts observing DOM mutations to catch new player rows as Sleeper scrolls or tabs change
 */
export function startDomObserver(vbdPlayersGetter) {
  if (observer) {
    observer.disconnect();
  }

  let timeout = null;
  observer = new MutationObserver(() => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      const players = vbdPlayersGetter();
      if (players && players.length > 0) {
        updateDomBadges(players);
      }
    }, 400);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export function stopDomObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
