# Implementation Plan - Convert VBD Board to Next.js Web Application

Transform the current legacy VBD Board (`index.html`, `app.js`, `model.js`, `DataLoad.js`) into a modern, static-exportable Next.js web application residing in a dedicated `/site` subfolder. The scraper (`fp_scraper/`) and data directories will remain external to the web build at the workspace root.

## User Review Required

> [!IMPORTANT]
> **Project Restructuring & Legacy Clean-up**:
> - The web application source will now live inside `file:///Users/Tayler/workspace/vbdboard/site`.
> - The root web files (`index.html`, `app.js`, `model.js`, `DataLoad.js`, `app.css`) will be removed/replaced by the Next.js app in `/site`.
> - GitHub Pages deployment will target the static export generated from `/site` (`site/out`).

> [!NOTE]
> **Data Loading**:
> Per the specification, existing hardcoded rank and projection data will be ported to `/site/src/data/initialData.ts` for this phase. Connecting the scraper outputs to the Next.js site will be handled in a follow-up task.

## Open Questions

1. **Styling & Design System**: Should we use Next.js with Tailwind CSS and Lucide icons for clean, modern aesthetic components, dark mode support, and micro-interactions? *(Proposed default: Yes)*
2. **GitHub Pages Base Path**: If the site is deployed to `username.github.io/vbdboard`, a `basePath: '/vbdboard'` can be configured in `next.config.mjs`. Is the repository hosted at root domain or repository path?

---

## Proposed Changes

### Web Application (`/site`)

Create a Next.js application (App Router, TypeScript, Tailwind CSS) configured for static HTML output (`output: 'export'`).

#### [NEW] [next.config.mjs](file:///Users/Tayler/workspace/vbdboard/site/next.config.mjs)
- Configure static export (`output: 'export'`), disable server images (`images: { unoptimized: true }`).

#### [NEW] [package.json](file:///Users/Tayler/workspace/vbdboard/site/package.json)
- Define Next.js 14+/15+, React, TypeScript, Tailwind CSS, and Lucide React icon dependencies.

#### [NEW] [src/types/vbd.ts](file:///Users/Tayler/workspace/vbdboard/site/src/types/vbd.ts)
- Define TypeScript interfaces for `Player`, `Projection`, `Rank`, `RosterConfig`, `DraftedPlayer`, `TeamRoster`, and `PositionFilter`.

#### [NEW] [src/data/initialData.ts](file:///Users/Tayler/workspace/vbdboard/site/src/data/initialData.ts)
- Port the current datasets from `DataLoad.js` into typed JavaScript constants (`INITIAL_PROJECTIONS`, `INITIAL_RANKS`).

#### [NEW] [src/lib/vbdEngine.ts](file:///Users/Tayler/workspace/vbdboard/site/src/lib/vbdEngine.ts)
- Implement VBD calculations:
  - `determineBaseline(pos, players, config, draftedCount)`
  - `insertPointDif(players, baseline)`
  - `sortByValue(players, config, team)`
  - Roster requirement & positional need factor math.
  - ADP warning indicators.

#### [NEW] [src/lib/storage.ts](file:///Users/Tayler/workspace/vbdboard/site/src/lib/storage.ts)
- SSR-safe `localStorage` helper functions for persisting `config`, `draftedPlayers`, `team`, and `filters`.

#### [NEW] [src/components/Navbar.tsx](file:///Users/Tayler/workspace/vbdboard/site/src/components/Navbar.tsx)
- Responsive header navigation bar supporting view switching:
  - **Draft Board**
  - **My Team**
  - **Draft Grid (All Teams)**
  - **Setup & Buffs**
  - Reset controls & quick stats.

#### [NEW] [src/components/DraftBoard.tsx](file:///Users/Tayler/workspace/vbdboard/site/src/components/DraftBoard.tsx)
- Interactive table view with:
  - Position filter toggle pills (All, QB, RB, WR, TE, K, DST).
  - Search bar for quick player lookup.
  - VORP, ADP, display position, tier formatting.
  - Quick action buttons ("Draft for Me", "Draft for Other", "Undo").
  - ADP warning badges for undrafted reach indicators.

#### [NEW] [src/components/MyTeam.tsx](file:///Users/Tayler/workspace/vbdboard/site/src/components/MyTeam.tsx)
- Summary table of user's drafted roster grouped by position with total VORP and roster position metrics.

#### [NEW] [src/components/DraftGrid.tsx](file:///Users/Tayler/workspace/vbdboard/site/src/components/DraftGrid.tsx)
- Snake draft grid visualizer rendering picks round-by-round across all teams in the league.

#### [NEW] [src/components/SetupConfig.tsx](file:///Users/Tayler/workspace/vbdboard/site/src/components/SetupConfig.tsx)
- Settings panel for customizing:
  - Number of teams.
  - Roster starter counts.
  - Baseline range sliders.
  - Position buff/nerf (+25% / -25%) controls.

#### [NEW] [src/app/page.tsx](file:///Users/Tayler/workspace/vbdboard/site/src/app/page.tsx)
- Main application page binding VBD state, active tab management, and client-side storage hydration.

#### [NEW] [src/app/layout.tsx](file:///Users/Tayler/workspace/vbdboard/site/src/app/layout.tsx)
- Root layout with font configuration, HTML metadata, and global CSS imports.

---

### Legacy Root Files

#### [DELETE] [index.html](file:///Users/Tayler/workspace/vbdboard/index.html)
#### [DELETE] [app.js](file:///Users/Tayler/workspace/vbdboard/app.js)
#### [DELETE] [model.js](file:///Users/Tayler/workspace/vbdboard/model.js)
#### [DELETE] [DataLoad.js](file:///Users/Tayler/workspace/vbdboard/DataLoad.js)
#### [DELETE] [app.css](file:///Users/Tayler/workspace/vbdboard/app.css)

---

## Verification Plan

### Automated Tests & Builds
- Run Next.js build & static export:
  ```bash
  cd site && npm run build
  ```
  Verify that static HTML files generate cleanly in `site/out/`.

### Manual Verification
- Test all core workflows in dev server (`npm run dev` in `site/`):
  1. **Draft Board**: Verify player list sorting by VORP, filtering by position pills, search input.
  2. **Drafting Flow**: Mark players as drafted (My Team vs Other), check that undraft/reorder works and state updates instantly.
  3. **My Team**: Confirm drafted players appear on My Team page with correct positional breakdown.
  4. **Draft Grid**: Confirm snake draft matrix correctly assigns picks to rounds and teams.
  5. **Setup & Buffs**: Test modifying team count, starter numbers, and position buffs; ensure VORP rankings recalculate dynamically.
  6. **Persistence**: Reload browser page and ensure state is preserved in `localStorage`.
