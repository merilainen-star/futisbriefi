import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.js';
import { buildBriefing } from '../briefing/build.js';
import { createOfflineFotMobClient } from '../fotmob/index.js';
import { MockOddsProvider } from '../odds/mock.js';
import { seedSampleData } from '../store/seed.js';
import { Store } from '../store/store.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = resolve(repoRoot, 'packages', 'web', 'public', 'briefing.json');

/**
 * Phase 1 demo: build the briefing document from sample data and write it where
 * the PWA reads it. Uses the mock odds provider and the OFFLINE FotMob client so
 * it runs deterministically with no network and no secrets.
 *
 * "now" is fixed to 2026-06-18 18:00 Helsinki so the seeded World Cup window has
 * matches. Override with the first CLI arg (ISO instant) to experiment.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const store = new Store(config.dbPath);
  seedSampleData(store);

  const nowArg = process.argv[2];
  const now = nowArg ? new Date(nowArg) : new Date('2026-06-18T15:00:00.000Z');

  const doc = await buildBriefing({
    store,
    odds: new MockOddsProvider(),
    fotmob: createOfflineFotMobClient(),
    now,
    tz: config.appTz,
  });

  store.saveBriefing({ date: doc.date, items: [], createdAt: doc.generatedAtUtc });
  store.close();

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(doc, null, 2), 'utf8');

  console.log(`Wrote briefing for ${doc.date} → ${OUT}`);
  console.log(`  ${doc.cards.length} cards, ${doc.recap.length} recap item(s)\n`);
  for (const c of doc.cards) {
    const fav = c.marketFavorite
      ? ` [suosikki ${c.marketFavorite.outcome} ${(c.marketFavorite.prob * 100).toFixed(0)}%]`
      : '';
    console.log(`  • ${c.homeTeam}–${c.awayTeam}${fav}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
