/**
 * nameMatcher.js
 * Robust name normalization and fuzzy matching between Sleeper API data,
 * Sleeper DOM elements, and VBD player projections.
 */

// Common known aliases in NFL fantasy drafting
const NAME_ALIASES = {
  'marquise brown': 'hollywood brown',
  'hollywood brown': 'marquise brown',
  'gabriel davis': 'gabe davis',
  'gabe davis': 'gabriel davis',
  'chigoziem okonkwo': 'chig okonkwo',
  'chig okonkwo': 'chigoziem okonkwo',
  'mitchell trubisky': 'mitch trubisky',
  'mitch trubisky': 'mitchell trubisky',
  'cameron ward': 'cam ward',
  'cam ward': 'cameron ward',
  'kenneth walker': 'kenneth walker iii',
  'ken walker': 'kenneth walker iii',
  'joshua palmer': 'josh palmer',
  'josh palmer': 'joshua palmer',
  'nathaniel dell': 'tank dell',
  'tank dell': 'nathaniel dell',
};

// Map team city/names to canonical DST names
const DST_TEAMS = {
  'arizona': 'arizona cardinals',
  'cardinals': 'arizona cardinals',
  'ari': 'arizona cardinals',
  'atlanta': 'atlanta falcons',
  'falcons': 'atlanta falcons',
  'atl': 'atlanta falcons',
  'baltimore': 'baltimore ravens',
  'ravens': 'baltimore ravens',
  'bal': 'baltimore ravens',
  'buffalo': 'buffalo bills',
  'bills': 'buffalo bills',
  'buf': 'buffalo bills',
  'carolina': 'carolina panthers',
  'panthers': 'carolina panthers',
  'car': 'carolina panthers',
  'chicago': 'chicago bears',
  'bears': 'chicago bears',
  'chi': 'chicago bears',
  'cincinnati': 'cincinnati bengals',
  'bengals': 'cincinnati bengals',
  'cin': 'cincinnati bengals',
  'cleveland': 'cleveland browns',
  'browns': 'cleveland browns',
  'cle': 'cleveland browns',
  'dallas': 'dallas cowboys',
  'cowboys': 'dallas cowboys',
  'dal': 'dallas cowboys',
  'denver': 'denver broncos',
  'broncos': 'denver broncos',
  'den': 'denver broncos',
  'detroit': 'detroit lions',
  'lions': 'detroit lions',
  'det': 'detroit lions',
  'green bay': 'green bay packers',
  'packers': 'green bay packers',
  'gb': 'green bay packers',
  'houston': 'houston texans',
  'texans': 'houston texans',
  'hou': 'houston texans',
  'indianapolis': 'indianapolis colts',
  'colts': 'indianapolis colts',
  'ind': 'indianapolis colts',
  'jacksonville': 'jacksonville jaguars',
  'jaguars': 'jacksonville jaguars',
  'jax': 'jacksonville jaguars',
  'kansas city': 'kansas city chiefs',
  'chiefs': 'kansas city chiefs',
  'kc': 'kansas city chiefs',
  'las vegas': 'las vegas raiders',
  'raiders': 'las vegas raiders',
  'lv': 'las vegas raiders',
  'los angeles chargers': 'los angeles chargers',
  'chargers': 'los angeles chargers',
  'lac': 'los angeles chargers',
  'los angeles rams': 'los angeles rams',
  'rams': 'los angeles rams',
  'lar': 'los angeles rams',
  'miami': 'miami dolphins',
  'dolphins': 'miami dolphins',
  'mia': 'miami dolphins',
  'minnesota': 'minnesota vikings',
  'vikings': 'minnesota vikings',
  'min': 'minnesota vikings',
  'new england': 'new england patriots',
  'patriots': 'new england patriots',
  'ne': 'new england patriots',
  'new orleans': 'new orleans saints',
  'saints': 'new orleans saints',
  'no': 'new orleans saints',
  'new york giants': 'new york giants',
  'giants': 'new york giants',
  'nyg': 'new york giants',
  'new york jets': 'new york jets',
  'jets': 'new york jets',
  'nyj': 'new york jets',
  'philadelphia': 'philadelphia eagles',
  'eagles': 'philadelphia eagles',
  'phi': 'philadelphia eagles',
  'pittsburgh': 'pittsburgh steelers',
  'steelers': 'pittsburgh steelers',
  'pit': 'pittsburgh steelers',
  'san francisco': 'san francisco 49ers',
  '49ers': 'san francisco 49ers',
  'sf': 'san francisco 49ers',
  'seattle': 'seattle seahawks',
  'seahawks': 'seattle seahawks',
  'sea': 'seattle seahawks',
  'tampa bay': 'tampa bay buccaneers',
  'buccaneers': 'tampa bay buccaneers',
  'tb': 'tampa bay buccaneers',
  'tennessee': 'tennessee titans',
  'titans': 'tennessee titans',
  'ten': 'tennessee titans',
  'washington': 'washington commanders',
  'commanders': 'washington commanders',
  'was': 'washington commanders',
};

