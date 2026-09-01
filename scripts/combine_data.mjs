/**
 * combine_data.mjs
 *
 * Merges data/projections.json, data/ranks.json, and data/adp.json into
 * site/public/players.json.
 * Run from the repo root after every scrape:
 *   node scripts/combine_data.mjs
 *
 * Join logic:
 *   - Primary key: name (lowercased + trimmed)
 *   - Source of truth for roster: ranks.json (iterate ranks, look up each in projections)
 *   - ADP: populated from adp.json (Sleeper column). Falls back to 0 if missing.
 *   - Dropped silently: players in projections with no matching rank entry
 *   - Logged to stdout: players in ranks with no matching projection entry
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- Read source files ---
const projectionsPath = resolve(ROOT, 'data', 'projections.json');
const ranksPath = resolve(ROOT, 'data', 'ranks.json');
const adpPath = resolve(ROOT, 'data', 'adp.json');
const outputPath = resolve(ROOT, 'site', 'public', 'players.json');

let projections;
let ranks;
let adpData = [];

try {
  projections = JSON.parse(readFileSync(projectionsPath, 'utf-8'));
} catch (err) {
  console.error(`ERROR: Could not read ${projectionsPath}`, err.message);
  process.exit(1);
}

try {
  ranks = JSON.parse(readFileSync(ranksPath, 'utf-8'));
} catch (err) {
  console.error(`ERROR: Could not read ${ranksPath}`, err.message);
  process.exit(1);
}

try {
  adpData = JSON.parse(readFileSync(adpPath, 'utf-8'));
} catch (err) {
  console.warn(`WARN: Could not read ${adpPath} — ADP will default to 0. Run a fresh scrape to generate it.`);
}

// --- Name normalization helpers ---
/** @param {string} name */
const normalise = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[\,\'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b$/gi, '')
    .trim();
};

/** Known name conversions between FantasyPros and Sleeper */
const NAME_STANDARDIZATIONS = {
  'james cook iii': 'James Cook',
  'kenneth walker iii': 'Kenneth Walker',
};

const standardizeName = (name) => {
  if (!name) return '';
  const key = name.toLowerCase().trim();
  return NAME_STANDARDIZATIONS[key] || name;
};

// --- Build projection lookup: normalised name -> projection entry ---
/** @type {Map<string, object>} */
const projectionMap = new Map();
for (const proj of projections) {
  projectionMap.set(normalise(proj.name), proj);
}

// --- Build ADP (Sleeper) lookup: normalised name -> sleeper_adp ---
/** @type {Map<string, number>} */
const adpMap = new Map();
for (const entry of adpData) {
  if (entry.name) {
    adpMap.set(normalise(entry.name), parseFloat(entry.sleeper_adp) || 0);
  }
}

// --- Iterate ranks as primary list ---
/** @type {Array<object>} */
const combined = [];
let matchedCount = 0;
let missedCount = 0;

const OVERALL_RANK_LIMIT = 250;

for (const rankEntry of ranks) {
  const pos = (rankEntry.pos || '').toLowerCase();
  const overallRank = parseInt(rankEntry.overall_rank, 10) || 999;
  const posRank = parseInt(rankEntry.rank, 10) || 999;

  // Filter: keep only players within the overall rank limit and known positions
  const knownPositions = ['qb', 'rb', 'wr', 'te', 'dst', 'k'];
  if (!knownPositions.includes(pos) || overallRank > OVERALL_RANK_LIMIT) {
    continue;
  }

  const key = normalise(rankEntry.name);
  const proj = projectionMap.get(key);

  if (!proj) {
    console.warn(`[NO PROJECTION] ${rankEntry.name} (${rankEntry.pos} rank ${rankEntry.rank})`);
    missedCount++;
    continue;
  }

  const points = parseFloat(proj.points) || 0;
  const ppg = parseFloat((points / 17).toFixed(1));

  // Prefer Sleeper ADP from adp.json; fall back to rank entry's adp (usually 0)
  const sleeperAdp = adpMap.get(key);
  const adp = sleeperAdp !== undefined ? sleeperAdp : (parseFloat(rankEntry.adp) || 0);

  combined.push({
    name: standardizeName(rankEntry.name),
    position: (proj.position || rankEntry.pos).toLowerCase(),
    points: points,
    ppg: ppg,
    rank: posRank,
    overall_rank: overallRank,
    tier: rankEntry.tier || 0,
    adp,
  });

  matchedCount++;
}

// --- Ensure output directories exist ---
const outputDir = dirname(outputPath);
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// --- Write output ---
const jsonString = JSON.stringify(combined, null, 2);
writeFileSync(outputPath, jsonString, 'utf-8');

console.log(`\nDone.`);
console.log(`  Matched:  ${matchedCount} players written to ${outputPath}`);
console.log(`  Unmatched (ranked but no projection): ${missedCount}`);

