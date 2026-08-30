import {
  DraftedPlayer,
  Player,
  PlayerProjection,
  PlayerRank,
  Position,
  RosterConfig,
  StartersConfig,
  TeamRoster,
} from '../types/vbd';

export const DEFAULT_CONFIG: RosterConfig = {
  numTeams: 12,
  starters: {
    qb: 1.0,
    rb: 2.0,
    wr: 2.0,
    te: 1.0,
    flex: 2.0,
    dst: 1.0,
    k: 1.0,
  },
  benchSize: 5,
  numStarters: 10,
  rosterSize: 15,
  baselineRangeStart: 120,
  baselineRangeEnd: 180,
  buffPercentages: {
    qb: 1.0,
    rb: 1.0,
    wr: 1.0,
    te: 1.0,
    dst: 1.0,
    k: 1.0,
  },
  thirdRoundReversal: false,
};

/**
 * Determines whether a round is in reversed draft order.
 * - Standard snake: odd 0-based rounds (rounds 2, 4, 6, ...) are reversed.
 * - Third Round Reversal (3RR): round 1 (idx 0) is normal, round 2 (idx 1) is reversed,
 *   round 3 (idx 2) is reversed, and round 4+ alternates (even 0-based rounds reversed, odd normal).
 */
export function isRoundReversed(roundIndex: number, thirdRoundReversal: boolean = false): boolean {
  if (roundIndex === 0) return false;
  if (roundIndex === 1) return true;
  const isOddRound = roundIndex % 2 === 0; // round 3 is odd but indexed as 2

  if (thirdRoundReversal) {
    return isOddRound; 
  } else {
    return !isOddRound;
  }
}

export function recalculateConfigBounds(config: RosterConfig): RosterConfig {
  const numStarters =
    config.starters.qb +
    config.starters.rb +
    config.starters.wr +
    config.starters.te +
    config.starters.flex +
    config.starters.dst +
    config.starters.k;
  const rosterSize = numStarters + config.benchSize;
  const baselineRangeStart = numStarters * config.numTeams;
  const baselineRangeEnd = config.numTeams * (rosterSize + 1);

  return {
    ...config,
    numStarters,
    rosterSize,
    baselineRangeStart,
    baselineRangeEnd,
  };
}