/**
 * Normalizes player name for matching:
 * - Lowecase & trim
 * - Removes periods, apostrophes, commas, hyphens
 * - Removes generational suffixes (jr, sr, ii, iii, iv, v)
 */
export function normalizePlayerName(name) {
  if (!name || typeof name !== 'string') return '';

  let clean = name.toLowerCase().trim();

  // Normalize DST suffixes / terms
  clean = clean.replace(/\b(d\/st|dst|defense)\b/g, '').trim();

  // Remove periods (e.g. A.J. -> AJ, D.J. -> DJ)
  clean = clean.replace(/\./g, '');

  // Replace hyphens, commas, apostrophes with space or empty
  clean = clean.replace(/[\,\'\-]/g, ' ');

  // Remove multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  // Remove suffixes
  clean = clean.replace(/\b(jr|sr|ii|iii|iv|v)\b$/gi, '').trim();

  return clean;
}

/**
 * Normalizes position strings (e.g. DEF -> dst, PK/K -> k)
 */
export function normalizePosition(pos) {
  if (!pos || typeof pos !== 'string') return '';
  const p = pos.toLowerCase().trim();
  if (p === 'def' || p === 'dst' || p === 'defense') return 'dst';
  if (p === 'k' || p === 'pk' || p === 'kicker') return 'k';
  return p;
}

/**
 * Matches a Sleeper player object or name against a VBD player list.
 *
 * @param {Object|string} sleeperPlayer - Sleeper pick or raw name string
 * @param {Array} vbdPlayers - Array of VBD Player objects
 * @returns {Object|null} Matching VBD Player or null
 */
export function matchPlayer(sleeperPlayer, vbdPlayers) {
  if (!sleeperPlayer || !vbdPlayers || vbdPlayers.length === 0) return null;

  let rawName = '';
  let pos = '';

  if (typeof sleeperPlayer === 'string') {
    rawName = sleeperPlayer;
  } else if (sleeperPlayer.metadata) {
    const meta = sleeperPlayer.metadata;
    rawName =
      meta.player_name ||
      (meta.first_name && meta.last_name ? `${meta.first_name} ${meta.last_name}` : '') ||
      meta.name ||
      '';
    pos = normalizePosition(meta.position || sleeperPlayer.pos);
  } else {
    rawName = sleeperPlayer.name || '';
    pos = normalizePosition(sleeperPlayer.position || sleeperPlayer.pos);
  }

  const normTarget = normalizePlayerName(rawName);
  if (!normTarget) return null;

  // Handle DST matching
  if (pos === 'dst' || normTarget.includes('49ers') || normTarget.includes('defense')) {
    const canonicalDst = DST_TEAMS[normTarget] || normTarget;
    const dstMatch = vbdPlayers.find((p) => {
      if (p.pos !== 'dst') return false;
      const pNorm = normalizePlayerName(p.name);
      const pCanon = DST_TEAMS[pNorm] || pNorm;
      return (
        pNorm === normTarget ||
        pCanon === canonicalDst ||
        pNorm.substring(0, 6) === normTarget.substring(0, 6)
      );
    });
    if (dstMatch) return dstMatch;
  }

  // 1. Exact normalized name (+ pos if provided)
  let match = vbdPlayers.find((p) => {
    if (pos && p.pos !== pos) return false;
    return normalizePlayerName(p.name) === normTarget;
  });
  if (match) return match;

  // 2. Exact normalized name without pos check
  match = vbdPlayers.find((p) => normalizePlayerName(p.name) === normTarget);
  if (match) return match;

  // 3. Alias check
  const alias = NAME_ALIASES[normTarget];
  if (alias) {
    match = vbdPlayers.find((p) => {
      if (pos && p.pos !== pos) return false;
      return normalizePlayerName(p.name) === alias;
    });
    if (match) return match;
  }

  // 4. Substring / StartsWith match for minor suffix variations
  match = vbdPlayers.find((p) => {
    if (pos && p.pos !== pos) return false;
    const pNorm = normalizePlayerName(p.name);
    return pNorm.startsWith(normTarget) || normTarget.startsWith(pNorm);
  });
  if (match) return match;

  return null;
}
