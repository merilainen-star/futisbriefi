import {
  briefingWindow,
  impliedProbabilities,
  matchesInWindow,
  scorePick,
  type BriefingDoc,
  type RecapItem,
} from '@fm2026/core';
import type { Store } from '../store/store.js';
import type { OddsProvider, MarketOdds } from '../odds/provider.js';
import type { FotMobClient } from '../fotmob/types.js';
import { assembleCard } from './assemble.js';

/** Loose team-name match (e.g. "Türkiye" vs "Turkiye", trailing spaces). */
function teamKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function findMarket(markets: MarketOdds[], home: string, away: string): MarketOdds | undefined {
  const hk = teamKey(home);
  const ak = teamKey(away);
  return markets.find((m) => teamKey(m.homeTeam) === hk && teamKey(m.awayTeam) === ak);
}

export interface BuildBriefingDeps {
  store: Store;
  odds: OddsProvider;
  fotmob: FotMobClient;
  now?: Date;
  tz?: string;
}

/**
 * Assemble the full briefing document for the 24h window around `now`:
 *  - upcoming matches → cards (odds + normalized probs + pick vs market + lineup)
 *  - previous window's finished matches → results recap vs my picks
 *
 * This is the same pipeline a scheduled job (GitHub Action at 18:00 Helsinki)
 * will run; only the trigger differs.
 */
export async function buildBriefing(deps: BuildBriefingDeps): Promise<BriefingDoc> {
  const now = deps.now ?? new Date();
  const tz = deps.tz ?? 'Europe/Helsinki';
  const window = briefingWindow(now, tz);

  const allMatches = deps.store.listMatches();
  const upcoming = matchesInWindow(allMatches, window);

  const markets = await deps.odds.fetchOdds();

  const cards = [];
  for (const match of upcoming) {
    const market = findMarket(markets, match.homeTeam, match.awayTeam);
    if (market) {
      // Persist an odds snapshot so movement can be computed later.
      const p = impliedProbabilities({ home: market.home, draw: market.draw, away: market.away });
      deps.store.insertOdds({
        matchId: match.id,
        source: market.source,
        home: market.home,
        draw: market.draw,
        away: market.away,
        capturedAt: market.capturedAt,
        impliedHome: p.home,
        impliedDraw: p.draw,
        impliedAway: p.away,
      });
    }

    const pick = deps.store.getPick(match.id);
    let details;
    if (match.fotmobId) {
      try {
        details = await deps.fotmob.getMatchDetails(match.fotmobId);
      } catch {
        details = undefined;
      }
    }
    cards.push(assembleCard(match, market, pick, details));
  }

  // Results recap: finished matches in the PREVIOUS window.
  const prevWindow = briefingWindow(new Date(window.startUtc.getTime() - 1), tz);
  const recap: RecapItem[] = [];
  for (const match of matchesInWindow(allMatches, prevWindow)) {
    const result = deps.store.getResult(match.id);
    if (!result || result.status !== 'finished') continue;
    const pick = deps.store.getPick(match.id);
    recap.push({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      pick: pick ? { homeGoals: pick.homeGoals, awayGoals: pick.awayGoals } : undefined,
      result: { homeGoals: result.homeGoals, awayGoals: result.awayGoals },
      outcome: pick
        ? scorePick(
            { homeGoals: pick.homeGoals, awayGoals: pick.awayGoals },
            { homeGoals: result.homeGoals, awayGoals: result.awayGoals },
          )
        : 'miss',
    });
  }

  return {
    date: window.helsinkiDate,
    generatedAtUtc: now.toISOString(),
    tz,
    cards,
    recap,
  };
}
