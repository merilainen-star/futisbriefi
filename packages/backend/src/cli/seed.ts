import { formatScoreline } from '@fm2026/core';
import { loadConfig } from '../config.js';
import { seedSampleData } from '../store/seed.js';
import { Store } from '../store/store.js';

/** Seed sample matches, picks and results into SQLite, then print them back. */
function main(): void {
  const config = loadConfig();
  const store = new Store(config.dbPath);

  const counts = seedSampleData(store);
  console.log(
    `Seeded ${counts.matches} matches, ${counts.picks} picks, ${counts.results} results → ${config.dbPath}\n`,
  );

  for (const m of store.listMatches()) {
    const pick = store.getPick(m.id);
    const pickStr = pick
      ? `pick ${formatScoreline(m.homeTeam, m.awayTeam, pick.homeGoals, pick.awayGoals)}`
      : '(no pick)';
    console.log(`  ${m.id}\n    ${pickStr}`);
  }
  store.close();
}

main();
