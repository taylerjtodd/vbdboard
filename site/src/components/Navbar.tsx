'use client';

import React from 'react';
import {
  Trophy,
  LayoutGrid,
  Users,
  Settings,
  RotateCcw,
  Sparkles,
  Zap,
  RefreshCw,
} from 'lucide-react';

export type TabType = 'board' | 'team' | 'grid' | 'setup';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  draftedCount: number;
  totalPicks: number;
  myTeamCount: number;
  totalTeamVBD: number;
  onResetDraft: () => void;
  onSyncSleeper: () => void;
  isSyncingSleeper: boolean;
  hasSleeperDraft: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  draftedCount,
  totalPicks,
  myTeamCount,
  totalTeamVBD,
  onResetDraft,
  onSyncSleeper,
  isSyncingSleeper,
  hasSleeperDraft,
}) => {
  const tabs = [
    { id: 'board' as TabType, label: 'Draft Board', icon: Trophy },
    { id: 'team' as TabType, label: 'My Team', icon: Users, badge: myTeamCount },
    { id: 'grid' as TabType, label: 'Draft Grid', icon: LayoutGrid },
    { id: 'setup' as TabType, label: 'Setup & Buffs', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 shadow-2xl">
      <div className="max-w-full mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-emerald-500 rounded-xl shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                VBD Board
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                Next.js
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-800/90 text-white shadow-inner border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3 text-xs">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Picks:</span>
                <span className="font-semibold text-slate-100">
                  {draftedCount} / {totalPicks}
                </span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center space-x-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">My VORP:</span>
                <span className="font-semibold text-emerald-400">
                  {totalTeamVBD > 0 ? `+${totalTeamVBD.toFixed(1)}` : totalTeamVBD.toFixed(1)}
                </span>
              </div>
            </div>

            {hasSleeperDraft && (
              <button
                onClick={onSyncSleeper}
                disabled={isSyncingSleeper}
                title="Sync Sleeper Draft Now"
                className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingSleeper ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onResetDraft}
              title="Reset Draft Progress"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
