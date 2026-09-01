import { PlayerProjection, PlayerRank, Position } from '../types/vbd';

/** Shape of each entry in site/public/players.json (produced by scripts/combine_data.mjs) */
interface CombinedPlayer {
  name: string;
  position: string; // lowercase position string, e.g. "qb"
  points: number;
  ppg: number;
  rank: number;
  overall_rank?: number;
  tier: number;
  adp: number;
}

const VALID_POSITIONS: Position[] = ['qb', 'rb', 'wr', 'te', 'dst', 'k'];

function isValidPosition(pos: string): pos is Position {
  return VALID_POSITIONS.includes(pos as Position);
}

/**
 * Fetches /players.json and maps the combined player list into the
 * PlayerProjection[] and PlayerRank[] shapes expected by the VBD engine.
 *
 * Returns empty arrays + logs a warning if the fetch fails.
 */
export async function loadPlayerData(): Promise<{
  projections: Record<Position, PlayerProjection[]>;
  ranks: PlayerRank[];
}> {
  const emptyProjections: Record<Position, PlayerProjection[]> = {
    qb: [],
    rb: [],
    wr: [],
    te: [],
    dst: [],
    k: [],
  };

  try {
    let res = await fetch('/vbdboard/players.json');
    if (!res.ok) {
      res = await fetch('/players.json');
      if   (!res.ok) {
        throw new Error(`HTTP ${res.status} — failed to load /players.json`);
      }
    }

    const players: CombinedPlayer[] = await res.json();

    const projections: Record<Position, PlayerProjection[]> = {
      qb: [],
      rb: [],
      wr: [],
      te: [],
      dst: [],
      k: [],
    };

    const ranks: PlayerRank[] = [];

    for (const p of players) {
      const pos = p.position.toLowerCase();
      if (!isValidPosition(pos)) continue;

      // Build PlayerProjection entry
      projections[pos].push({
        name: p.name,
        position: pos,
        points: p.points,
        ppg: p.ppg !== undefined ? p.ppg : Number((p.points / 17).toFixed(1)),
        tier: p.tier,
      });

      // Build PlayerRank entry
      ranks.push({
        name: p.name,
        tier: p.tier,
        rank: p.rank,
        overall_rank: p.overall_rank,
        adp: p.adp,
        pos,
      });
    }

    return { projections, ranks };
  } catch (err) {
    console.warn(
      'Could not load /players.json — board will start empty. Run `node scripts/combine_data.mjs` to generate it.',
      err
    );
    return { projections: emptyProjections, ranks: [] };
  }
}
