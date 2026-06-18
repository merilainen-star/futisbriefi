/**
 * Pluggable odds source. Implementations return raw market quotes; mapping to our
 * Match ids and implied-probability enrichment happens in the briefing layer.
 *
 * Teams are reported home-first to match FIFA order, but note: an odds source may
 * label home/away differently than FIFA's official designation for neutral-venue
 * World Cup games — the briefing layer reconciles by team identity, not by slot.
 */
export interface MarketOdds {
  homeTeam: string;
  awayTeam: string;
  /** Kickoff per the odds source, ISO-8601 UTC. */
  commenceUtc: string;
  /** Decimal odds. */
  home: number;
  draw: number;
  away: number;
  /** Over/under (totals) market, when available — anchors the goals model. */
  overUnder?: {
    line: number;
    over: number;
    under: number;
  };
  /** Which bookmaker these prices came from (or an aggregate label). */
  bookmaker: string;
  /** Provider name, e.g. "theoddsapi" | "mock". */
  source: string;
  /** When captured, ISO-8601 UTC. */
  capturedAt: string;
}

export interface OddsProvider {
  readonly name: string;
  /** Fetch current 1X2 odds for the configured competition. */
  fetchOdds(): Promise<MarketOdds[]>;
}
