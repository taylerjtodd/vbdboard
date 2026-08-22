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
  PlayerProjection,
  PlayerRank,
  Position,
  PositionFilter,
  RosterConfig,
  TeamRoster,
} from '../types/vbd';
import {
  calculateVbd,
  DEFAULT_CONFIG,
  isPlayerMatch,
  recalculateConfigBounds,
} from '../lib/vbdEngine';
import {
  clearConfigStorage,
  clearDraftStorage,
  loadStoredConfig,
  loadStoredDraftedPlayers,
  loadStoredFilter,
  loadStoredMySlot,
  loadStoredTeam,
  saveConfig,
  saveDraftedPlayers,
  saveFilter,
  saveMySlot,
  saveTeam,
} from '../lib/storage';
import { loadPlayerData } from '../data/initialData';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('board');
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [projections, setProjections] = useState<Record<Position, PlayerProjection[]>>({
    qb: [], rb: [], wr: [], te: [], dst: [], k: [],
  });
  const [ranks, setRanks] = useState<PlayerRank[]>([]);

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
  const [sleeperDraftId, setSleeperDraftId] = useState<string | null>(null);
  const [mySlot, setMySlot] = useState<number>(1);

  // Hydrate from localStorage + fetch player data on client render
  useEffect(() => {
    setConfig(loadStoredConfig());
    setDraftedPlayers(loadStoredDraftedPlayers());
    setTeam(loadStoredTeam());
    setFilter(loadStoredFilter());
    setMySlot(loadStoredMySlot());
    setIsHydrated(true);

    // Check URL params for Sleeper draft integration
    const urlParams = new URLSearchParams(window.location.search);
    const sDraftId = urlParams.get('sleeper_draft_id');
    const sSlot = urlParams.get('my_slot');
    if (sDraftId) {
      setSleeperDraftId(sDraftId);
      if (sSlot) {
        const parsedSlot = parseInt(sSlot, 10);
        setMySlot(parsedSlot);
        saveMySlot(parsedSlot);
      }
    }

    // Fetch scraped player data
    loadPlayerData().then(({ projections: p, ranks: r }) => {
      setProjections(p);
      setRanks(r);
      setIsLoadingData(false);
    });

    // Sync tab with URL hash if present
    const hash = window.location.hash.replace('#', '');
    if (hash === 'setup' || hash === 'team' || hash === 'grid' || hash === 'board') {
      setActiveTab(hash as TabType);
    }
  }, []);

  // Poll Sleeper Draft if sleeper_draft_id is present
  useEffect(() => {
    if (!sleeperDraftId) return;

    let isMounted = true;
    const syncSleeperPicks = async () => {
      try {
        const res = await fetch(`https://api.sleeper.app/v1/draft/${sleeperDraftId}/picks`);
        if (!res.ok) return;
        const picks = await res.json();
        if (!isMounted || !Array.isArray(picks)) return;

        const newDrafted: DraftedPlayer[] = [];
        const newTeam: TeamRoster = { qb: [], rb: [], wr: [], te: [], dst: [], k: [] };

        picks.forEach((pick: any) => {
          let pos = (pick.metadata?.position || '').toLowerCase() as Position;
          if (pos === ('def' as any)) pos = 'dst';
          const name =
            pick.metadata?.player_name ||
            `${pick.metadata?.first_name || ''} ${pick.metadata?.last_name || ''}`.trim();

          const entry: DraftedPlayer = { name, pos };
          newDrafted.push(entry);

          if (mySlot && (pick.draft_slot === mySlot || pick.roster_id === mySlot)) {
            if (newTeam[pos]) {
              newTeam[pos].push(entry);
            }
          }
        });

        setDraftedPlayers(newDrafted);
        if (mySlot) setTeam(newTeam);
      } catch (err) {
        console.debug('Sleeper sync error:', err);
      }
    };

    syncSleeperPicks();
    const interval = setInterval(syncSleeperPicks, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sleeperDraftId, mySlot]);

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
    return calculateVbd(config, draftedPlayers, team, projections, ranks);
  }, [config, draftedPlayers, team, projections, ranks]);

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
          (p) => p.pos === pos && isPlayerMatch(p.name, dp.name, pos)
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
      prev.filter((dp) => !(dp.pos === player.pos && isPlayerMatch(dp.name, player.name, player.pos)))
    );

    setTeam((prev) => ({
      ...prev,
      [player.pos]: (prev[player.pos] || []).filter(
        (dp) => !(dp.pos === player.pos && isPlayerMatch(dp.name, player.name, player.pos))
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

  const handleClaimSlot = (slot: number) => {
    setMySlot(slot);
    saveMySlot(slot);

    // Rebuild team roster for the newly claimed slot based on current drafted players
    const newTeam: TeamRoster = { qb: [], rb: [], wr: [], te: [], dst: [], k: [] };
    const numTeams = config.numTeams;

    draftedPlayers.forEach((player, i) => {
      const round = Math.floor(i / numTeams);
      let pickInRound = i % numTeams;
      if (round % 2 === 1) {
        pickInRound = numTeams - 1 - pickInRound;
      }
      const slotForPick = pickInRound + 1;

      if (slotForPick === slot && newTeam[player.pos]) {
        newTeam[player.pos].push(player);
      }
    });

    setTeam(newTeam);
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

  if (!isHydrated || isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse font-medium text-sm">
          {!isHydrated ? 'Loading VBD Board...' : 'Loading player data...'}
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
        sleeperDraftId={sleeperDraftId}
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
          <MyTeam
            team={team}
            allPlayers={players}
            config={config}
            mySlot={mySlot}
            onClaimSlot={handleClaimSlot}
          />
        )}

        {activeTab === 'grid' && (
          <DraftGrid
            draftedPlayers={draftedPlayers}
            config={config}
            mySlot={mySlot}
            onClaimSlot={handleClaimSlot}
          />
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
