import {
  briefingWindow,
  canonicalTeam,
  impliedProbabilities,
  matchesInWindow,
  type BriefingDoc,
  type RecapItem,
} from '@fm2026/core';
import type { Match } from '@fm2026/core';
import type { Store } from '../store/store.js';
import type { OddsProvider, MarketOdds } from '../odds/provider.js';
import type { FotMobClient } from '../fotmob/types.js';
import { assembleCard } from './assemble.js';

function findMarket(markets: MarketOdds[], home: string, away: string): MarketOdds | undefined {
  const hk = canonicalTeam(home);
  const ak = canonicalTeam(away);
  // Try both orientations: a neutral-venue source may flip home/away vs FIFA.
  return markets.find(
    (m) =>
      (canonicalTeam(m.homeTeam) === hk && canonicalTeam(m.awayTeam) === ak) ||
      (canonicalTeam(m.homeTeam) === ak && canonicalTeam(m.awayTeam) === hk),
  );
}

export interface BuildBriefingDeps {
  store: Store;
  odds: OddsProvider;
  fotmob: FotMobClient;
  now?: Date;
  tz?: string;
  /**
   * Matches to consider. Defaults to everything in the store; live mode passes
   * just the freshly-synced fixtures so a stale store can't leak old matches in.
   */
  matches?: Match[];
}

/**
 * Assemble the full briefing document for the 24h window around `now`:
 *  - upcoming matches → cards (odds + normalized probs + market favorite + lineup)
 *  - previous window's finished matches → results recap (final scores)
 *
 * This is the same pipeline a scheduled job (GitHub Action at 18:00 Helsinki)
 * will run; only the trigger differs.
 */
export async function buildBriefing(deps: BuildBriefingDeps): Promise<BriefingDoc> {
  const now = deps.now ?? new Date();
  const tz = deps.tz ?? 'Europe/Helsinki';
  const window = briefingWindow(now, tz);

  const allMatches = deps.matches ?? deps.store.listMatches();
  const upcoming = matchesInWindow(allMatches, window);

  const markets = await deps.odds.fetchOdds();

  const cards = [];
  for (const match of upcoming) {
    // A single bad match must never sink the whole briefing.
    try {
      let market = findMarket(markets, match.homeTeam, match.awayTeam);
      if (market) {
        try {
          // Persist an odds snapshot so movement can be computed later.
          const p = impliedProbabilities({
            home: market.home,
            draw: market.draw,
            away: market.away,
          });
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
        } catch (err) {
          // Bad odds (e.g. a price of 1.0) — drop the market, keep the card.
          console.warn(`Skipping odds for ${match.homeTeam}–${match.awayTeam}: ${String(err)}`);
          market = undefined;
        }
      }

      let details;
      if (match.fotmobId) {
        try {
          details = await deps.fotmob.getMatchDetails(match.fotmobId);
        } catch {
          details = undefined;
        }
      }
      cards.push(assembleCard(match, market, details));
    } catch (err) {
      console.warn(`Skipping match ${match.homeTeam}–${match.awayTeam}: ${String(err)}`);
      cards.push(assembleCard(match, undefined, undefined));
    }
  }

  // Results recap: finished matches in the PREVIOUS window (final scores).
  const prevWindow = briefingWindow(new Date(window.startUtc.getTime() - 1), tz);
  const recap: RecapItem[] = [];
  for (const match of matchesInWindow(allMatches, prevWindow)) {
    const result = deps.store.getResult(match.id);
    if (!result || result.status !== 'finished') continue;
    recap.push({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      result: { homeGoals: result.homeGoals, awayGoals: result.awayGoals },
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
