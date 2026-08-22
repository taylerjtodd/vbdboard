/**
 * sleeperApi.js
 * Client for Sleeper's public unauthenticated REST APIs.
 */

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';

/**
 * Extracts draft_id from a Sleeper URL
 * e.g., https://sleeper.com/draft/nfl/123456789012345678 -> 123456789012345678
 */
export function extractDraftId(url) {
  if (!url) return null;
  const match = url.match(/\/draft\/(?:nfl\/)?([0-9a-zA-Z_-]+)/i);
  return match ? match[1] : null;
}

/**
 * Fetches general draft metadata, settings, and team slots
 */
export async function fetchDraft(draftId) {
  if (!draftId) throw new Error('Missing draftId');
  const res = await fetch(`${SLEEPER_BASE_URL}/draft/${draftId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch draft ${draftId}: HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetches all completed picks for a draft in chronological order
 */
export async function fetchDraftPicks(draftId) {
  if (!draftId) throw new Error('Missing draftId');
  const res = await fetch(`${SLEEPER_BASE_URL}/draft/${draftId}/picks`);
  if (!res.ok) {
    throw new Error(`Failed to fetch picks for draft ${draftId}: HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetches users participating in the draft
 */
export async function fetchDraftUsers(draftId) {
  if (!draftId) throw new Error('Missing draftId');
  const res = await fetch(`${SLEEPER_BASE_URL}/draft/${draftId}/users`);
  if (!res.ok) {
    throw new Error(`Failed to fetch users for draft ${draftId}: HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Converts Sleeper draft settings into VBD RosterConfig
 */
export function mapSleeperSettingsToConfig(draftData, fallbackConfig) {
  if (!draftData || !draftData.settings) return fallbackConfig;

  const settings = draftData.settings;
  const slots = settings.slots || draftData.slots || {};

  const numTeams = Number(settings.teams || draftData.teams || fallbackConfig.numTeams || 10);
  const starters = {
    qb: Number(slots.qb !== undefined ? slots.qb : fallbackConfig.starters.qb),
    rb: Number(slots.rb !== undefined ? slots.rb : fallbackConfig.starters.rb),
    wr: Number(slots.wr !== undefined ? slots.wr : fallbackConfig.starters.wr),
    te: Number(slots.te !== undefined ? slots.te : fallbackConfig.starters.te),
    flex: Number(slots.flex !== undefined ? slots.flex : fallbackConfig.starters.flex),
    dst: Number(slots.def !== undefined ? slots.def : (slots.dst !== undefined ? slots.dst : fallbackConfig.starters.dst)),
    k: Number(slots.k !== undefined ? slots.k : fallbackConfig.starters.k),
  };

  const benchSize = Number(slots.bn !== undefined ? slots.bn : fallbackConfig.benchSize);
  const numStarters = starters.qb + starters.rb + starters.wr + starters.te + starters.flex + starters.dst + starters.k;
  const rosterSize = numStarters + benchSize;
  const baselineRangeStart = numStarters * numTeams;
  const baselineRangeEnd = numTeams * (rosterSize + 1);

  return {
    ...fallbackConfig,
    numTeams,
    starters,
    benchSize,
    numStarters,
    rosterSize,
    baselineRangeStart,
    baselineRangeEnd,
  };
}
