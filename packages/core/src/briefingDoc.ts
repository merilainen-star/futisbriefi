import type { Outcome } from './teams.js';
import type { PickOutcome, Recommendation } from './types.js';

/**
 * The briefing "document" — the contract between the backend (which builds it)
 * and the PWA (which renders it). Written to briefing.json. All times UTC;
 * the UI converts to Helsinki for display.
 */

export interface CardOdds {
  home: number;
  draw: number;
  away: number;
  impliedHome: number;
  impliedDraw: number;
  impliedAway: number;
  overround: number;
  bookmaker: string;
  source: string;
}

export interface CardInjury {
  name: string;
  type?: string;
  expectedReturn?: string;
}

export interface CardPlayer {
  name: string;
  shirtNumber?: string;
}

export interface CardTeamLineup {
  teamName: string;
  formation?: string;
  coach?: string;
  starters: CardPlayer[];
  unavailable: CardInjury[];
}

export interface CardLineup {
  /** False only when FotMob marks the XI "predicted". */
  confirmedXI: boolean;
  lineupType?: string;
  home: CardTeamLineup;
  away: CardTeamLineup;
}

export interface BriefingCard {
  matchId: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  koUtc: string;
  venue?: string;
  odds?: CardOdds;
  pick?: { homeGoals: number; awayGoals: number; locked?: boolean };
  recommendation?: Recommendation;
  favorite?: { outcome: Outcome; prob: number };
  lineup?: CardLineup;
  /** Finnish, human-readable analysis lines. */
  notes: string[];
}

export interface RecapItem {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  pick?: { homeGoals: number; awayGoals: number };
  result: { homeGoals: number; awayGoals: number };
  outcome: PickOutcome;
}

export interface BriefingDoc {
  /** Helsinki date the briefing covers (YYYY-MM-DD). */
  date: string;
  generatedAtUtc: string;
  tz: string;
  /** Upcoming matches in the 24h window. */
  cards: BriefingCard[];
  /** Previous window's finished matches scored against my picks. */
  recap: RecapItem[];
}
