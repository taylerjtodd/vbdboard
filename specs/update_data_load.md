# Implementation Plan - Replace Hardcoded Data with Scraped Data

Update the Next.js application to load player projection and ranking data from a combined JSON file bundled with the site, rather than hardcoded arrays in `initialData.ts`.

---

## Overview

The pipeline has two stages:

1. **Data preparation** (run after each scrape): A script combines `data/projections.json` and `data/ranks.json` into a single `site/public/players.json` file.
2. **App initialization** (runtime): The Next.js app fetches `players.json` on load and hydrates the application state.

---

## Stage 1: Data Combine Script

### [NEW] `scripts/combine_data.mjs`

A lightweight Node.js script (no dependencies) that:
- Reads `data/projections.json` and `data/ranks.json` from the repo root
- Iterates `ranks.json` as the primary list, looks up each player in `projections.json` by name
- Writes only matched players to `site/public/players.json`
- Logs any ranked player that has no matching projection to stdout

#### Output shape (`site/public/players.json`)

Each entry merges both sources — only players present in **both** files are included:

```json
[
  {
    "name": "Josh Allen",
    "position": "QB",
    "points": 372.1,
    "rank": 1,
    "tier": 1,
    "adp": 0
  }
]
```

#### Key join logic
- **Primary key**: `name` field, normalized to lowercase + trimmed for matching
- **Source of truth for roster**: `ranks.json` — iterate ranks, look up each player in a projection map
- **Dropped silently**: players in `projections.json` with no matching rank entry
- **Logged to stdout**: players in `ranks.json` with no matching projection entry
- **Merged fields**: `position` + `points` from projections; `rank`, `tier`, `adp`, `pos` from ranks

#### Usage
```bash
node scripts/combine_data.mjs
```

Run this after every scrape to refresh `site/public/players.json`.

---

## Stage 2: App Initialization

### [MODIFY] `site/src/data/initialData.ts`

- Remove all hardcoded player arrays
- Export a `loadPlayerData()` async function that `fetch()`es `/players.json` at runtime
- Returns typed `{ projections, ranks }` arrays shaped to match existing `Player`/`Projection` interfaces
- Includes a graceful fallback (empty arrays + console warning) if the fetch fails

```typescript
export async function loadPlayerData(): Promise<{
  projections: Projection[];
  ranks: Rank[];
}> {
  try {
    const res = await fetch('/players.json');
    if (!res.ok) throw new Error(`Failed to load player data: ${res.status}`);
    const players: CombinedPlayer[] = await res.json();
    // map to Projection[] and Rank[] shapes...
    return { projections, ranks };
  } catch (err) {
    console.warn('Could not load players.json, using empty dataset.', err);
    return { projections: [], ranks: [] };
  }
}
```

### [MODIFY] `site/src/app/page.tsx`

- Call `loadPlayerData()` during initial render (via `useEffect` on mount)
- Store result in state so the rest of the app can consume it
- Show a loading indicator while the fetch is in flight
- Handle the empty-data fallback gracefully (e.g. empty board, no crash)

---

## Open Questions

1. **Server component vs. client fetch**: Since this is a static export (`output: 'export'`), a server component `fetch` would be inlined at build time — meaning data only updates when you rebuild the site. Is that acceptable, or do we want a client-side fetch so data can update without a rebuild?

2. **Refresh flow**: Should the user ever be able to trigger a data refresh from within the running app (without rebuilding)? If yes, the client-side `fetch` approach is required.

3. **Script placement**: `scripts/` at the repo root is proposed. Alternatively it could live in `fp_scraper/` alongside the scraper. Where does it feel most natural?

---

## Verification Plan

### After running the combine script
```bash
node scripts/combine_data.mjs
# Verify output exists and is valid JSON
cat site/public/players.json | python3 -m json.tool | head -30
```

### After app changes
```bash
cd site && npm run dev
# Open app in browser, confirm player data loads without error
```

```bash
cd site && npm run build
# Confirm static export succeeds with no TypeScript errors
```
