import { DraftedPlayer, PositionFilter, RosterConfig, TeamRoster } from '../types/vbd';
import { DEFAULT_CONFIG } from './vbdEngine';

const STORAGE_KEYS = {
  CONFIG: 'vbd_config',
  DRAFTED: 'vbd_drafted_players',
  TEAM: 'vbd_my_team',
  FILTER: 'vbd_position_filter',
};

const DEFAULT_FILTER: PositionFilter = {
  qb: true,
  rb: true,
  wr: true,
  te: true,
  dst: true,
  k: true,
};

const DEFAULT_TEAM: TeamRoster = {
  qb: [],
  rb: [],
  wr: [],
  te: [],
  dst: [],
  k: [],
};

export function loadStoredConfig(): RosterConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const item = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!item) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(item) };
  } catch (e) {
    console.error('Failed to load config from localStorage', e);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: RosterConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config to localStorage', e);
  }
}

export function loadStoredDraftedPlayers(): DraftedPlayer[] {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem(STORAGE_KEYS.DRAFTED);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    console.error('Failed to load drafted players from localStorage', e);
    return [];
  }
}

export function saveDraftedPlayers(drafted: DraftedPlayer[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFTED, JSON.stringify(drafted));
  } catch (e) {
    console.error('Failed to save drafted players to localStorage', e);
  }
}

export function loadStoredTeam(): TeamRoster {
  if (typeof window === 'undefined') return DEFAULT_TEAM;
  try {
    const item = localStorage.getItem(STORAGE_KEYS.TEAM);
    if (!item) return DEFAULT_TEAM;
    return { ...DEFAULT_TEAM, ...JSON.parse(item) };
  } catch (e) {
    console.error('Failed to load team from localStorage', e);
    return DEFAULT_TEAM;
  }
}

export function saveTeam(team: TeamRoster) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(team));
  } catch (e) {
    console.error('Failed to save team to localStorage', e);
  }
}

export function loadStoredFilter(): PositionFilter {
  if (typeof window === 'undefined') return DEFAULT_FILTER;
  try {
    const item = localStorage.getItem(STORAGE_KEYS.FILTER);
    return item ? JSON.parse(item) : DEFAULT_FILTER;
  } catch (e) {
    console.error('Failed to load filter from localStorage', e);
    return DEFAULT_FILTER;
  }
}

export function saveFilter(filter: PositionFilter) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.FILTER, JSON.stringify(filter));
  } catch (e) {
    console.error('Failed to save filter to localStorage', e);
  }
}

export function clearDraftStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.DRAFTED);
  localStorage.removeItem(STORAGE_KEYS.TEAM);
}

export function clearConfigStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
}
