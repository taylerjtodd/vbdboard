'use client';

import React from 'react';
import { DraftedPlayer, Position, RosterConfig } from '../types/vbd';
import { LayoutGrid, UserCheck, Star } from 'lucide-react';
import { isRoundReversed } from '../lib/vbdEngine';

interface DraftGridProps {
  draftedPlayers: DraftedPlayer[];
  config: RosterConfig;
  mySlot?: number;
  onClaimSlot?: (slot: number) => void;
}

const POS_COLORS: Record<Position, { bg: string; text: string; border: string }> = {
  qb: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  rb: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' },
  wr: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  te: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  dst: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/40' },
  k: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
};

export const DraftGrid: React.FC<DraftGridProps> = ({
  draftedPlayers,
  config,
  mySlot = 1,
  onClaimSlot,
}) => {
  const numRounds = config.rosterSize;
  const numTeams = config.numTeams;

  // Build round matrix
  const rounds: { picks: (DraftedPlayer | null)[] }[] = [];
  for (let r = 0; r < numRounds; r++) {
    const picks: (DraftedPlayer | null)[] = new Array(numTeams).fill(null);
    rounds.push({ picks });
  }

  draftedPlayers.forEach((player, i) => {
    const round = Math.floor(i / numTeams);
    let pickInRound = i % numTeams;

    if (isRoundReversed(round, config.thirdRoundReversal)) {
      // Reversed order for this round
      pickInRound = numTeams - 1 - pickInRound;
    }

    if (round < numRounds && pickInRound >= 0 && pickInRound < numTeams) {
      rounds[round].picks[pickInRound] = player;
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-cyan-400">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Draft Board Grid</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span>{config.thirdRoundReversal ? '3rd Round Reversal (3RR)' : 'Snake'} draft visualization across {numTeams} teams & {numRounds} rounds</span>
              {config.thirdRoundReversal && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  3RR Active
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Claim Draft Slot Dropdown */}
        <div className="flex items-center space-x-3 bg-slate-950/70 border border-slate-800 px-4 py-2 rounded-xl">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 font-medium">My Draft Spot:</span>
          <select
            value={mySlot}
            onChange={(e) => onClaimSlot && onClaimSlot(parseInt(e.target.value, 10))}
            aria-label="Select your draft slot"
            className="bg-slate-900 text-cyan-300 font-semibold border border-cyan-500/30 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-400"
          >
            {Array.from({ length: numTeams }).map((_, idx) => (
              <option key={`slot-opt-${idx + 1}`} value={idx + 1}>
                Spot {idx + 1} (Team {idx + 1})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <th className="p-3 w-16 text-center font-bold">Round</th>
              {Array.from({ length: numTeams }).map((_, teamIdx) => {
                const isMyTeam = teamIdx + 1 === mySlot;
                return (
                  <th
                    key={`th-team-${teamIdx + 1}`}
                    className={`p-3 font-semibold text-center min-w-[140px] transition-colors ${
                      isMyTeam
                        ? 'bg-cyan-950/60 border-x border-cyan-500/30 text-cyan-300'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="flex items-center gap-1 font-bold">
                        {isMyTeam && <Star className="w-3 h-3 fill-cyan-400 text-cyan-400" />}
                        Team {teamIdx + 1}
                      </span>
                      {onClaimSlot && (
                        <button
                          onClick={() => onClaimSlot(teamIdx + 1)}
                          className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                            isMyTeam
                              ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                              : 'bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/30'
                          }`}
                        >
                          {isMyTeam ? 'My Team' : 'Claim'}
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rounds.map((roundObj, roundIdx) => {
              const isReversed = isRoundReversed(roundIdx, config.thirdRoundReversal);
              return (
                <tr key={`round-row-${roundIdx + 1}`} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-slate-400 text-center bg-slate-950/40 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <span>R{roundIdx + 1}</span>
                      <span className={`text-[10px] font-mono ${isReversed ? 'text-amber-400/80' : 'text-cyan-400/80'}`}>
                        {isReversed ? '←' : '→'}
                      </span>
                    </div>
                  </td>
                {roundObj.picks.map((player, teamIdx) => {
                  const isMyTeam = teamIdx + 1 === mySlot;
                  if (!player) {
                    return (
                      <td
                        key={`cell-${roundIdx}-${teamIdx}`}
                        className={`p-2 text-center text-slate-700 ${
                          isMyTeam ? 'bg-cyan-950/20 border-x border-cyan-500/20' : ''
                        }`}
                      >
                        -
                      </td>
                    );
                  }

                  const colors = POS_COLORS[player.pos];
                  return (
                    <td
                      key={`cell-${roundIdx}-${teamIdx}`}
                      className={`p-1.5 ${
                        isMyTeam ? 'bg-cyan-950/20 border-x border-cyan-500/20' : ''
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg border flex flex-col justify-between h-full ${colors.bg} ${colors.border}`}
                      >
                        <span className="font-semibold text-white truncate">
                          {player.name}
                        </span>
                        <span
                          className={`mt-1 inline-block uppercase text-[10px] font-bold ${colors.text}`}
                        >
                          {player.pos}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
