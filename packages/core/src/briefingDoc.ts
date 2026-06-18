import type { ScorePrediction } from './score.js';
import type { Outcome } from './teams.js';

/**
 * The briefing "document" — the contract between the backend (which builds it)
 * and the PWA (which renders it). Written to briefing.json. All times UTC;
 * the UI converts to Helsinki for display.
 *
 * This is a direct market + team-news analysis: odds, margin-removed
 * probabilities, the market's own favorite, lineups and injuries. It does not
 * compare against stored picks or recommend holding/switching.
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
  /** The market's most likely 1X2 outcome and its margin-removed probability. */
  marketFavorite?: { outcome: Outcome; prob: number };
  /** Most likely exact score (Poisson model from odds + over/under). */
  prediction?: ScorePrediction;
  lineup?: CardLineup;
  /** Finnish, human-readable analysis lines. */
  notes: string[];
}

export interface RecapItem {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  result: { homeGoals: number; awayGoals: number };
}

export interface BriefingDoc {
  /** Helsinki date the briefing covers (YYYY-MM-DD). */
  date: string;
  generatedAtUtc: string;
  tz: string;
  /** Upcoming matches in the 24h window. */
  cards: BriefingCard[];
  /** Previous window's finished matches (final scores). */
  recap: RecapItem[];
}
