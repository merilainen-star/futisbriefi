import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatScoreline, type Match } from '@fm2026/core';
import { loadConfig } from '../config.js';
import { parsePicks } from '../picks/parse.js';
import { Store } from '../store/store.js';
import { makeMatchId } from '../util/matchId.js';

const seedDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'seed');

interface SeedMatch {
  fotmobId: string | null;
  group: string;
  homeTeam: string;
  awayTeam: string;
  koUtc: string;
  venue?: string;
}
interface SeedResult {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  status: string;
}

/** Seed sample matches, picks and results into SQLite, then print them back. */
function main(): void {
  const config = loadConfig();
  const store = new Store(config.dbPath);

  const seedMatches = JSON.parse(
    readFileSync(resolve(seedDir, 'matches.sample.json'), 'utf8'),
  ) as SeedMatch[];

  // Map team-pair → matchId so picks/results can be linked by name.
  const idByPair = new Map<string, Match>();
  for (const sm of seedMatches) {
    const match: Match = {
      id: makeMatchId(sm.koUtc, sm.homeTeam, sm.awayTeam),
      fotmobId: sm.fotmobId ?? undefined,
      group: sm.group,
      homeTeam: sm.homeTeam,
      awayTeam: sm.awayTeam,
      koUtc: sm.koUtc,
      venue: sm.venue,
    };
    store.upsertMatch(match);
    idByPair.set(pairKey(sm.homeTeam, sm.awayTeam), match);
  }

  const picksText = readFileSync(resolve(seedDir, 'picks.sample.txt'), 'utf8');
  let pickCount = 0;
  for (const p of parsePicks(picksText)) {
    const match = idByPair.get(pairKey(p.homeTeam, p.awayTeam));
    if (!match) {
      console.warn(`! pick has no matching fixture: ${p.homeTeam}–${p.awayTeam} (skipped)`);
      continue;
    }
    store.upsertPick({
      matchId: match.id,
      homeGoals: p.homeGoals,
      awayGoals: p.awayGoals,
    });
    pickCount++;
  }

  const seedResults = JSON.parse(
    readFileSync(resolve(seedDir, 'results.sample.json'), 'utf8'),
  ) as SeedResult[];
  let resultCount = 0;
  for (const r of seedResults) {
    const match = idByPair.get(pairKey(r.homeTeam, r.awayTeam));
    if (!match) continue;
    store.upsertResult({
      matchId: match.id,
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
      status: r.status as 'finished',
    });
    resultCount++;
  }

  console.log(
    `Seeded ${seedMatches.length} matches, ${pickCount} picks, ${resultCount} results → ${config.dbPath}\n`,
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

function pairKey(home: string, away: string): string {
  return `${home.toLowerCase().trim()}__${away.toLowerCase().trim()}`;
}

main();
