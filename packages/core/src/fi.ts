import type { Outcome } from './teams.js';
import type { PickOutcome, Recommendation } from './types.js';

/** Finnish UI labels. Code stays English; user-facing output is Finnish. */

export const RECOMMENDATION_FI: Record<Recommendation, string> = {
  Hold: 'Pidä',
  Switch: 'Vaihda',
  Risky: 'Riskialtis',
  Locked: 'Lukittu',
};

/** 1X2 codes as used in the prediction game. */
export const OUTCOME_CODE: Record<Outcome, string> = {
  home: '1',
  draw: 'X',
  away: '2',
};

export const OUTCOME_FI: Record<Outcome, string> = {
  home: 'kotivoitto',
  draw: 'tasapeli',
  away: 'vierasvoitto',
};

export const PICK_OUTCOME_FI: Record<PickOutcome, string> = {
  exact: 'Täysosuma',
  result: 'Oikea lopputulos',
  miss: 'Ohi',
};
