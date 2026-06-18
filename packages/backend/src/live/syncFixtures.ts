import { isInWindow, type BriefingWindow, type Match } from '@fm2026/core';
import type { FotMobClient } from '../fotmob/types.js';
import type { Store } from '../store/store.js';
import { makeMatchId } from '../util/matchId.js';

/** FotMob parent-league id for the World Cup finals. */
export const WC_PARENT_LEAGUE_ID = 77;

/** UTC calendar dates (YYYYMMDD) spanning a window, for FotMob's date endpoint. */
function utcDatesInWindow(w: BriefingWindow): string[] {
  const fmt = (d: Date): string =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(
      d.getUTCDate(),
    ).padStart(2, '0')}`;
  const dates: string[] = [];
  const cur = new Date(
    Date.UTC(w.startUtc.getUTCFullYear(), w.startUtc.getUTCMonth(), w.startUtc.getUTCDate()),
  );
  while (cur.getTime() <= w.endUtc.getTime()) {
    dates.push(fmt(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export interface SyncOptions {
  parentLeagueId?: number;
}

/**
 * Fetch World Cup fixtures from FotMob for the window's dates, keep the ones that
 * kick off inside the window, and upsert them into the store (home-first, FIFA
 * order, with the FotMob match id for later lineup/injury enrichment).
 */
export async function syncWorldCupFixtures(
  store: Store,
  fotmob: FotMobClient,
  window: BriefingWindow,
  opts: SyncOptions = {},
): Promise<Match[]> {
  const parentId = opts.parentLeagueId ?? WC_PARENT_LEAGUE_ID;
  const seen = new Map<string, Match>();

  for (const date of utcDatesInWindow(window)) {
    let fixtures;
    try {
      fixtures = await fotmob.getFixturesByDate(date);
    } catch {
      continue; // a bad date shouldn't sink the whole sync
    }
    for (const f of fixtures) {
      const isWorldCup =
        f.parentLeagueId === parentId || /world cup/i.test(f.parentLeagueName ?? '');
      const isQualifier =
        /qualif/i.test(f.leagueName) || /qualif/i.test(f.parentLeagueName ?? '');
      if (!isWorldCup || isQualifier) continue;
      if (!f.koUtc || !isInWindow(f.koUtc, window)) continue;

      const match: Match = {
        id: makeMatchId(f.koUtc, f.homeTeam, f.awayTeam),
        fotmobId: f.matchId,
        group: f.groupName,
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        koUtc: f.koUtc,
      };
      store.upsertMatch(match);
      seen.set(match.id, match);
    }
  }

  return [...seen.values()];
}
