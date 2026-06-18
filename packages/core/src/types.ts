/**
 * Shared domain types. All timestamps are ISO-8601 strings in UTC ("...Z").
 * Convert to Europe/Helsinki only at display time (see time.ts).
 *
 * Teams are ALWAYS stored home-first (FIFA order). See teams.ts.
 */

export interface Match {
  /** Our stable id, e.g. "2026-06-18-CIV-ECU". */
  id: string;
  /** FotMob's numeric match id (string), the standing source for this match. */
  fotmobId?: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  /** Kickoff in UTC, ISO-8601 (e.g. "2026-06-18T15:00:00.000Z"). */
  koUtc: string;
  venue?: string;
}

export interface Odds {
  matchId: string;
  /** e.g. "theoddsapi", "mock". */
  source: string;
  /** Decimal odds, home/draw/away, in FIFA home-away order. */
  home: number;
  draw: number;
  away: number;
  /** When the snapshot was captured, ISO-8601 UTC. */
  capturedAt: string;
  /** Margin-removed implied probabilities (sum to 1). */
  impliedHome: number;
  impliedDraw: number;
  impliedAway: number;
}

export interface Pick {
  matchId: string;
  /** Predicted goals, home-first (FIFA order). */
  homeGoals: number;
  awayGoals: number;
  lockedAt?: string;
}

export type ResultStatus = 'scheduled' | 'live' | 'finished';

export interface Result {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  status: ResultStatus;
}

/** What we recommend doing with a stored pick vs the market. */
export type Recommendation = 'Hold' | 'Switch' | 'Risky' | 'Locked';

/** How a pick scored once a result is in. */
export type PickOutcome = 'exact' | 'result' | 'miss';

export interface BriefingItem {
  match: Match;
  odds?: Odds;
  pick?: Pick;
  recommendation?: Recommendation;
  /** Free-form notes assembled from FotMob (injuries, lineups, late news). */
  notes?: string[];
}

export interface Briefing {
  /** The Helsinki calendar date this briefing was generated for (YYYY-MM-DD). */
  date: string;
  items: BriefingItem[];
  createdAt: string;
}
