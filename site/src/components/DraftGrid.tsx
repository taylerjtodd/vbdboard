'use client';

import React from 'react';
import { DraftedPlayer, Position, RosterConfig } from '../types/vbd';
import { LayoutGrid, UserCheck } from 'lucide-react';

interface DraftGridProps {
  draftedPlayers: DraftedPlayer[];
  config: RosterConfig;
}

const POS_COLORS: Record<Position, { bg: string; text: string; border: string }> = {
  qb: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  rb: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' },
  wr: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  te: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  dst: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/40' },
  k: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
};

export const DraftGrid: React.FC<DraftGridProps> = ({ draftedPlayers, config }) => {
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

    if (round % 2 === 1) {
      // Snake draft reverse order on even rounds (0-based round 1)
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
            <p className="text-xs text-slate-400">
              Snake draft visualization across {numTeams} teams & {numRounds} rounds
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <th className="p-3 w-16 text-center font-bold">Round</th>
              {Array.from({ length: numTeams }).map((_, teamIdx) => (
                <th key={teamIdx} className="p-3 font-semibold text-center min-w-[140px]">
                  Team {teamIdx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rounds.map((roundObj, roundIdx) => (
              <tr key={roundIdx} className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-slate-400 text-center bg-slate-950/40">
                  R{roundIdx + 1}
                </td>
                {roundObj.picks.map((player, teamIdx) => {
                  if (!player) {
                    return (
                      <td key={teamIdx} className="p-2 text-center text-slate-700">
                        -
                      </td>
                    );
                  }

                  const colors = POS_COLORS[player.pos];
                  return (
                    <td key={teamIdx} className="p-1.5">
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
