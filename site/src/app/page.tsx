'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Navbar, TabType } from '../components/Navbar';
import { DraftBoard } from '../components/DraftBoard';
import { MyTeam } from '../components/MyTeam';
import { DraftGrid } from '../components/DraftGrid';
import { SetupConfig } from '../components/SetupConfig';
import {
  DraftedPlayer,
  Player,
  Position,
  PositionFilter,
  RosterConfig,
  TeamRoster,
} from '../types/vbd';
import {
  calculateVbd,
  DEFAULT_CONFIG,
  recalculateConfigBounds,
} from '../lib/vbdEngine';
import {
  clearConfigStorage,
  clearDraftStorage,
  loadStoredConfig,
  loadStoredDraftedPlayers,
  loadStoredFilter,
  loadStoredTeam,
  saveConfig,
  saveDraftedPlayers,
  saveFilter,
  saveTeam,
} from '../lib/storage';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('board');
  const [isHydrated, setIsHydrated] = useState(false);

  const [config, setConfig] = useState<RosterConfig>(DEFAULT_CONFIG);
  const [draftedPlayers, setDraftedPlayers] = useState<DraftedPlayer[]>([]);
  const [team, setTeam] = useState<TeamRoster>({
    qb: [],
    rb: [],
    wr: [],
    te: [],
    dst: [],
    k: [],
  });
  const [filter, setFilter] = useState<PositionFilter>({
    qb: true,
    rb: true,
    wr: true,
    te: true,
    dst: true,
    k: true,
  });

  // Hydrate from localStorage on client render
  useEffect(() => {
    setConfig(loadStoredConfig());
    setDraftedPlayers(loadStoredDraftedPlayers());
    setTeam(loadStoredTeam());
    setFilter(loadStoredFilter());
    setIsHydrated(true);

    // Sync tab with URL hash if present
    const hash = window.location.hash.replace('#', '');
    if (hash === 'setup' || hash === 'team' || hash === 'grid' || hash === 'board') {
      setActiveTab(hash as TabType);
    }
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  // Save config on changes
  useEffect(() => {
    if (isHydrated) {
      saveConfig(config);
    }
  }, [config, isHydrated]);

  // Save drafted players on changes
  useEffect(() => {
    if (isHydrated) {
      saveDraftedPlayers(draftedPlayers);
    }
  }, [draftedPlayers, isHydrated]);

  // Save team on changes
  useEffect(() => {
    if (isHydrated) {
      saveTeam(team);
    }
  }, [team, isHydrated]);

  // Save filter on changes
  useEffect(() => {
    if (isHydrated) {
      saveFilter(filter);
    }
  }, [filter, isHydrated]);

  // VBD Engine recalculated state
  const { players, baselines } = useMemo(() => {
    return calculateVbd(config, draftedPlayers, team);
  }, [config, draftedPlayers, team]);

  // Total draft statistics
  const totalPicks = config.numTeams * config.rosterSize;
  const myTeamCount = useMemo(() => {
    return (
      team.qb.length +
      team.rb.length +
      team.wr.length +
      team.te.length +
      team.dst.length +
      team.k.length
    );
  }, [team]);

  const totalTeamVBD = useMemo(() => {
    let total = 0;
    const positions: Position[] = ['qb', 'rb', 'wr', 'te', 'dst', 'k'];
    positions.forEach((pos) => {
      (team[pos] || []).forEach((dp) => {
        const match = players.find(
          (p) =>
            p.pos === pos &&
            (pos === 'dst'
              ? p.name.substring(0, 6) === dp.name.substring(0, 6)
              : p.name === dp.name)
        );
        if (match) {
          total += match.pointDif || 0;
        }
      });
    });
    return total;
  }, [team, players]);

  // Handlers for drafting/undrafting
  const handleDraft = (player: Player, myTeamSelection: boolean) => {
    const newDrafted: DraftedPlayer = { name: player.name, pos: player.pos };
    const updatedDraftedList = [...draftedPlayers, newDrafted];
    setDraftedPlayers(updatedDraftedList);

    if (myTeamSelection) {
      setTeam((prev) => ({
        ...prev,
        [player.pos]: [...(prev[player.pos] || []), newDrafted],
      }));
    }
  };

  const handleUndraft = (player: Player) => {
    setDraftedPlayers((prev) =>
      prev.filter(
        (dp) =>
          !(
            dp.pos === player.pos &&
            (player.pos === 'dst'
              ? dp.name.substring(0, 6) === player.name.substring(0, 6)
              : dp.name === player.name)
          )
      )
    );

    setTeam((prev) => ({
      ...prev,
      [player.pos]: (prev[player.pos] || []).filter(
        (dp) =>
          !(
            dp.pos === player.pos &&
            (player.pos === 'dst'
              ? dp.name.substring(0, 6) === player.name.substring(0, 6)
              : dp.name === player.name)
          )
      ),
    }));
  };

  const handleMoveDraftPosition = (
    draftPosition: number,
    direction: number
  ) => {
    const index = draftPosition - 1;
    const swapIndex = index + direction;

    if (swapIndex < 0 || swapIndex >= draftedPlayers.length) return;

    const newDrafted = [...draftedPlayers];
    const temp = newDrafted[index];
    newDrafted[index] = newDrafted[swapIndex];
    newDrafted[swapIndex] = temp;
    setDraftedPlayers(newDrafted);
  };

  const handleResetDraft = () => {
    if (confirm('Are you sure you want to reset all draft picks?')) {
      setDraftedPlayers([]);
      setTeam({ qb: [], rb: [], wr: [], te: [], dst: [], k: [] });
      clearDraftStorage();
    }
  };

  const handleResetConfig = () => {
    if (confirm('Reset configuration to default settings?')) {
      setConfig(DEFAULT_CONFIG);
      clearConfigStorage();
    }
  };

  const handleBuff = (pos: Position) => {
    setConfig((prev) => {
      const current = prev.buffPercentages[pos] || 1.0;
      return {
        ...prev,
        buffPercentages: {
          ...prev.buffPercentages,
          [pos]: current + 0.25,
        },
      };
    });
  };

  const handleNerf = (pos: Position) => {
    setConfig((prev) => {
      const current = prev.buffPercentages[pos] || 1.0;
      const nextVal = Math.max(0, current - 0.25);
      return {
        ...prev,
        buffPercentages: {
          ...prev.buffPercentages,
          [pos]: nextVal,
        },
      };
    });
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse font-medium text-sm">
          Loading VBD Board...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white pb-16">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        draftedCount={draftedPlayers.length}
        totalPicks={totalPicks}
        myTeamCount={myTeamCount}
        totalTeamVBD={totalTeamVBD}
        onResetDraft={handleResetDraft}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'board' && (
          <DraftBoard
            players={players}
            baselines={baselines}
            filter={filter}
            setFilter={setFilter}
            config={config}
            onDraft={handleDraft}
            onUndraft={handleUndraft}
            onMoveDraftPosition={handleMoveDraftPosition}
          />
        )}

        {activeTab === 'team' && (
          <MyTeam team={team} allPlayers={players} config={config} />
        )}

        {activeTab === 'grid' && (
          <DraftGrid draftedPlayers={draftedPlayers} config={config} />
        )}

        {activeTab === 'setup' && (
          <SetupConfig
            config={config}
            setConfig={setConfig}
            onBuff={handleBuff}
            onNerf={handleNerf}
            onResetConfig={handleResetConfig}
          />
        )}
      </main>
    </div>
  );
}
