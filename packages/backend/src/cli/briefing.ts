import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { briefingWindow, type BriefingDoc } from '@fm2026/core';
import { loadConfig } from '../config.js';
import { buildBriefing } from '../briefing/build.js';
import { createFotMobClient, createOfflineFotMobClient } from '../fotmob/index.js';
import { createOddsProvider } from '../odds/index.js';
import { MockOddsProvider } from '../odds/mock.js';
import { syncWorldCupFixtures } from '../live/syncFixtures.js';
import { seedSampleData } from '../store/seed.js';
import { Store } from '../store/store.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = resolve(repoRoot, 'packages', 'web', 'public', 'briefing.json');

/**
 * Build the briefing document and write it where the PWA reads it.
 *
 *   demo (default when ODDS_PROVIDER=mock): seed sample data, mock odds, offline
 *         FotMob, fixed "now" — deterministic, no network, no secrets.
 *   live (default when ODDS_PROVIDER=theoddsapi): real now → sync World Cup
 *         fixtures from FotMob → real odds → live lineups/injuries.
 *
 * Force a mode with `... -- live` or `... -- demo`.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const args = process.argv.slice(2);
  const mode = args.includes('demo')
    ? 'demo'
    : args.includes('live')
      ? 'live'
      : config.odds.provider === 'theoddsapi'
        ? 'live'
        : 'demo';

  // Demo runs in a throwaway in-memory DB so its sample data never pollutes the
  // live store; live uses the configured persistent DB.
  const store = new Store(mode === 'demo' ? ':memory:' : config.dbPath);
  let doc: BriefingDoc;

  if (mode === 'demo') {
    seedSampleData(store);
    const isoArg = args.find((a) => /^\d{4}-\d{2}-\d{2}T/.test(a));
    const now = isoArg ? new Date(isoArg) : new Date('2026-06-18T15:00:00.000Z');
    doc = await buildBriefing({
      store,
      odds: new MockOddsProvider(),
      fotmob: createOfflineFotMobClient(),
      now,
      tz: config.appTz,
    });
  } else {
    // Optional ISO "now" override (testing); otherwise the real current time.
    const isoArg = args.find((a) => /^\d{4}-\d{2}-\d{2}T/.test(a));
    const now = isoArg ? new Date(isoArg) : new Date();
    const fotmob = createFotMobClient(config);
    const window = briefingWindow(now, config.appTz);
    const synced = await syncWorldCupFixtures(store, fotmob, window);
    console.log(`Live: synced ${synced.length} World Cup fixture(s) in window from FotMob.`);
    doc = await buildBriefing({
      store,
      odds: createOddsProvider(config),
      fotmob,
      now,
      tz: config.appTz,
      matches: synced, // only brief freshly-synced fixtures
    });
  }

  store.saveBriefing({ date: doc.date, items: [], createdAt: doc.generatedAtUtc });
  store.close();

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(doc, null, 2), 'utf8');

  console.log(`\n[${mode}] wrote briefing for ${doc.date} → ${OUT}`);
  console.log(`  ${doc.cards.length} cards, ${doc.recap.length} recap item(s)\n`);
  for (const c of doc.cards) {
    const pred = c.prediction ? `ennuste ${c.prediction.homeGoals}–${c.prediction.awayGoals}` : '';
    console.log(`  • ${c.homeTeam}–${c.awayTeam}  ${pred}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
