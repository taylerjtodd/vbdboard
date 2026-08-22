# Chrome Web Store Listing: Sleeper VBD Draft Assistant

*Last Updated: 2026-08-22*

---

## 1. Store Metadata

- **Extension Name**: Sleeper VBD Draft Assistant
- **Version**: `1.0.0`
- **Category**: Sports / Productivity / Utilities
- **Default Language**: English
- **Website URL**: `https://github.com/taylerjtodd/vbdboard`
- **Support Contact**: `https://github.com/taylerjtodd/vbdboard/issues`

---

## 2. Store Listing Copy

### Single-Sentence Summary
Real-time Value-Based Drafting (VBD) overlay and pick tracker for Sleeper fantasy football drafts.

### Short Description (Up to 132 characters)
Track live Sleeper drafts, calculate real-time Value-Based Drafting rankings, and overlay actionable player insights on your draft room.

### Detailed Description
Dominate your fantasy football draft on Sleeper with real-time Value-Based Drafting (VBD) calculations directly in your browser.

The **Sleeper VBD Draft Assistant** seamlessly integrates with active Sleeper draft rooms to stream pick selections, recalculate positional baselines on the fly, and display customized value rankings so you never miss a value pick or reach unnecessarily.

#### Key Features:
- **Live Sleeper Sync**: Automatically detects active Sleeper draft rooms and streams picks in real-time.
- **Dynamic VBD Engine**: Calculates value above replacement (VORP / VBD) dynamically based on remaining player pool and roster construction.
- **HUD Overlay**: Collapsible, draggable in-page HUD showing top value available players, positional need, and team accumulation.
- **Inline Badges**: Subtle, color-coded VBD value badges injected next to player names on Sleeper draft cards and tables.
- **My Team Tracker**: Automatically isolates your drafted players, tracking total team VBD differential.
- **Customizable Multipliers**: Adjust positional buffs/nerfs (QB, RB, WR, TE, DST, K) and baseline pick ranges to match your league scoring.
- **Standalone Board Integration**: One-click quick link to open your full draft board on the standalone web application.

---

## 3. Permissions Justification

| Permission / Host | Justification |
|---|---|
| `storage` | Required to save user preferences, custom roster sizes, baseline thresholds, positional buffs/nerfs, and HUD collapsed/position states locally in the browser. |
| `alarms` | Required to manage periodic background polling schedules without running persistent background CPU loops. |
| `https://api.sleeper.app/*` | Required to query Sleeper's public REST API to retrieve draft metadata, team rosters, and real-time pick progress for active drafts. |
| `https://sleeper.com/*`, `https://*.sleeper.com/*`, `https://sleeper.app/*`, `https://*.sleeper.app/*` | Required to inject the content script overlay and DOM badges on Sleeper draft room web pages. |

---

## 4. Privacy & Data Use Disclosures

- **Data Collection**: No personal information, browsing history, or authentication credentials are collected, stored, or transmitted to any third-party servers.
- **Network Requests**: The extension only makes read requests to Sleeper's public unauthenticated REST API (`api.sleeper.app`) to fetch public draft information.
- **Local Storage**: All draft configurations and player rankings remain strictly in the user's local browser storage.

---

## 5. Version History

- **v1.0.0** (*2026-08-22*)
  - Initial release.
  - Manifest V3 implementation with real-time Sleeper API pick sync.
  - Injected glassmorphic HUD overlay and inline player badges.
  - Standalone VBD engine with dynamic baseline recalculation.
  - Deep-link sync with standalone Next.js VBD board.
