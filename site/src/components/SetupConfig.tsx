'use client';

import React, { useRef } from 'react';
import { Position, RosterConfig } from '../types/vbd';
import { Settings, Plus, Minus, RotateCcw, Sliders, Shield, Link, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { recalculateConfigBounds } from '../lib/vbdEngine';

interface SetupConfigProps {
  config: RosterConfig;
  setConfig: React.Dispatch<React.SetStateAction<RosterConfig>>;
  onBuff: (pos: Position) => void;
  onNerf: (pos: Position) => void;
  onResetConfig: () => void;
  sleeperDraftUrl: string;
  onSleeperDraftUrlChange: (url: string) => void;
  sleeperDraftId: string | null;
}

const POSITIONS: Position[] = ['qb', 'rb', 'wr', 'te', 'dst', 'k'];

const POS_LABELS: Record<Position, string> = {
  qb: 'Quarterback (QB)',
  rb: 'Running Back (RB)',
  wr: 'Wide Receiver (WR)',
  te: 'Tight End (TE)',
  dst: 'Defense (DST)',
  k: 'Kicker (K)',
};

type StarterKey = 'qb' | 'rb' | 'wr' | 'te' | 'flex' | 'dst' | 'k';

const STARTER_LABELS: Record<StarterKey, string> = {
  qb: 'QB',
  rb: 'RB',
  wr: 'WR',
  te: 'TE',
  flex: 'FLEX',
  dst: 'DST',
  k: 'K',
};

const STARTER_KEYS: StarterKey[] = ['qb', 'rb', 'wr', 'te', 'flex', 'dst', 'k'];

export const SetupConfig: React.FC<SetupConfigProps> = ({
  config,
  setConfig,
  onBuff,
  onNerf,
  onResetConfig,
  sleeperDraftUrl,
  onSleeperDraftUrlChange,
  sleeperDraftId,
}) => {
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleTeamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 10;
    setConfig((prev) => ({
      ...prev,
      numTeams: val,
      baselineRangeStart: prev.numStarters * val,
      baselineRangeEnd: val * (prev.rosterSize + 1),
    }));
  };

  const handleBaselineChange = (start: number, end: number) => {
    setConfig((prev) => ({
      ...prev,
      baselineRangeStart: start,
      baselineRangeEnd: end,
    }));
  };

  const handleStarterChange = (key: StarterKey, delta: number) => {
    setConfig((prev) => {
      const newVal = Math.max(0, (prev.starters[key] || 0) + delta);
      const updated = {
        ...prev,
        starters: { ...prev.starters, [key]: newVal },
      };
      return recalculateConfigBounds(updated);
    });
  };

  const handleBenchChange = (delta: number) => {
    setConfig((prev) => {
      const newVal = Math.max(0, prev.benchSize + delta);
      const updated = { ...prev, benchSize: newVal };
      return recalculateConfigBounds(updated);
    });
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Let the paste go through, then trim whitespace
    setTimeout(() => {
      if (urlInputRef.current) {
        onSleeperDraftUrlChange(urlInputRef.current.value.trim());
      }
    }, 0);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSleeperDraftUrlChange(e.target.value.trim());
  };

  const handleClearUrl = () => {
    onSleeperDraftUrlChange('');
  };

  const isValidUrl = sleeperDraftUrl.length > 0;
  const hasValidId = !!sleeperDraftId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-cyan-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">League Setup &amp; Positional Buffs</h2>
            <p className="text-xs text-slate-400">
              Customize league size, roster specifications, replacement baselines, and position weighting.
            </p>
          </div>
        </div>

        <button
          onClick={onResetConfig}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Configuration</span>
        </button>
      </div>

      {/* Sleeper Integration */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Link className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-white text-base">Sleeper Live Sync</h3>
          {hasValidId && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              Live Sync Active
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Paste your Sleeper draft URL below to automatically sync picks in real time. Open your draft on Sleeper and copy the URL from the browser address bar.
        </p>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Sleeper Draft URL
          </label>
          <div className="relative">
            <input
              ref={urlInputRef}
              type="text"
              value={sleeperDraftUrl}
              onChange={handleUrlChange}
              onPaste={handleUrlPaste}
              placeholder="https://sleeper.com/draft/nfl/123456789..."
              className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 pr-9 text-sm text-white placeholder:text-slate-600 focus:outline-none transition ${
                isValidUrl
                  ? hasValidId
                    ? 'border-emerald-500/50 focus:border-emerald-400/70'
                    : 'border-amber-500/50 focus:border-amber-400/70'
                  : 'border-slate-800 focus:border-cyan-500/50'
              }`}
            />
            {isValidUrl && (
              <button
                onClick={handleClearUrl}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status row */}
          {isValidUrl && (
            <div className="flex items-center gap-2 text-xs">
              {hasValidId ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-400">
                    Draft ID detected:{' '}
                    <span className="font-mono text-emerald-400">{sleeperDraftId}</span>
                    {' '}— picks syncing every 3 s
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-400">Couldn't find a draft ID in this URL. Make sure you're on the live draft page.</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* League Parameters */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">League Settings</h3>
          </div>

          <div className="space-y-4">
            {/* Number of Teams */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Number of Teams ({config.numTeams})
              </label>
              <input
                type="range"
                min={8}
                max={16}
                value={config.numTeams}
                onChange={handleTeamsChange}
                className="w-full accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>8 Teams</span>
                <span>10 Teams</span>
                <span>12 Teams</span>
                <span>14 Teams</span>
                <span>16 Teams</span>
              </div>
            </div>

            {/* Baseline Range Start */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Baseline Range Start (Pick #{config.baselineRangeStart})
              </label>
              <input
                type="number"
                value={config.baselineRangeStart}
                onChange={(e) =>
                  handleBaselineChange(
                    parseInt(e.target.value, 10) || config.numTeams,
                    config.baselineRangeEnd
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Baseline Range End */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Baseline Range End (Pick #{config.baselineRangeEnd})
              </label>
              <input
                type="number"
                value={config.baselineRangeEnd}
                onChange={(e) =>
                  handleBaselineChange(
                    config.baselineRangeStart,
                    parseInt(e.target.value, 10) || config.numTeams * config.rosterSize
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Third Round Reversal (3RR) Toggle */}
            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">Third Round Reversal (3RR)</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        config.thirdRoundReversal
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {config.thirdRoundReversal ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reverses draft order each round, with Round 3 also reversed to balance early draft advantages.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(config.thirdRoundReversal)}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        thirdRoundReversal: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              {/* Order preview visualizer */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Draft Order Flow
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                  <div className="bg-slate-900 border border-slate-800 rounded p-1">
                    <div className="text-slate-400 font-bold">R1</div>
                    <div className="text-slate-200 font-mono">1 → {config.numTeams}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-1">
                    <div className="text-slate-400 font-bold">R2</div>
                    <div className="text-amber-400 font-mono">{config.numTeams} → 1</div>
                  </div>
                  <div
                    className={`rounded p-1 border transition-colors ${
                      config.thirdRoundReversal
                        ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className={config.thirdRoundReversal ? 'text-cyan-400 font-bold' : 'text-slate-400 font-bold'}>
                      R3 {config.thirdRoundReversal && '★'}
                    </div>
                    <div className="font-mono">
                      {config.thirdRoundReversal ? `${config.numTeams} → 1` : `1 → ${config.numTeams}`}
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-1">
                    <div className="text-slate-400 font-bold">R4</div>
                    <div className="font-mono">
                      {config.thirdRoundReversal ? `1 → ${config.numTeams}` : `${config.numTeams} → 1`}
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-1">
                    <div className="text-slate-400 font-bold">R5+</div>
                    <div className="font-mono text-slate-400">Alternates</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roster Composition */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-white text-base">Roster Composition</h3>
          </div>

          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Starter Slots</div>

            {STARTER_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5"
              >
                <span className="text-sm font-semibold text-white w-14">{STARTER_LABELS[key]}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleStarterChange(key, -1)}
                    disabled={(config.starters[key] || 0) <= 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-mono font-bold text-white w-4 text-center">
                    {config.starters[key] || 0}
                  </span>
                  <button
                    onClick={() => handleStarterChange(key, 1)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="border-t border-slate-800 pt-3 mt-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Bench</div>
              <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5">
                <span className="text-sm font-semibold text-white w-14">Bench</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleBenchChange(-1)}
                    disabled={config.benchSize <= 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-mono font-bold text-white w-4 text-center">
                    {config.benchSize}
                  </span>
                  <button
                    onClick={() => handleBenchChange(1)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-400 space-y-1 mt-1">
              <div>
                <span className="font-semibold text-slate-300">Roster Size:</span>{' '}
                {config.rosterSize} players ({config.numStarters} starters + {config.benchSize} bench)
              </div>
              <div>
                <span className="font-semibold text-slate-300">Total League Draft Picks:</span>{' '}
                {config.numTeams * config.rosterSize}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Position Buffs / Weighting */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-white text-base">Position Value Buffs / Nerfs</h3>
        </div>

        <p className="text-xs text-slate-400">
          Adjust positional multiplier weightings to emphasize or deprioritize specific position groups during value ranking calculations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {POSITIONS.map((pos) => {
            const currentBuff = config.buffPercentages[pos] || 1.0;
            const percentageText = `${Math.round(currentBuff * 100)}%`;

            return (
              <div
                key={pos}
                className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-3"
              >
                <div>
                  <div className="text-sm font-semibold text-white">
                    {POS_LABELS[pos]}
                  </div>
                  <div className="text-xs text-slate-400">
                    Weight: <span className="font-mono text-cyan-400">{percentageText}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onNerf(pos)}
                    title="Nerf position by 25%"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onBuff(pos)}
                    title="Buff position by 25%"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
