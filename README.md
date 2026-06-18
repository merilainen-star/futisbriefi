# Futisbriefi — MM 2026 -vedonlyöntibriefi

Daily FIFA World Cup 2026 betting / exact-score briefing. Pulls lineups & injuries
(FotMob) and 1X2 + over/under odds (The Odds API), normalizes the market, predicts
the exact score, and renders it as a mobile PWA. **User-facing output is Finnish;
code is English.**

**🔴 Live:** https://merilainen-star.github.io/futisbriefi/ — rebuilt daily at 18:00
Europe/Helsinki by a GitHub Action.

> Personal analysis tool. It generates analysis — it does **not** place bets.

## Status — live in production

- ✅ Monorepo (npm workspaces): `core` (domain), `backend` (data + briefing), `web` (PWA)
- ✅ Domain logic with tests: UTC↔Helsinki (no double-conversion), 18:00 briefing window,
  implied-probability normalizer, FIFA home-away formatting
- ✅ **Exact-score prediction** — Poisson model solved from market supremacy + total
  goals (over/under), returns the most likely score + alternatives + expected goals
- ✅ Odds: The Odds API (1X2 + totals) behind an `OddsProvider` interface + a mock
- ✅ FotMob: live JSON client (`/api/data/*`) + Playwright fallback + offline fixture
- ✅ Storage: SQLite via Node's built-in `node:sqlite` (no native build)
- ✅ **Live pipeline:** FotMob WC fixtures → odds match (cross-source name aliases) →
  lineups/injuries → exact-score prediction → `briefing.json`
- ✅ Mobile-first PWA: decision table (with **Ennuste** column), per-match cards, recap
- ✅ **Deployed:** GitHub Actions builds the briefing daily at 18:00 Helsinki and
  publishes the PWA to GitHub Pages (`ODDS_API_KEY` is a repo secret)
- **59 tests passing, CI green, all packages type-check.**

Direct market + team-news analysis (no stored picks). Optional Web Push at 18:00 is the
remaining nice-to-have.

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
npm test                                   # 59 tests
npm -w @fm2026/backend run briefing -- demo   # offline sample briefing (no secrets)
npm -w @fm2026/backend run briefing -- live   # real WC fixtures + odds (needs .env key)
npm run dev:web                            # open the PWA (Vite dev server)
```

With `ODDS_PROVIDER=theoddsapi` in `.env`, plain `run briefing` defaults to live.

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

## Deployment

- **`.github/workflows/deploy.yml`** — cron `0 15 * * *` UTC (= 18:00 Helsinki, fixed
  during the World Cup) + manual dispatch + push. Runs the live briefing
  (`ODDS_API_KEY` from the repo secret), builds the PWA with the Pages base path, and
  deploys to GitHub Pages.
- **`.github/workflows/ci.yml`** — lint + tests + type-check on push/PR.
- Secret: `ODDS_API_KEY` (repo → Settings → Secrets → Actions). Pages source: GitHub Actions.

## Remaining nice-to-haves

1. Odds-movement history (snapshots are already stored per run).
2. Cross-check confirmed XIs ~1h before kickoff.
3. Optional Web Push (VAPID) at 18:00 when the briefing is ready.
4. Dixon–Coles draw correction for the score model.
