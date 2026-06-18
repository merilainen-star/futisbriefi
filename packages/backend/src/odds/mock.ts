import type { MarketOdds, OddsProvider } from './provider.js';

/**
 * Deterministic mock odds so dev/tests run with zero secrets. Kickoffs are set
 * relative to "now" so the briefing window always has something to show. Teams
 * are in FIFA home-away order and match the sample picks seed.
 */
export class MockOddsProvider implements OddsProvider {
  readonly name = 'mock';

  constructor(private readonly now: () => Date = () => new Date()) {}

  async fetchOdds(): Promise<MarketOdds[]> {
    const base = this.now();
    const capturedAt = base.toISOString();
    const inHours = (h: number) => new Date(base.getTime() + h * 3_600_000).toISOString();

    const ou = (line: number, over: number, under: number) => ({ line, over, under });
    const rows: Array<Omit<MarketOdds, 'source' | 'capturedAt'>> = [
      {
        homeTeam: 'Portugal',
        awayTeam: 'DR Congo',
        commenceUtc: inHours(3),
        home: 1.4,
        draw: 4.6,
        away: 8.5,
        overUnder: ou(2.5, 1.7, 2.1),
        bookmaker: 'MockBook',
      },
      {
        homeTeam: 'Ivory Coast',
        awayTeam: 'Ecuador',
        commenceUtc: inHours(6),
        home: 2.45,
        draw: 3.1,
        away: 3.0,
        overUnder: ou(2.5, 2.05, 1.75),
        bookmaker: 'MockBook',
      },
      {
        homeTeam: 'Netherlands',
        awayTeam: 'Canada',
        commenceUtc: inHours(20),
        home: 1.75,
        draw: 3.7,
        away: 4.6,
        overUnder: ou(2.5, 1.9, 1.9),
        bookmaker: 'MockBook',
      },
      {
        // Matches the captured FotMob sample so the demo card shows real
        // lineups/injuries alongside (mock) odds.
        homeTeam: 'Crystal Palace',
        awayTeam: 'Manchester City',
        commenceUtc: inHours(4),
        home: 6.5,
        draw: 4.5,
        away: 1.5,
        overUnder: ou(3.0, 1.9, 1.9),
        bookmaker: 'MockBook',
      },
    ];

    return rows.map((r) => ({ ...r, source: this.name, capturedAt }));
  }
}
