import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Match } from '@fm2026/core';
import { parsePicks } from '../picks/parse.js';
import { makeMatchId } from '../util/matchId.js';
import type { Store } from './store.js';

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

const pairKey = (home: string, away: string): string =>
  `${home.toLowerCase().trim()}__${away.toLowerCase().trim()}`;

export interface SeedCounts {
  matches: number;
  picks: number;
  results: number;
}

/** Idempotently load sample matches, picks and results into the store. */
export function seedSampleData(store: Store): SeedCounts {
  const seedMatches = JSON.parse(
    readFileSync(resolve(seedDir, 'matches.sample.json'), 'utf8'),
  ) as SeedMatch[];

  const matchByPair = new Map<string, Match>();
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
    matchByPair.set(pairKey(sm.homeTeam, sm.awayTeam), match);
  }

  const picksText = readFileSync(resolve(seedDir, 'picks.sample.txt'), 'utf8');
  let picks = 0;
  for (const p of parsePicks(picksText)) {
    const match = matchByPair.get(pairKey(p.homeTeam, p.awayTeam));
    if (!match) continue;
    store.upsertPick({ matchId: match.id, homeGoals: p.homeGoals, awayGoals: p.awayGoals });
    picks++;
  }

  const seedResults = JSON.parse(
    readFileSync(resolve(seedDir, 'results.sample.json'), 'utf8'),
  ) as SeedResult[];
  let results = 0;
  for (const r of seedResults) {
    const match = matchByPair.get(pairKey(r.homeTeam, r.awayTeam));
    if (!match) continue;
    store.upsertResult({
      matchId: match.id,
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
      status: r.status as 'finished',
    });
    results++;
  }

  return { matches: seedMatches.length, picks, results };
}
