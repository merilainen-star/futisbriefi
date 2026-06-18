# Futisbriefi — MM 2026 -vedonlyöntibriefi

Daily FIFA World Cup 2026 betting / exact-score briefing. Scrapes lineups & injuries
(FotMob) and 1X2 odds, normalizes the market, compares it to my prediction-game
picks, and recaps results. **User-facing output is Finnish; code is English.**

> Personal analysis tool. It generates analysis — it does **not** place bets.

## Status — Phase 1 complete (local slice)

A full slice runs end-to-end **locally, offline, with no secrets**:

- ✅ Monorepo (npm workspaces): `core` (domain), `backend` (data + briefing), `web` (PWA)
- ✅ Domain logic with tests: UTC↔Helsinki (no double-conversion), 18:00 briefing window,
  implied-probability normalizer, FIFA home-away formatting, pick recommendation + scoring
- ✅ Odds: `OddsProvider` interface, The Odds API provider + a secret-free mock
- ✅ FotMob: live JSON client + Playwright fallback + offline fixture client
- ✅ Storage: SQLite via Node's built-in `node:sqlite` (no native build)
- ✅ Briefing builder → `briefing.json` → mobile-first PWA (decision table + cards + recap)
- **50 tests passing, lint clean, all packages type-check.**

Does **not** yet include: the live 24h multi-source pipeline wired to real keys, the
18:00 scheduler, and Web Push — that's Phase 2 (see roadmap).

## Toolchain note (this machine)

Node was not installed, so a **portable Node 24 LTS** lives at
`C:\antigravity\_tools\node-v24.17.0-win-x64` and was added to the user PATH. New
terminals pick it up automatically. If a shell can't find `node`, prepend it:

```powershell
$env:Path = "C:\antigravity\_tools\node-v24.17.0-win-x64;$env:Path"
```

## Quick start

```bash
npm install
npm test                       # 50 tests
npm -w @fm2026/backend run seed       # sample matches/picks/results → SQLite
npm -w @fm2026/backend run briefing   # build briefing.json for the PWA
npm run dev:web                # open the PWA (Vite dev server)
```

Smoke CLIs:

```bash
npm -w @fm2026/backend run odds              # mock odds + normalized probabilities
npm -w @fm2026/backend run fotmob            # offline FotMob sample (lineups + injuries)
npm -w @fm2026/backend run fotmob -- 4193843 # live FotMob JSON for a match id
```

## Configuration

Copy `.env.example` → `.env` (never committed). Key vars:

| Var | Default | Notes |
| --- | --- | --- |
| `ODDS_PROVIDER` | `mock` | `theoddsapi` to use a real key |
| `ODDS_API_KEY` | – | from the-odds-api.com (free tier) |
| `FOTMOB_CLIENT` | `json` | `playwright` fallback if FotMob re-locks |
| `APP_TZ` | `Europe/Helsinki` | display + scheduling tz |
| `DB_PATH` | `./data/fm2026.db` | local SQLite |

## Architecture & key decisions

- **Backend produces a `briefing.json` artifact; the PWA is static.** So nothing needs
  to stay on — Phase 2 runs the backend on a schedule (GitHub Actions recommended) and
  serves the PWA from a static host. See the hosting discussion in the project notes.
- **Timezone:** store UTC, convert to Helsinki only at display (Luxon in `core`, `Intl`
  in `web`). The whole tournament is EEST (UTC+3) — 18:00 Helsinki = 15:00 UTC, fixed,
  no DST. A unit test proves no double-conversion.
- **FIFA home-away order, always** (`CIV–ECU 0–1`, never flipped). Enforced in the
  formatting helpers and the picks parser (en-dash team separator so `Guinea-Bissau`
  survives).
- **FotMob:** the public API moved to `https://www.fotmob.com/api/data/*` and currently
  needs no auth header (it had required `x-mas`, then `x-fm-req`). The JSON client sends a
  realistic UA and passes an optional token through; Playwright is the resilient fallback.
- **SQLite:** Node's built-in `node:sqlite` avoids a native build; loaded via
  `createRequire` so Vite/Vitest doesn't try to bundle it.

## Packages

```
packages/core      domain types, time/window, implied prob, FIFA formatting, recommend
packages/backend   odds providers, FotMob clients, SQLite store, briefing builder, CLIs
packages/web       Vite + React PWA (decision table, match cards, results recap)
```

## Phase 2 roadmap

1. Wire the live pipeline: fetch real fixtures (FotMob by date) → match to odds → enrich.
2. Schedule the 18:00 Europe/Helsinki run (GitHub Actions cron `0 15 * * *` UTC).
3. Publish `briefing.json` + PWA to a static host.
4. Pick editing in the PWA; odds-movement history.
5. Optional Web Push (VAPID) at 18:00.
