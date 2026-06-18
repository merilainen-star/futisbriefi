/**
 * UI-side mirror of the briefing document contract produced by the backend
 * (@fm2026/core briefingDoc.ts). Kept local so the web build has no runtime
 * dependency on the backend/core TS source.
 */

export type Outcome = 'home' | 'draw' | 'away';

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
  confirmedXI: boolean;
  lineupType?: string;
  home: CardTeamLineup;
  away: CardTeamLineup;
}

export interface ScorelineProb {
  homeGoals: number;
  awayGoals: number;
  prob: number;
}

export interface ScorePrediction {
  homeGoals: number;
  awayGoals: number;
  prob: number;
  top: ScorelineProb[];
  expectedHome: number;
  expectedAway: number;
}

export interface BriefingCard {
  matchId: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  koUtc: string;
  venue?: string;
  odds?: CardOdds;
  marketFavorite?: { outcome: Outcome; prob: number };
  prediction?: ScorePrediction;
  lineup?: CardLineup;
  notes: string[];
}

export interface RecapItem {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  result: { homeGoals: number; awayGoals: number };
}

export interface BriefingDoc {
  date: string;
  generatedAtUtc: string;
  tz: string;
  cards: BriefingCard[];
  recap: RecapItem[];
}

export const OUTCOME_CODE: Record<Outcome, string> = { home: '1', draw: 'X', away: '2' };

export const OUTCOME_FI: Record<Outcome, string> = {
  home: 'kotivoitto',
  draw: 'tasapeli',
  away: 'vierasvoitto',
};
