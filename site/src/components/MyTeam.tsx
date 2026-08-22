'use client';

import React from 'react';
import { Player, Position, RosterConfig, TeamRoster } from '../types/vbd';
import { isPlayerMatch } from '../lib/vbdEngine';
import { Shield, Sparkles, User, Award } from 'lucide-react';

interface MyTeamProps {
  team: TeamRoster;
  allPlayers: Player[];
  config: RosterConfig;
  mySlot?: number;
  onClaimSlot?: (slot: number) => void;
}

const POSITIONS: Position[] = ['qb', 'rb', 'wr', 'te', 'dst', 'k'];

const POS_LABELS: Record<Position, string> = {
  qb: 'Quarterbacks',
  rb: 'Running Backs',
  wr: 'Wide Receivers',
  te: 'Tight Ends',
  dst: 'Defense / Special Teams',
  k: 'Kickers',
};

const POS_COLORS: Record<Position, { bg: string; text: string; border: string }> = {
  qb: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  rb: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
  wr: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  te: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  dst: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' },
  k: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
};

export const MyTeam: React.FC<MyTeamProps> = ({
  team,
  allPlayers,
  config,
  mySlot = 1,
  onClaimSlot,
}) => {
  // Resolve full player data for my drafted players
  const myDraftedFullPlayers: Player[] = [];
  POSITIONS.forEach((pos) => {
    const list = team[pos] || [];
    list.forEach((dp) => {
      const match = allPlayers.find((p) => p.pos === pos && isPlayerMatch(p.name, dp.name, pos));
      if (match) {
        myDraftedFullPlayers.push(match);
      }
    });
  });

  const totalVbd = myDraftedFullPlayers.reduce(
    (acc, p) => acc + (p.pointDif || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Stat Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">My Roster</h2>
            <p className="text-xs text-slate-400">
              Total Players Drafted: {myDraftedFullPlayers.length} / {config.rosterSize}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Claim Draft Spot */}
          <div className="flex items-center space-x-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400">Draft Slot:</span>
            <select
              value={mySlot}
              onChange={(e) => onClaimSlot && onClaimSlot(parseInt(e.target.value, 10))}
              aria-label="Change your draft slot"
              className="bg-slate-900 text-cyan-300 font-semibold border border-cyan-500/30 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-400"
            >
              {Array.from({ length: config.numTeams }).map((_, idx) => (
                <option key={`myteam-slot-${idx + 1}`} value={idx + 1}>
                  Spot {idx + 1} (Team {idx + 1})
                </option>
              ))}
            </select>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-xs text-slate-400 flex items-center justify-center sm:justify-end space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Team VORP</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {totalVbd > 0 ? `+${totalVbd.toFixed(1)}` : totalVbd.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Positional Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {POSITIONS.map((pos) => {
          const playersAtPos = myDraftedFullPlayers.filter((p) => p.pos === pos);
          const colors = POS_COLORS[pos];
          const starterTarget = config.starters[pos as keyof typeof config.starters] || 1;

          return (
            <div
              key={pos}
              className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold uppercase border ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {pos}
                    </span>
                    <h3 className="font-semibold text-slate-200 text-sm">
                      {POS_LABELS[pos]}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {playersAtPos.length} / {starterTarget} starters
                  </span>
                </div>

                {playersAtPos.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    No players drafted for this position yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {playersAtPos.map((player, idx) => (
                      <div
                        key={`${player.name}-${idx}`}
                        className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-xl p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-white text-sm">
                              {player.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              ADP: {player.adp} | Tier: {player.tier}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-semibold text-emerald-400">
                            {(player.pointDif || 0) > 0
                              ? `+${player.pointDif}`
                              : player.pointDif}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            V-Rank #{player.vrank}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