function pad(num: number, size: number): string {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

export function determineBaseline(
  pos: Position,
  players: Player[],
  config: RosterConfig,
  draftedPlayers: DraftedPlayer[],
  projections: Record<Position, PlayerProjection[]>
): Player {
  const totalNumDrafted = config.numTeams * config.rosterSize;
  const percentageDrafted = draftedPlayers.length / totalNumDrafted;

  const initialThreshold = config.baselineRangeStart;
  const finalThreshold = config.baselineRangeEnd;
  const replacementThreshold =
    initialThreshold + (finalThreshold - initialThreshold) * percentageDrafted;

  // Collect all positional players sorted by ADP (players array is already ADP-sorted)
  const posPlayers = players.filter((p) => p.pos === pos);

  // Find the two players whose ADPs bracket the replacement threshold.
  // We work from the replacement threshold outward — one player just below
  // (lower ADP) and one just above (higher ADP) — then interpolate their PPG
  // based on fractional distance so the baseline shifts smoothly every pick
  // instead of snapping when the threshold crosses a player boundary.
  let below: Player | null = null;
  let above: Player | null = null;

  for (const player of posPlayers) {
    if (player.adp <= replacementThreshold) {
      below = player; // keep advancing; last one ≤ threshold wins
    } else if (above === null) {
      above = player; // first one > threshold
      break;
    }
  }

  // If we have both neighbors, interpolate PPG by fractional distance
  if (below !== null && above !== null) {
    const range = above.adp - below.adp;
    // weight toward `above` as threshold approaches it (0 = at below, 1 = at above)
    const t = range > 0 ? (replacementThreshold - below.adp) / range : 0.5;
    const interpolatedPpg = below.ppg * (1 - t) + above.ppg * t;
    const interpolatedPoints = below.points * (1 - t) + above.points * t;

    return {
      name: `${below.name} / ${above.name}`,
      position: pos,
      pos: pos,
      points: Number(interpolatedPoints.toFixed(1)),
      ppg: Number(interpolatedPpg.toFixed(3)),
      tier: above.tier,
      rank: above.rank,
      adp: Number(replacementThreshold.toFixed(1)),
    };
  }

  // Threshold is past all positional players — use the last one
  if (below !== null) {
    return below;
  }

  // Threshold is before all positional players — use the first one
  if (above !== null) {
    return above;
  }

  // Absolute fallback: no positional players found in ranks, use projections tail
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

function insertPointDif(players: Player[], baseline: Player) {
  players.forEach((player) => {
    const diff = 17 * (player.ppg - baseline.ppg);
    player.pointDif = Number(diff.toFixed(1));
  });

  players.sort((a, b) => (b.pointDif || 0) - (a.pointDif || 0));

  players.forEach((player, i) => {
    player.posrank = pad(i + 1, 2);
  });
}

function sortByValue(
  players: Player[],
  config: RosterConfig,
  team: TeamRoster
) {
  const needFactor: Record<string, number> = {};
  const starters = config.starters;

  for (const posKey in starters) {
    if (posKey === 'flex') continue;
    const pos = posKey as Position;
    let startersForPos = starters[pos];

    if (pos === 'rb' || pos === 'wr') {
      startersForPos += starters.flex / 2.0;
    }

    const posTeamCount = team[pos] ? team[pos].length : 0;
    let surplus = posTeamCount - startersForPos;
    surplus++;

    if (surplus > 0) {
      let expectedBenchRatio = startersForPos / config.numStarters;
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
      config.buffPercentages[b.pos] !== undefined
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

export function normalizePlayerName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[\,\'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b$/gi, '')
    .trim();
}

export function isPlayerMatch(nameA: string, nameB: string, pos: Position): boolean {
  if (pos === 'dst') {
    return normalizePlayerName(nameA).substring(0, 6) === normalizePlayerName(nameB).substring(0, 6);
  }
  const normA = normalizePlayerName(nameA);
  const normB = normalizePlayerName(nameB);
  return normA === normB || normA.startsWith(normB) || normB.startsWith(normA);
}

export function calculateVbd(
  config: RosterConfig,
  draftedPlayers: DraftedPlayer[],
  myTeam: TeamRoster,
  projections: Record<Position, PlayerProjection[]>,
  ranks: PlayerRank[]
): { players: Player[]; baselines: Record<Position, Player> } {
  // 1. Clean ranks & build projections mapping
  const rankList = ranks.map((p) => {
    const pos = p.name === 'Cordarrelle Patterson' ? 'rb' : p.pos;
    return {
      ...p,
      pos,
    };
  });

  const projectionsByPos: Record<Position, Player[]> = {
    qb: [],
    rb: [],
    wr: [],
    te: [],
    k: [],
    dst: [],
  };

  const positions: Position[] = ['qb', 'rb', 'wr', 'te', 'dst', 'k'];

  positions.forEach((pos) => {
    const projList = projections[pos] || [];
    projList.forEach((proj) => {
      const rankItem = rankList.find((r) => r.pos === pos && isPlayerMatch(r.name, proj.name, pos));

      const draftedIdx = draftedPlayers.findIndex((dp) => {
        return dp.pos === pos && isPlayerMatch(dp.name, proj.name, pos);
      });

      const player: Player = {
        name: proj.name,
        position: pos,
        pos: pos,
        points: Number(proj.points),
        ppg: proj.ppg,
        tier: rankItem ? rankItem.tier : proj.tier || 0,
        rank: rankItem ? rankItem.rank : 999,
        adp: rankItem ? rankItem.adp : 999,
        drafted: draftedIdx !== -1 ? draftedIdx + 1 : undefined,
      };

      projectionsByPos[pos].push(player);
    });
  });

  let allPlayers: Player[] = [];
  positions.forEach((pos) => {
    allPlayers = allPlayers.concat(projectionsByPos[pos]);
  });

  // 2. Calculate ADP reach warnings
  allPlayers.sort((a, b) => a.adp - b.adp);
  let undraftedCount = 0;
  const maxUndraftedToWarn = config.numTeams * 2 + draftedPlayers.length;

  for (let index = 0; index < allPlayers.length; index++) {
    const player = allPlayers[index];
    if (undraftedCount === maxUndraftedToWarn) {
      break;
    }
    if (!player.drafted) {
      player.adpWarning = true;
      undraftedCount++;
    }
  }

  // 3. Baselines & Point Differences
  const baselines: Partial<Record<Position, Player>> = {};
  const activePositions: Position[] = ['qb', 'rb', 'wr', 'te', 'dst', 'k'];

  activePositions.forEach((pos) => {
    const baseline = determineBaseline(pos, allPlayers, config, draftedPlayers, projections);
    baselines[pos] = baseline;
    insertPointDif(projectionsByPos[pos], baseline);
  });

  // 4. Value sorting & V-Rank assignment
  sortByValue(allPlayers, config, myTeam);

  allPlayers.forEach((player, i) => {
    player.vrank = i + 1;
    player.displayPosition = `${player.position.toUpperCase()}${player.posrank}`;
    player.rank = typeof player.rank === 'string' ? parseInt(player.rank, 10) : player.rank;
  });

  return {
    players: allPlayers,
    baselines: baselines as Record<Position, Player>,
  };
}
