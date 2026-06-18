import { cachedJson } from '../http/cache.js';
import type { MarketOdds, OddsProvider } from './provider.js';

/** Shape of the relevant bits of The Odds API v4 /odds response. */
export interface OddsApiOutcome {
  name: string;
  price: number;
  /** Present on totals/spreads outcomes (e.g. the 2.5 line). */
  point?: number;
}
export interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}
export interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: OddsApiMarket[];
}
export interface OddsApiEvent {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

/** Pick the over/under closest to the 2.5 line from any bookmaker on the event. */
function extractTotals(
  bookmakers: OddsApiBookmaker[],
): { line: number; over: number; under: number } | undefined {
  let best: { line: number; over: number; under: number; dist: number } | undefined;
  for (const bm of bookmakers ?? []) {
    const totals = bm.markets?.find((m) => m.key === 'totals');
    if (!totals) continue;
    const over = totals.outcomes.find((o) => o.name === 'Over');
    const under = totals.outcomes.find((o) => o.name === 'Under');
    if (!over || !under || over.point === undefined) continue;
    const dist = Math.abs(over.point - 2.5);
    if (!best || dist < best.dist) {
      best = { line: over.point, over: over.price, under: under.price, dist };
    }
  }
  if (!best) return undefined;
  return { line: best.line, over: best.over, under: best.under };
}

/**
 * Pure parser (no network) so it can be unit-tested against a captured payload.
 *
 * For each event we take the FIRST bookmaker that offers a complete h2h (1X2)
 * market. The Odds API names the draw outcome "Draw" and the home/away outcomes
 * by team name — we map by identity, never by array position. Totals (over/under)
 * are taken from whichever bookmaker has a line nearest 2.5.
 */
export function parseOddsApiResponse(
  events: OddsApiEvent[],
  source = 'theoddsapi',
): MarketOdds[] {
  const capturedAt = new Date().toISOString();
  const out: MarketOdds[] = [];

  for (const ev of events) {
    for (const bm of ev.bookmakers ?? []) {
      const h2h = bm.markets?.find((m) => m.key === 'h2h');
      if (!h2h) continue;

      const priceOf = (name: string): number | undefined =>
        h2h.outcomes.find((o) => o.name === name)?.price;

      const home = priceOf(ev.home_team);
      const away = priceOf(ev.away_team);
      const draw = priceOf('Draw');

      if (home === undefined || away === undefined || draw === undefined) continue;

      out.push({
        homeTeam: ev.home_team,
        awayTeam: ev.away_team,
        commenceUtc: new Date(ev.commence_time).toISOString(),
        home,
        draw,
        away,
        overUnder: extractTotals(ev.bookmakers ?? []),
        bookmaker: bm.title,
        source,
        capturedAt,
      });
      break; // first complete bookmaker wins
    }
  }
  return out;
}

export interface TheOddsApiOptions {
  apiKey: string;
  sportKey: string;
  regions: string;
  markets: string;
}

export class TheOddsApiProvider implements OddsProvider {
  readonly name = 'theoddsapi';

  constructor(private readonly opts: TheOddsApiOptions) {}

  async fetchOdds(): Promise<MarketOdds[]> {
    const url =
      `https://api.the-odds-api.com/v4/sports/${this.opts.sportKey}/odds/` +
      `?apiKey=${encodeURIComponent(this.opts.apiKey)}` +
      `&regions=${encodeURIComponent(this.opts.regions)}` +
      `&markets=${encodeURIComponent(this.opts.markets)}` +
      `&oddsFormat=decimal`;

    // Cache 5 min; The Odds API free tier is quota-limited, so be gentle.
    const events = await cachedJson<OddsApiEvent[]>(url, {
      ttlMs: 5 * 60_000,
      minIntervalMs: 1500,
    });
    return parseOddsApiResponse(events, this.name);
  }
}
