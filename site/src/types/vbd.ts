export type Position = 'qb' | 'rb' | 'wr' | 'te' | 'k' | 'dst';

export interface PlayerProjection {
  name: string;
  position: Position;
  points: string | number;
  ppg: number;
  tier: number;
}

export interface PlayerRank {
  name: string;
  tier: number;
  rank: number;
  overall_rank?: number;
  adp: number;
  pos: Position;
}

export interface Player {
  name: string;
  position: Position;
  pos: Position;
  points: number;
  ppg: number;
  tier: number;
  rank: number;
  overall_rank?: number;
  adp: number;
  vrank?: number;
  posrank?: string;
  displayPosition?: string;
  pointDif?: number;
  sortFactor?: number;
  drafted?: number; // 1-based draft pick order if drafted
  adpWarning?: boolean;
}

export interface StartersConfig {
  qb: number;
  rb: number;
  wr: number;
  te: number;
  flex: number;
  dst: number;
  k: number;
}

export interface RosterConfig {
  numTeams: number;
  starters: StartersConfig;
  benchSize: number;
  numStarters: number;
  rosterSize: number;
  baselineRangeStart: number;
  baselineRangeEnd: number;
  buffPercentages: Record<Position, number>;
  thirdRoundReversal?: boolean;
}

export interface DraftedPlayer {
  name: string;
  pos: Position;
}

export type TeamRoster = Record<Position, DraftedPlayer[]>;

export type PositionFilter = Record<Position, boolean>;
