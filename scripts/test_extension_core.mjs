/**
 * test_extension_core.mjs
 * Verification test suite for Chrome Extension core libraries:
 * - vbdCore.js (VBD calculations, baselines, point differences, value sorting)
 * - nameMatcher.js (name normalization, alias matching, DST matching)
 * - sleeperApi.js (draft ID extraction, config mapper)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

import {
  calculateVbd,
  parseCombinedPlayers,
  DEFAULT_CONFIG,
  recalculateConfigBounds,
} from '../extension/lib/vbdCore.js';
import {
  normalizePlayerName,
  normalizePosition,
  matchPlayer,
} from '../extension/lib/nameMatcher.js';
import {
  extractDraftId,
  mapSleeperSettingsToConfig,
} from '../extension/lib/sleeperApi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const playersPath = resolve(__dirname, '..', 'extension', 'data', 'players.json');
const playersData = JSON.parse(readFileSync(playersPath, 'utf-8'));

console.log('=== RUNNING CHROME EXTENSION TEST SUITE ===\n');

// --- Test 1: nameMatcher ---
console.log('Test 1: Testing nameMatcher normalization & aliases...');
assert.strictEqual(normalizePlayerName('Patrick Mahomes II'), 'patrick mahomes');
assert.strictEqual(normalizePlayerName('Kenneth Walker III'), 'kenneth walker');
assert.strictEqual(normalizePlayerName('Marvin Harrison Jr.'), 'marvin harrison');
assert.strictEqual(normalizePlayerName('A.J. Brown'), 'aj brown');
assert.strictEqual(normalizePlayerName('San Francisco 49ers D/ST'), 'san francisco 49ers');
assert.strictEqual(normalizePosition('DEF'), 'dst');
assert.strictEqual(normalizePosition('PK'), 'k');

const { projections, ranks } = parseCombinedPlayers(playersData);
const { players } = calculateVbd(
  DEFAULT_CONFIG,
  [],
  { qb: [], rb: [], wr: [], te: [], dst: [], k: [] },
  projections,
  ranks
);

// Match tests
const sleeperPick1 = {
  metadata: { first_name: 'Patrick', last_name: 'Mahomes', position: 'QB' },
};
const matched1 = matchPlayer(sleeperPick1, players);
assert(matched1 !== null, 'Should match Patrick Mahomes');
assert.strictEqual(matched1.pos, 'qb');

const sleeperPick2 = {
  metadata: { player_name: 'Denver Broncos', position: 'DEF' },
};
const matched2 = matchPlayer(sleeperPick2, players);
assert(matched2 !== null, 'Should match Broncos DST');
assert.strictEqual(matched2.pos, 'dst');

const sleeperPick3 = {
  metadata: { first_name: 'A.J.', last_name: 'Brown', position: 'WR' },
};
const matched3 = matchPlayer(sleeperPick3, players);
assert(matched3 !== null, 'Should match A.J. Brown');
assert.strictEqual(matched3.pos, 'wr');

const sleeperPick4 = {
  metadata: { first_name: 'James', last_name: 'Cook', position: 'RB' },
};
const matched4 = matchPlayer(sleeperPick4, players);
assert(matched4 !== null, 'Should match James Cook');
assert.strictEqual(matched4.pos, 'rb');

// Matching with III suffix
const matched5 = matchPlayer('James Cook III', players);
assert(matched5 !== null, 'Should match James Cook III against James Cook');
assert.strictEqual(matched5.pos, 'rb');

console.log('✓ nameMatcher tests passed!\n');

// --- Test 2: sleeperApi ---
console.log('Test 2: Testing sleeperApi URL parser & config mapping...');
assert.strictEqual(
  extractDraftId('https://sleeper.com/draft/nfl/112233445566'),
  '112233445566'
);
assert.strictEqual(
  extractDraftId('https://sleeper.app/draft/nfl/998877665544'),
  '998877665544'
);
assert.strictEqual(extractDraftId('https://sleeper.com/leagues/123'), null);

const mockDraft = {
  settings: {
    teams: 12,
    slots: {
      qb: 1,
      rb: 2,
      wr: 3,
      te: 1,
      flex: 2,
      def: 1,
      k: 1,
      bn: 6,
    },
  },
};
const mappedConfig = mapSleeperSettingsToConfig(mockDraft, DEFAULT_CONFIG);
assert.strictEqual(mappedConfig.numTeams, 12);
assert.strictEqual(mappedConfig.starters.wr, 3);
assert.strictEqual(mappedConfig.starters.flex, 2);
assert.strictEqual(mappedConfig.benchSize, 6);
assert.strictEqual(mappedConfig.rosterSize, 17); // 11 starters + 6 bench

console.log('✓ sleeperApi tests passed!\n');

// --- Test 3: vbdCore ---
console.log('Test 3: Testing vbdCore calculations...');
assert(players.length > 0, 'Players should be populated');

// Top player should have a positive VBD value and vrank #1
const topPlayer = players[0];
console.log(`Top VBD Ranked Player: ${topPlayer.name} (${topPlayer.pos}) - V-Rank: #${topPlayer.vrank}, PointDif: ${topPlayer.pointDif}`);
assert(topPlayer.vrank === 1, 'Top player should have vrank 1');
assert(topPlayer.pointDif > 0, 'Top player should have positive point differential');

// Simulate 5 drafted players
const draftedSim = [
  { name: players[0].name, pos: players[0].pos },
  { name: players[1].name, pos: players[1].pos },
];
const simResult = calculateVbd(
  DEFAULT_CONFIG,
  draftedSim,
  { qb: [], rb: [], wr: [], te: [], dst: [], k: [] },
  projections,
  ranks
);

const draftedPlayer1 = simResult.players.find((p) => p.name === draftedSim[0].name);
assert(draftedPlayer1 && draftedPlayer1.drafted === 1, 'Player 1 should be marked drafted as pick 1');

console.log('✓ vbdCore tests passed!\n');

// --- Test 4: Third Round Reversal (3RR) Logic ---
console.log('Test 4: Testing Third Round Reversal (3RR) calculations...');
import('../extension/lib/vbdCore.js').then(({ isRoundReversed }) => {
  // Standard Snake:
  // Round 1 (0): Normal (false)
  // Round 2 (1): Reversed (true)
  // Round 3 (2): Normal (false)
  // Round 4 (3): Reversed (true)
  // Round 5 (4): Normal (false)
  // Round 6 (5): Reversed (true)
  assert.strictEqual(isRoundReversed(0, false), false, 'Standard R1 should be normal');
  assert.strictEqual(isRoundReversed(1, false), true, 'Standard R2 should be reversed');
  assert.strictEqual(isRoundReversed(2, false), false, 'Standard R3 should be normal');
  assert.strictEqual(isRoundReversed(3, false), true, 'Standard R4 should be reversed');
  assert.strictEqual(isRoundReversed(4, false), false, 'Standard R5 should be normal');
  assert.strictEqual(isRoundReversed(5, false), true, 'Standard R6 should be reversed');

  // Third Round Reversal (3RR):
  // Round 1 (0): Normal (false)
  // Round 2 (1): Reversed (true)
  // Round 3 (2): Reversed (true)
  // Round 4 (3): Normal (false)
  // Round 5 (4): Reversed (true)
  // Round 6 (5): Normal (false)
  // Round 7 (6): Reversed (true)
  assert.strictEqual(isRoundReversed(0, true), false, '3RR R1 should be normal');
  assert.strictEqual(isRoundReversed(1, true), true, '3RR R2 should be reversed');
  assert.strictEqual(isRoundReversed(2, true), true, '3RR R3 should be reversed');
  assert.strictEqual(isRoundReversed(3, true), false, '3RR R4 should be normal');
  assert.strictEqual(isRoundReversed(4, true), true, '3RR R5 should be reversed');
  assert.strictEqual(isRoundReversed(5, true), false, '3RR R6 should be normal');
  assert.strictEqual(isRoundReversed(6, true), true, '3RR R7 should be reversed');

  // Test Sleeper 3RR config mapping
  const sleeper3RRDraft = {
    settings: {
      teams: 12,
      reversal_round: 3,
      slots: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, def: 1, k: 1, bn: 6 },
    },
  };
  const config3RR = mapSleeperSettingsToConfig(sleeper3RRDraft, DEFAULT_CONFIG);
  assert.strictEqual(config3RR.thirdRoundReversal, true, 'Should detect 3RR from Sleeper reversal_round');

  console.log('✓ Third Round Reversal tests passed!\n');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
});
