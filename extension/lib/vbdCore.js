/**
 * vbdCore.js
 * Core Value-Based Drafting (VBD) calculation engine for the Chrome Extension.
 * Shared mathematical model matching site/src/lib/vbdEngine.ts.
 */

export const DEFAULT_CONFIG = {
  numTeams: 10,
  starters: {
    qb: 1.0,
    rb: 2.0,
    wr: 2.0,
    te: 1.0,
    flex: 1.0,
    dst: 1.0,
    k: 1.0,
  },
  benchSize: 7,
  numStarters: 9,
  rosterSize: 16,
  baselineRangeStart: 90,
  baselineRangeEnd: 170,
  buffPercentages: {
    qb: 1.0,
    rb: 1.0,
    wr: 1.0,
    te: 1.0,
    dst: 1.0,
    k: 1.0,
  },
};

export function recalculateConfigBounds(config) {
  const numStarters =
    Number(config.starters.qb || 0) +
    Number(config.starters.rb || 0) +
    Number(config.starters.wr || 0) +
    Number(config.starters.te || 0) +
    Number(config.starters.flex || 0) +
    Number(config.starters.dst || 0) +
    Number(config.starters.k || 0);

  const benchSize = Number(config.benchSize || 0);
  const numTeams = Number(config.numTeams || 10);
  const rosterSize = numStarters + benchSize;
  const baselineRangeStart = numStarters * numTeams;
  const baselineRangeEnd = numTeams * (rosterSize + 1);

  return {
    ...config,
    numStarters,
    rosterSize,
    baselineRangeStart,
    baselineRangeEnd,
  };
}

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

export function determineBaseline(pos, players, config, draftedPlayers, projections) {
  const totalNumDrafted = config.numTeams * config.rosterSize;
  const percentageDrafted = totalNumDrafted > 0 ? (draftedPlayers.length / totalNumDrafted) : 0;

  const initialThreshold = config.baselineRangeStart;
  const finalThreshold = config.baselineRangeEnd;
  const replacementThreshold =
    initialThreshold + (finalThreshold - initialThreshold) * percentageDrafted;

  let positionalIndex = -1;
  const draftedAtPosition = draftedPlayers.filter((p) => p.pos === pos).length;

  for (const player of players) {
    if (player.pos === pos) {
      positionalIndex++;
      if (
        player.adp > replacementThreshold &&
        positionalIndex > draftedAtPosition
      ) {
        return player;
      }
    }
  }

  const allByPosition = projections[pos] || [];
  const lastProj = allByPosition[allByPosition.length - 1];

  return {
    name: lastProj?.name || 'Baseline',
    position: pos,
    pos: pos,
    points: Number(lastProj?.points || 0),
    ppg: lastProj?.ppg || 0,
    tier: lastProj?.tier || 0,
    rank: 999,
    adp: 999,
  };
}

function insertPointDif(players, baseline) {
  players.forEach((player) => {
    const diff = 17 * ((player.ppg || 0) - (baseline.ppg || 0));
    player.pointDif = Number(diff.toFixed(1));
  });

  players.sort((a, b) => (b.pointDif || 0) - (a.pointDif || 0));

  players.forEach((player, i) => {
    player.posrank = pad(i + 1, 2);
  });
}

function sortByValue(players, config, team) {
  const needFactor = {};
  const starters = config.starters;

  for (const posKey in starters) {
    if (posKey === 'flex') continue;
    const pos = posKey;
    let startersForPos = Number(starters[pos] || 0);

    if (pos === 'rb' || pos === 'wr') {
      startersForPos += Number(starters.flex || 0) / 2.0;
    }

    const posTeamCount = team && team[pos] ? team[pos].length : 0;
    let surplus = posTeamCount - startersForPos;
    surplus++;

    if (surplus > 0) {
      let expectedBenchRatio = config.numStarters > 0 ? (startersForPos / config.numStarters) : 0;
      if (pos === 'k' || pos === 'dst') {
        expectedBenchRatio = 0;
      }
      const expectedBenchCount = expectedBenchRatio * config.benchSize * 1.75;
      let rawNeed = expectedBenchCount - surplus;
      if (rawNeed < 0) {
        rawNeed = 0;
      }
      needFactor[pos] = expectedBenchCount > 0 ? rawNeed / expectedBenchCount : 0;
    } else {
      needFactor[pos] = 1;
    }
  }

  players.forEach((b) => {
    const posNeed = needFactor[b.pos] !== undefined ? needFactor[b.pos] : 1;
    const posBuff =
      config.buffPercentages && config.buffPercentages[b.pos] !== undefined
        ? config.buffPercentages[b.pos]
        : 1.0;
    b.sortFactor = (b.pointDif || 0) * posNeed * posBuff;
  });

  const numPlayers = players.length;
  players.sort((a, b) => {
    const aDraftPosition = a.drafted ? a.drafted : numPlayers;
    const bDraftPosition = b.drafted ? b.drafted : numPlayers;
    const draftOrderSort = aDraftPosition - bDraftPosition;
    if (draftOrderSort !== 0) {
      return draftOrderSort;
    }
    if (b.sortFactor === a.sortFactor) {
      return (b.pointDif || 0) - (a.pointDif || 0);
    } else {
      return (b.sortFactor || 0) - (a.sortFactor || 0);
    }
  });
}

