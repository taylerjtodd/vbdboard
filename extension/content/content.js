/**
 * content.js
 * Injected script for Sleeper draft rooms.
 * Manages draft detection, live pick polling, VBD engine execution, and HUD rendering.
 */

(async () => {
  // Dynamically import helper modules via chrome.runtime.getURL
  const { extractDraftId, fetchDraft, fetchDraftPicks, fetchDraftUsers, mapSleeperSettingsToConfig } = await import(
    chrome.runtime.getURL('lib/sleeperApi.js')
  );
  const { calculateVbd, parseCombinedPlayers, DEFAULT_CONFIG } = await import(
    chrome.runtime.getURL('lib/vbdCore.js')
  );
  const { matchPlayer, normalizePosition } = await import(
    chrome.runtime.getURL('lib/nameMatcher.js')
  );
  const { getStorageItem, setStorageItem, STORAGE_KEYS } = await import(
    chrome.runtime.getURL('lib/storage.js')
  );
  const { startDomObserver, updateDomBadges } = await import(
    chrome.runtime.getURL('content/domObserver.js')
  );

  let draftId = extractDraftId(window.location.href);
  if (!draftId) {
    // Monitor URL changes in case user navigates into a draft via SPA navigation
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        const newId = extractDraftId(window.location.href);
        if (newId && newId !== draftId) {
          draftId = newId;
          initDraftAssistant();
        }
      }
    }, 1000);
    return;
  }

  // State
  let config = DEFAULT_CONFIG;
  let rawPlayerData = null;
  let projections = null;
  let ranks = null;
  let draftMetadata = null;
  let draftUsers = [];
  let slotLabels = {};
  let picks = [];
  let draftedPlayers = [];
  let myTeamRoster = { qb: [], rb: [], wr: [], te: [], dst: [], k: [] };
  let myDraftSlot = 1;
  let vbdResult = { players: [], baselines: {} };
  let activeTab = 'board';
  let activeFilter = 'ALL';
  let isCollapsed = false;
  let pollInterval = null;

  async function initDraftAssistant() {
    console.log('[Sleeper VBD] Initializing assistant for draft ID:', draftId);

    // 1. Load Player Database
    try {
      const resp = await fetch(chrome.runtime.getURL('data/players.json'));
      rawPlayerData = await resp.json();
      const parsed = parseCombinedPlayers(rawPlayerData);
      projections = parsed.projections;
      ranks = parsed.ranks;
    } catch (err) {
      console.error('[Sleeper VBD] Failed to load players.json:', err);
      return;
    }

    // 2. Load stored settings
    const storedConfig = await getStorageItem(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    const storedCollapsed = await getStorageItem(STORAGE_KEYS.OVERLAY_COLLAPSED, false);
    const storedSlot = await getStorageItem(STORAGE_KEYS.MY_SLOT, null);

    config = { ...DEFAULT_CONFIG, ...storedConfig };
    isCollapsed = Boolean(storedCollapsed);
    if (storedSlot) myDraftSlot = Number(storedSlot);

    // 3. Fetch Draft Meta, Settings & Users
    try {
      draftMetadata = await fetchDraft(draftId);
      const autoDetect = await getStorageItem(STORAGE_KEYS.AUTO_DETECT_CONFIG, true);
      if (autoDetect && draftMetadata) {
        config = mapSleeperSettingsToConfig(draftMetadata, config);
        await setStorageItem(STORAGE_KEYS.CONFIG, config);
      }

      try {
        draftUsers = await fetchDraftUsers(draftId);
        if (Array.isArray(draftUsers) && draftMetadata?.draft_order) {
          const userMap = new Map(draftUsers.map((u) => [u.user_id, u]));
          Object.entries(draftMetadata.draft_order).forEach(([userId, slotNum]) => {
            const user = userMap.get(userId);
            const teamName = user?.metadata?.team_name;
            const displayName = user?.display_name || user?.username;
            const label = teamName ? `${displayName} (${teamName})` : displayName;
            if (label) {
              slotLabels[slotNum] = `Slot ${slotNum} — ${label}`;
            }
          });
        }
      } catch (err) {
        console.debug('[Sleeper VBD] Could not fetch draft users:', err);
      }
    } catch (err) {
      console.warn('[Sleeper VBD] Could not fetch draft metadata:', err);
    }

    // 4. Initial Render HUD
    renderHud();

    // 5. Start Pick Polling Loop
    await syncPicks();
    pollInterval = setInterval(syncPicks, 2500);

    // 6. Start DOM badge observer
    startDomObserver(() => vbdResult.players);
  }

  async function syncPicks() {
    if (!draftId) return;

    try {
      const latestPicks = await fetchDraftPicks(draftId);
      if (JSON.stringify(latestPicks) !== JSON.stringify(picks)) {
        picks = latestPicks || [];
        processPicksAndRecalculate();
      }
    } catch (err) {
      console.debug('[Sleeper VBD] Pick poll check:', err.message);
    }
  }

  function processPicksAndRecalculate() {
    draftedPlayers = [];
    myTeamRoster = { qb: [], rb: [], wr: [], te: [], dst: [], k: [] };

    picks.forEach((pick) => {
      const pos = normalizePosition(pick.metadata?.position || '');
      const name = pick.metadata?.player_name ||
        `${pick.metadata?.first_name || ''} ${pick.metadata?.last_name || ''}`.trim();

      const draftedEntry = { name, pos };
      draftedPlayers.push(draftedEntry);

      // Check if this pick belongs to My Team
      const isMyPick =
        (pick.draft_slot && pick.draft_slot === myDraftSlot) ||
        (pick.roster_id && pick.roster_id === myDraftSlot);

      if (isMyPick && pos && myTeamRoster[pos]) {
        myTeamRoster[pos].push(draftedEntry);
      }
    });

    // Run VBD Engine
    vbdResult = calculateVbd(config, draftedPlayers, myTeamRoster, projections, ranks);

    // Update Extension Badge
    try {
      chrome.runtime.sendMessage({
        type: 'DRAFT_STATUS_UPDATE',
        isDraft: true,
        draftId,
        pickCount: draftedPlayers.length,
      });
    } catch (e) {}

    // Update UI
    updateHudContent();
    updateDomBadges(vbdResult.players);
  }

  function renderHud() {
    let root = document.getElementById('vbd-overlay-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'vbd-overlay-root';
      document.body.appendChild(root);
      makeDraggable(root);
    }

    if (isCollapsed) {
      root.classList.add('vbd-collapsed');
    } else {
      root.classList.remove('vbd-collapsed');
    }

    updateHudContent();
  }

  function updateHudContent() {
    const root = document.getElementById('vbd-overlay-root');
    if (!root) return;

    if (isCollapsed) {
      root.innerHTML = `
        <div class="vbd-header" id="vbd-drag-handle">
          <div class="vbd-brand">
            <span class="vbd-logo-badge">VBD</span>
            <span>#${draftedPlayers.length} Picks</span>
          </div>
          <div class="vbd-header-controls">
            <button class="vbd-icon-btn" id="vbd-toggle-expand" title="Expand HUD">🗖</button>
          </div>
        </div>
      `;
      document.getElementById('vbd-toggle-expand')?.addEventListener('click', toggleCollapse);
      return;
    }

    // Available players filtered
    const availablePlayers = (vbdResult.players || []).filter((p) => {
      if (p.drafted) return false;
      if (activeFilter === 'ALL') return true;
      return p.pos === activeFilter.toLowerCase();
    });

    const topAvailable = availablePlayers.slice(0, 12);

    // Calculate total team VBD
    let teamVbdTotal = 0;
    Object.keys(myTeamRoster).forEach((pos) => {
      myTeamRoster[pos].forEach((dp) => {
        const match = (vbdResult.players || []).find((p) => p.pos === pos && p.name === dp.name);
        if (match) teamVbdTotal += match.pointDif || 0;
      });
    });

    const totalPicks = (config.numTeams || 10) * (config.rosterSize || 16);

    root.innerHTML = `
      <div class="vbd-header" id="vbd-drag-handle">
        <div class="vbd-brand">
          <span class="vbd-logo-badge">VBD</span>
          <span>Sleeper Assistant</span>
        </div>
        <div class="vbd-header-controls">
          <button class="vbd-icon-btn" id="vbd-refresh-btn" title="Refresh Picks">⟳</button>
          <button class="vbd-icon-btn" id="vbd-toggle-collapse" title="Collapse HUD">🗕</button>
        </div>
      </div>

      <div class="vbd-status-bar">
        <div class="vbd-live-indicator">
          <span class="vbd-live-dot"></span>
          <span>Draft Connected</span>
        </div>
        <div>Pick ${draftedPlayers.length} / ${totalPicks}</div>
      </div>

      <div class="vbd-tabs">
        <button class="vbd-tab-btn ${activeTab === 'board' ? 'active' : ''}" data-tab="board">Top Value</button>
        <button class="vbd-tab-btn ${activeTab === 'team' ? 'active' : ''}" data-tab="team">My Team</button>
        <button class="vbd-tab-btn ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings">Config</button>
      </div>

      ${
        activeTab === 'board'
          ? `
        <div class="vbd-pos-filters">
          ${['ALL', 'QB', 'RB', 'WR', 'TE', 'DST', 'K']
            .map(
              (f) =>
                `<button class="vbd-filter-pill ${activeFilter === f ? 'active' : ''}" data-filter="${f}">${f}</button>`
            )
            .join('')}
        </div>
        <div class="vbd-body">
          ${
            topAvailable.length === 0
              ? '<div style="text-align:center; padding: 20px; color:#94a3b8;">No players found</div>'
              : topAvailable
                  .map(
                    (p) => `
              <div class="vbd-player-item">
                <div class="vbd-player-info">
                  <div class="vbd-player-name" title="${p.name}">${p.name}</div>
                  <div class="vbd-player-meta">
                    <span class="vbd-pos-tag vbd-pos-${p.pos}">${p.displayPosition || p.pos}</span>
                    <span>T${p.tier}</span>
                    <span>ADP ${p.adp}</span>
                  </div>
                </div>
                <div class="vbd-player-stats">
                  <div class="vbd-diff-val ${p.pointDif >= 0 ? 'positive' : 'negative'}">
                    ${p.pointDif >= 0 ? '+' : ''}${p.pointDif}
                  </div>
                  <div class="vbd-vrank">#${p.vrank} V-Rank</div>
                </div>
              </div>
            `
                  )
                  .join('')
          }
        </div>
      `
          : ''
      }

      ${
        activeTab === 'team'
          ? `
        <div class="vbd-body" style="padding-top: 10px;">
          <div class="vbd-team-summary">
            <div>
              <div style="font-size:10px; color:#94a3b8; font-weight:700;">CLAIM DRAFT SPOT</div>
              <select id="vbd-slot-select" style="background:#1e293b; color:#38bdf8; font-weight:600; border:1px solid #475569; border-radius:4px; padding:3px 6px; font-size:11px; margin-top:3px; max-width:180px;">
                ${Array.from({ length: config.numTeams || 10 }, (_, i) => i + 1)
                  .map(
                    (slot) =>
                      `<option value="${slot}" ${slot === myDraftSlot ? 'selected' : ''}>${slotLabels[slot] || `Spot ${slot} (Team ${slot})`}</option>`
                  )
                  .join('')}
              </select>
            </div>
            <div style="text-align:right;">
              <div style="font-size:10px; color:#94a3b8; font-weight:700;">TEAM VBD SCORE</div>
              <div style="font-size:14px; font-weight:800; color:#34d399; margin-top:2px;">+${teamVbdTotal.toFixed(1)}</div>
            </div>
          </div>

          ${['qb', 'rb', 'wr', 'te', 'dst', 'k']
            .map((pos) => {
              const roster = myTeamRoster[pos] || [];
              return `
                <div class="vbd-team-group">
                  <div class="vbd-team-group-title">${pos.toUpperCase()} (${roster.length})</div>
                  ${
                    roster.length === 0
                      ? '<div style="font-size:11px; color:#64748b; margin-left:6px;">None drafted yet</div>'
                      : roster
                          .map((p) => `<div style="font-size:11px; color:#e2e8f0; margin-left:6px;">• ${p.name}</div>`)
                          .join('')
                  }
                </div>
              `;
            })
            .join('')}
        </div>
      `
          : ''
      }

      ${
        activeTab === 'settings'
          ? `
        <div class="vbd-body" style="padding-top: 10px;">
          <div style="font-size:11px; color:#94a3b8; margin-bottom:8px;">
            Adjust roster assumptions and positional valuation buffs.
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span>Teams: <b>${config.numTeams}</b></span>
            <span>Roster: <b>${config.rosterSize}</b></span>
            <span>Format: <b>${config.thirdRoundReversal ? '3RR' : 'Snake'}</b></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:6px 10px; border-radius:6px; margin-bottom:8px;">
            <span style="font-size:11px; color:#cbd5e1;">Third Round Reversal (3RR)</span>
            <button class="vbd-3rr-toggle" style="background:${config.thirdRoundReversal ? '#0284c7' : '#334155'}; color:#fff; border:none; border-radius:4px; padding:3px 8px; font-size:10px; font-weight:700; cursor:pointer;">
              ${config.thirdRoundReversal ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div style="font-size:11px; font-weight:700; color:#cbd5e1; margin-top:10px; margin-bottom:6px;">POSITION MULTIPLIERS</div>
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
            ${['qb', 'rb', 'wr', 'te', 'dst', 'k']
              .map(
                (pos) => `
              <div style="background:#1e293b; padding:6px; border-radius:6px; text-align:center;">
                <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">${pos}</div>
                <div style="font-size:12px; font-weight:700; color:#38bdf8;">${((config.buffPercentages?.[pos] || 1) * 100).toFixed(0)}%</div>
                <div style="display:flex; gap:2px; justify-content:center; margin-top:4px;">
                  <button class="vbd-buff-btn" data-action="nerf" data-pos="${pos}" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:1px 6px; cursor:pointer;">-</button>
                  <button class="vbd-buff-btn" data-action="buff" data-pos="${pos}" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:1px 6px; cursor:pointer;">+</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <div class="vbd-footer">
        <a class="vbd-open-site-btn" id="vbd-open-site" target="_blank" href="https://taylerjtodd.github.io/vbdboard/?sleeper_draft_id=${draftId}&my_slot=${myDraftSlot}">
          Open Full Standalone Board ↗
        </a>
      </div>
    `;

    // Reattach event listeners
    document.getElementById('vbd-toggle-collapse')?.addEventListener('click', toggleCollapse);
    document.getElementById('vbd-refresh-btn')?.addEventListener('click', () => {
      syncPicks();
    });

    root.querySelectorAll('.vbd-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        activeTab = e.currentTarget.dataset.tab;
        updateHudContent();
      });
    });

    root.querySelectorAll('.vbd-filter-pill').forEach((pill) => {
      pill.addEventListener('click', (e) => {
        activeFilter = e.currentTarget.dataset.filter;
        updateHudContent();
      });
    });

    document.getElementById('vbd-slot-select')?.addEventListener('change', async (e) => {
      myDraftSlot = Number(e.target.value);
      await setStorageItem(STORAGE_KEYS.MY_SLOT, myDraftSlot);
      processPicksAndRecalculate();
    });

    root.querySelector('.vbd-3rr-toggle')?.addEventListener('click', async () => {
      config = {
        ...config,
        thirdRoundReversal: !config.thirdRoundReversal,
      };
      await setStorageItem(STORAGE_KEYS.CONFIG, config);
      processPicksAndRecalculate();
    });

    root.querySelectorAll('.vbd-buff-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const action = e.currentTarget.dataset.action;
        const pos = e.currentTarget.dataset.pos;
        const current = config.buffPercentages?.[pos] || 1.0;
        const next = action === 'buff' ? current + 0.25 : Math.max(0, current - 0.25);
        config = {
          ...config,
          buffPercentages: {
            ...config.buffPercentages,
            [pos]: next,
          },
        };
        await setStorageItem(STORAGE_KEYS.CONFIG, config);
        processPicksAndRecalculate();
      });
    });
  }

  async function toggleCollapse() {
    isCollapsed = !isCollapsed;
    await setStorageItem(STORAGE_KEYS.OVERLAY_COLLAPSED, isCollapsed);
    renderHud();
  }

  function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    element.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('#vbd-drag-handle');
      if (!handle || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      // Switch from right-relative to left-relative positioning
      element.style.right = 'auto';
      element.style.left = `${initialLeft}px`;
      element.style.top = `${initialTop}px`;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = `${Math.max(10, Math.min(window.innerWidth - element.offsetWidth - 10, initialLeft + dx))}px`;
      element.style.top = `${Math.max(10, Math.min(window.innerHeight - element.offsetHeight - 10, initialTop + dy))}px`;
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }

  // Start extension
  initDraftAssistant();
})();
