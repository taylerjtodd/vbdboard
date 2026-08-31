'use client';

import React, { useState, useMemo } from 'react';
import {
  Player,
  Position,
  PositionFilter,
  RosterConfig,
} from '../types/vbd';
import {
  Search,
  UserCheck,
  UserPlus,
  AlertCircle,
  Undo2,
  ChevronUp,
  ChevronDown,
  Info,
  Award,
} from 'lucide-react';

interface DraftBoardProps {
  players: Player[];
  baselines: Record<Position, Player>;
  filter: PositionFilter;
  setFilter: React.Dispatch<React.SetStateAction<PositionFilter>>;
  config: RosterConfig;
  onDraft: (player: Player, myTeam: boolean) => void;
  onUndraft: (player: Player) => void;
  onMoveDraftPosition: (draftPosition: number, direction: number) => void;
}

const POSITIONS: Position[] = ['qb', 'rb', 'wr', 'te', 'dst', 'k'];

const POS_COLORS: Record<Position, { bg: string; text: string; border: string }> = {
  qb: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
  },
  rb: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-500/30',
  },
  wr: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    border: 'border-cyan-500/30',
  },
  te: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
  },
  dst: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
  },
  k: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
  },
};

export const DraftBoard: React.FC<DraftBoardProps> = ({
  players,
  baselines,
  filter,
  setFilter,
  config,
  onDraft,
  onUndraft,
  onMoveDraftPosition,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showUndraftedOnly, setShowUndraftedOnly] = useState(false);
  const [sortCol, setSortCol] = useState<'vrank' | 'rank' | 'adp' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: 'vrank' | 'rank' | 'adp') => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const toggleFilter = (pos: Position) => {
    setFilter((prev) => ({ ...prev, [pos]: !prev[pos] }));
  };

  const setAllFilters = (val: boolean) => {
    setFilter({
      qb: val,
      rb: val,
      wr: val,
      te: val,
      dst: val,
      k: val,
    });
  };

  const filteredPlayers = useMemo(() => {
    const filtered = players.filter((player) => {
      if (!filter[player.pos]) return false;
      if (showUndraftedOnly && player.drafted) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          player.name.toLowerCase().includes(q) ||
          player.pos.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (!sortCol) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = a[sortCol] ?? Infinity;
      const bVal = b[sortCol] ?? Infinity;
      const cmp = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [players, filter, showUndraftedOnly, searchTerm, sortCol, sortDir]);

  return (
    <div className="space-y-6">
      {/* Controls & Filters Header */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Position Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAllFilters(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              All
            </button>
            {POSITIONS.map((pos) => {
              const active = filter[pos];
              const colors = POS_COLORS[pos];
              return (
                <button
                  key={pos}
                  onClick={() => toggleFilter(pos)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border ${
                    active
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : 'bg-slate-950/40 text-slate-500 border-slate-800 line-through opacity-60'
                  }`}
                >
                  {pos}
                </button>
              );
            })}
          </div>

          {/* Search & Toggle */}
          <div className="flex items-center space-x-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search player..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
              />
            </div>
            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showUndraftedOnly}
                onChange={(e) => setShowUndraftedOnly(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
              />
              <span>Available Only</span>
            </label>
          </div>
        </div>

        {/* Positional Baselines Summary */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Replacement Baselines:</span>
          </div>
          {POSITIONS.map((pos) => {
            const b = baselines[pos];
            if (!b) return null;
            const colors = POS_COLORS[pos];
            return (
              <span
                key={pos}
                className="inline-flex items-center space-x-1 bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800/80"
              >
                <span className={`uppercase font-bold ${colors.text}`}>
                  {pos}:
                </span>
                <span className="text-slate-200 font-medium">{b.name}</span>
                <span className="text-slate-500">({b.ppg} ppg)</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">
                  <button
                    onClick={() => handleSort('vrank')}
                    className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    V-Rank
                    {sortCol === 'vrank' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <span className="w-3 h-3 opacity-30">⇅</span>
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 font-semibold">VORP (Pts Diff)</th>
                <th className="py-3.5 px-4 font-semibold">Player</th>
                <th className="py-3.5 px-4 font-semibold">Pos Rank</th>
                <th className="py-3.5 px-4 font-semibold">
                  <button
                    onClick={() => handleSort('adp')}
                    className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    ADP
                    {sortCol === 'adp' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <span className="w-3 h-3 opacity-30">⇅</span>
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 font-semibold">
                  <button
                    onClick={() => handleSort('rank')}
                    className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    Exp Rank (Tier)
                    {sortCol === 'rank' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <span className="w-3 h-3 opacity-30">⇅</span>
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 font-semibold text-right">Draft Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No players found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  const colors = POS_COLORS[player.pos];
                  const isDrafted = !!player.drafted;
                  const pointDif = player.pointDif || 0;

                  return (
                    <tr
                      key={`${player.pos}-${player.name}`}
                      className={`transition-colors hover:bg-slate-800/40 ${
                        isDrafted ? 'opacity-50 bg-slate-950/30' : ''
                      }`}
                    >
                      {/* V-Rank */}
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {player.vrank}
                      </td>

                      {/* VORP */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            pointDif > 0
                              ? 'text-emerald-400'
                              : pointDif < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {pointDif > 0 ? `+${pointDif}` : pointDif}
                        </span>
                      </td>

                      {/* Player Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${colors.bg} ${colors.text} ${colors.border}`}
                          >
                            {player.pos}
                          </span>
                          <span className="font-semibold text-white">
                            {player.name}
                          </span>

                          {player.adpWarning && !isDrafted && (
                            <span
                              title="Value alert: Undrafted high ADP player"
                              className="inline-flex items-center text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/20"
                            >
                              <AlertCircle className="w-3 h-3 mr-0.5" />
                              ADP Reach
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Positional Rank */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {player.displayPosition}
                      </td>

                      {/* ADP */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {player.adp}
                      </td>

                      {/* Expert Rank (Tier) */}
                      <td className="py-3 px-4 text-slate-400">
                        Rank {player.rank} (Tier {player.tier})
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isDrafted ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <span className="text-xs bg-slate-800 text-cyan-300 font-semibold px-2 py-1 rounded border border-slate-700">
                              Pick #{player.drafted}
                            </span>
                            <button
                              onClick={() => onMoveDraftPosition(player.drafted!, -1)}
                              title="Move draft pick earlier"
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onMoveDraftPosition(player.drafted!, 1)}
                              title="Move draft pick later"
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onUndraft(player)}
                              title="Undo Draft"
                              className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => onDraft(player, true)}
                              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Draft (Me)</span>
                            </button>
                            <button
                              onClick={() => onDraft(player, false)}
                              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Draft (Other)</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