export function normalizePlayerName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[\,\'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b$/gi, '')
    .trim();
}

export function isPlayerMatch(nameA, nameB, pos) {
  if (pos === 'dst') {
    return normalizePlayerName(nameA).substring(0, 6) === normalizePlayerName(nameB).substring(0, 6);
  }
  const normA = normalizePlayerName(nameA);
  const normB = normalizePlayerName(nameB);
  return normA === normB || normA.startsWith(normB) || normB.startsWith(normA);
}

export function calculateVbd(config, draftedPlayers, myTeam, projections, ranks) {
  const normalizedConfig = recalculateConfigBounds(config);

  const rankList = ranks.map((p) => {
    const pos = p.name === 'Cordarrelle Patterson' ? 'rb' : p.pos;
    return { ...p, pos };
  });

  const projectionsByPos = {
    qb: [],
    rb: [],
    wr: [],
    te: [],
    k: [],
    dst: [],
  };

  const positions = ['qb', 'rb', 'wr', 'te', 'dst', 'k'];

  positions.forEach((pos) => {
    const projList = projections[pos] || [];
    projList.forEach((proj) => {
      const rankItem = rankList.find((r) => r.pos === pos && isPlayerMatch(r.name, proj.name, pos));

      const draftedIdx = draftedPlayers.findIndex((dp) => {
        return dp.pos === pos && isPlayerMatch(dp.name, proj.name, pos);
      });

      const player = {
        name: proj.name,
        position: pos,
        pos: pos,
        points: Number(proj.points || 0),
        ppg: Number(proj.ppg || 0),
        tier: rankItem ? rankItem.tier : proj.tier || 0,
        rank: rankItem ? (typeof rankItem.rank === 'string' ? parseInt(rankItem.rank, 10) : rankItem.rank) : 999,
        adp: rankItem ? Number(rankItem.adp) : 999,
        drafted: draftedIdx !== -1 ? draftedIdx + 1 : undefined,
      };

      projectionsByPos[pos].push(player);
    });
  });

  let allPlayers = [];
  positions.forEach((pos) => {
    allPlayers = allPlayers.concat(projectionsByPos[pos]);
  });

  // ADP reach warnings
  allPlayers.sort((a, b) => a.adp - b.adp);
  let undraftedCount = 0;
  const maxUndraftedToWarn = normalizedConfig.numTeams * 2 + draftedPlayers.length;

  for (let index = 0; index < allPlayers.length; index++) {
    const player = allPlayers[index];
    if (undraftedCount === maxUndraftedToWarn) break;
    if (!player.drafted) {
      player.adpWarning = true;
      undraftedCount++;
    }
  }

  // Baselines & Point Differences
  const baselines = {};
  positions.forEach((pos) => {
    const baseline = determineBaseline(pos, allPlayers, normalizedConfig, draftedPlayers, projections);
    baselines[pos] = baseline;
    insertPointDif(projectionsByPos[pos], baseline);
  });

  // Value sorting
  sortByValue(allPlayers, normalizedConfig, myTeam);

  allPlayers.forEach((player, i) => {
    player.vrank = i + 1;
    player.displayPosition = `${player.position.toUpperCase()}${player.posrank}`;
  });

  return {
    players: allPlayers,
    baselines,
  };
}

/**
 * Transforms combined players.json array into projections & ranks structures
 */
export function parseCombinedPlayers(players) {
  const projections = { qb: [], rb: [], wr: [], te: [], dst: [], k: [] };
  const ranks = [];

  for (const p of players) {
    const pos = (p.position || p.pos || '').toLowerCase();
    if (!projections[pos]) continue;

    projections[pos].push({
      name: p.name,
      position: pos,
      points: p.points,
      ppg: p.ppg !== undefined ? p.ppg : Number(((p.points || 0) / 17).toFixed(1)),
      tier: p.tier || 0,
    });

    ranks.push({
      name: p.name,
      tier: p.tier || 0,
      rank: p.rank || 999,
      adp: p.adp || 999,
      pos,
    });
  }

  return { projections, ranks };
}
