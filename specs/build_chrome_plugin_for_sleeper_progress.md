# Sleeper Live Draft VBD Chrome Extension Implementation Plan

A Manifest V3 Chrome Extension that tracks live Sleeper fantasy drafts, automatically ingests picks in real-time, calculates Value-Based Drafting (VBD) rankings and positional baselines on the fly, and overlays actionable drafting insights directly on top of the Sleeper draft room UI while preserving the standalone Next.js site as a fallback.

---

## User Review Required

> [!IMPORTANT]
> **Data Synchronization Strategy**: 
> The extension needs projection & ranking data (`players.json`). We plan to package the generated `players.json` into the extension bundle as the default dataset, with an option in the extension popup to fetch the latest data from the hosted VBD site or upload custom projections.

> [!IMPORTANT]
> **Sleeper API Ingestion**:
> Sleeper provides public unauthenticated endpoints:
> - `GET https://api.sleeper.app/v1/draft/<draft_id>` (draft settings, slots, user mapping)
> - `GET https://api.sleeper.app/v1/draft/<draft_id>/picks` (all drafted picks chronologically)
>
> The extension will extract `<draft_id>` directly from the URL (`sleeper.com/draft/nfl/<draft_id>`), poll Sleeper's picks endpoint periodically (e.g. every 2–3s during active drafts), and use a `MutationObserver` on the DOM for immediate UI updates.

---

## Open Questions

> [!NOTE]
> 1. **My Team Identification**: In Sleeper drafts, users are authenticated or assigned to a specific draft slot. Should the extension auto-detect the user's team from Sleeper's user ID / draft slot, or allow the user to select their team slot from a dropdown overlay? *(Plan proposes auto-detection with a manual override dropdown).*
> 2. **Overlay UI Style**: Should the overlay be a sleek floating collapsible drawer on the right/left of the Sleeper draft room, or inline badges directly on Sleeper's player list/board, or both? *(Plan proposes both: an inline VBD badge on player rows + a collapsible high-level HUD widget).*

---

## Proposed Changes

### Extension Architecture & Structure

We will create a new directory `extension/` at the repository root containing the Manifest V3 extension with clean modular code.

```
extension/
├── manifest.json
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   ├── content.js          # Injected into sleeper.com/draft/*
│   ├── overlay.css         # Styling for floating HUD & badges
│   └── domObserver.js      # Sleeper DOM watchers
├── background/
│   └── service-worker.js   # Extension lifecycle & alarm handlers
├── lib/
│   ├── sleeperApi.js       # Sleeper REST client
│   ├── vbdCore.js          # Shared VBD calculation engine (adapted from site/src/lib/vbdEngine.ts)
│   ├── nameMatcher.js      # Normalizes player names across Sleeper and projections
│   └── storage.js          # Chrome storage helper
└── data/
    └── players.json        # Bundled player database
```

---

### Shared Engine & Matcher

#### [NEW] [vbdCore.js](file:///Users/Tayler/workspace/vbdboard/extension/lib/vbdCore.js)
- Standalone ES module implementing the core VBD math (`calculateVbd`, `determineBaseline`, `recalculateConfigBounds`, buff/nerf scaling) from `site/src/lib/vbdEngine.ts`.
- Pure functions runnable in browser extension contexts without Node or React dependencies.

#### [NEW] [nameMatcher.js](file:///Users/Tayler/workspace/vbdboard/extension/lib/nameMatcher.js)
- Fuzzy and normalized string matching to bridge Sleeper player names/positions (e.g., "Kenneth Walker III", "Patrick Mahomes II", DST names like "San Francisco 49ers" vs "49ers D/ST") to VBD projection records.

#### [NEW] [sleeperApi.js](file:///Users/Tayler/workspace/vbdboard/extension/lib/sleeperApi.js)
- Fetches draft metadata and picks from `https://api.sleeper.app/v1/draft/<draft_id>`.
- Converts Sleeper pick payloads into `DraftedPlayer` arrays compatible with `vbdCore.js`.
- Detects draft settings (e.g. number of teams, roster positions) to auto-configure `RosterConfig`.

---

### Content Script & Sleeper UI Overlay

#### [NEW] [content.js](file:///Users/Tayler/workspace/vbdboard/extension/content/content.js)
- Detects the current Sleeper draft ID from `window.location.pathname`.
- Initiates draft polling / listening.
- Calculates live VBD state on every pick change.
- Injects and renders the VBD HUD widget.
- Updates player table items in Sleeper with VBD Value & Positional Rank badges.

#### [NEW] [overlay.css](file:///Users/Tayler/workspace/vbdboard/extension/content/overlay.css)
- Glassmorphism dark-mode UI styled to seamlessly integrate with Sleeper's dark theme.
- Collapsible floating HUD widget containing:
  - Top 10 Best Available Players by VBD Value
  - Positional Need / Scarcity breakdown
  - "My Team" current roster + total VBD accumulated
  - Direct "Open in Full VBD Board" quick-launch button
- Non-intrusive inline badges (`.vbd-tag`, `.vbd-value-pos`, `.vbd-value-neg`) on Sleeper player rows.

---

### Popup & Settings

#### [NEW] [popup.html](file:///Users/Tayler/workspace/vbdboard/extension/popup/popup.html) & [popup.js](file:///Users/Tayler/workspace/vbdboard/extension/popup/popup.js)
- Quick status check (Draft connected vs No draft detected).
- Roster slot configuration and baseline slider adjustments.
- Buff/Nerf position multipliers.
- Sync bridge: Export draft state or open the standalone VBD Next.js site pre-populated with current picks.

---

### Web App Integration & Fallback Support

#### [MODIFY] [page.tsx](file:///Users/Tayler/workspace/vbdboard/site/src/app/page.tsx)
- Add support for URL query parameter / state sync (e.g., `?sleeper_draft_id=<id>`) so users navigating from the extension to the web app have their draft picks automatically loaded and tracked on the full site.

#### [NEW] [generate_icons.mjs](file:///Users/Tayler/workspace/vbdboard/scripts/generate_icons.mjs)
- Node script using Canvas / SVG to generate pixel-accurate PNG icons (16x16, 48x48, 128x128) into `extension/icons/`.

#### [NEW] [CHROMEWEBSTORE.md](file:///Users/Tayler/workspace/vbdboard/CHROMEWEBSTORE.md)
- Store listing copy, permissions justifications, and privacy disclosures adhering to the Chrome Web Store guidelines.

---

## Verification Plan

### Automated Tests
- Test Sleeper API response parsing & player name matching logic against mock draft data.
- Unit test VBD calculation parity between `site/src/lib/vbdEngine.ts` and `extension/lib/vbdCore.js`.

### Manual Verification
1. Load unpacked extension in Chrome (`chrome://extensions`).
2. Navigate to an active or completed Sleeper draft room URL (`https://sleeper.com/draft/nfl/<draft_id>`).
3. Verify:
   - Draft ID is detected automatically.
   - Picks are fetched and synced in real-time.
   - Overlay HUD displays correct Top Available VBD rankings.
   - Badges appear cleanly on player lists without breaking Sleeper's click events.
   - "Open in VBD Site" opens `localhost:3000` (or production URL) with matching draft state.
