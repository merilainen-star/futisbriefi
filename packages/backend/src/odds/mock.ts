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

    const rows: Array<Omit<MarketOdds, 'source' | 'capturedAt'>> = [
      {
        homeTeam: 'Portugal',
        awayTeam: 'DR Congo',
        commenceUtc: inHours(3),
        home: 1.4,
        draw: 4.6,
        away: 8.5,
        bookmaker: 'MockBook',
      },
      {
        homeTeam: 'Ivory Coast',
        awayTeam: 'Ecuador',
        commenceUtc: inHours(6),
        home: 2.45,
        draw: 3.1,
        away: 3.0,
        bookmaker: 'MockBook',
      },
      {
        homeTeam: 'Netherlands',
        awayTeam: 'Canada',
        commenceUtc: inHours(20),
        home: 1.75,
        draw: 3.7,
        away: 4.6,
        bookmaker: 'MockBook',
      },
    ];

    return rows.map((r) => ({ ...r, source: this.name, capturedAt }));
  }
}
