/**
 * UI-side mirror of the briefing document contract produced by the backend
 * (@fm2026/core briefingDoc.ts). Kept local so the web build has no runtime
 * dependency on the backend/core TS source.
 */

export type Recommendation = 'Hold' | 'Switch' | 'Risky' | 'Locked';
export type Outcome = 'home' | 'draw' | 'away';
export type PickOutcome = 'exact' | 'result' | 'miss';

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
  date: string;
  generatedAtUtc: string;
  tz: string;
  cards: BriefingCard[];
  recap: RecapItem[];
}

export const RECOMMENDATION_FI: Record<Recommendation, string> = {
  Hold: 'Pidä',
  Switch: 'Vaihda',
  Risky: 'Riskialtis',
  Locked: 'Lukittu',
};

export const OUTCOME_CODE: Record<Outcome, string> = { home: '1', draw: 'X', away: '2' };

export const PICK_OUTCOME_FI: Record<PickOutcome, string> = {
  exact: 'Täysosuma',
  result: 'Oikea tulos',
  miss: 'Ohi',
};
