import type { ImpliedProbabilities } from './odds.js';
import { scoreOutcome, type Outcome } from './teams.js';
import type { PickOutcome, Recommendation } from './types.js';

/** The market's most likely 1X2 outcome and its (margin-removed) probability. */
export function marketFavorite(p: ImpliedProbabilities): { outcome: Outcome; prob: number } {
  const entries: Array<[Outcome, number]> = [
    ['home', p.home],
    ['draw', p.draw],
    ['away', p.away],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const [outcome, prob] = entries[0]!;
  return { outcome, prob };
}

export interface RecommendInput {
  pickHomeGoals: number;
  pickAwayGoals: number;
  implied: ImpliedProbabilities;
  /** A locked pick can no longer be changed in the prediction game. */
  locked?: boolean;
}

/**
 * v1 heuristic: compare the 1X2 outcome implied by my exact-score pick against
 * the market.
 *
 *  - locked              → "Locked" (cannot change, informational only)
 *  - pick agrees w/ a strong favorite (≥ 0.50) → "Hold"
 *  - pick disagrees and the market is very confident (≥ 0.60) → "Switch"
 *  - otherwise (close market, or mild disagreement) → "Risky"
 *
 * Returns both the recommendation and the inputs that drove it, so the briefing
 * can explain itself in Finnish.
 */
export function recommend(input: RecommendInput): {
  recommendation: Recommendation;
  pickOutcome: Outcome;
  favorite: { outcome: Outcome; prob: number };
} {
  const pickOutcome = scoreOutcome(input.pickHomeGoals, input.pickAwayGoals);
  const favorite = marketFavorite(input.implied);

  let recommendation: Recommendation;
  if (input.locked) {
    recommendation = 'Locked';
  } else if (pickOutcome === favorite.outcome) {
    recommendation = favorite.prob >= 0.5 ? 'Hold' : 'Risky';
  } else {
    recommendation = favorite.prob >= 0.6 ? 'Switch' : 'Risky';
  }

  return { recommendation, pickOutcome, favorite };
}

/** Score a finished result against a pick (exact / correct result / miss). */
export function scorePick(
  pick: { homeGoals: number; awayGoals: number },
  result: { homeGoals: number; awayGoals: number },
): PickOutcome {
  if (pick.homeGoals === result.homeGoals && pick.awayGoals === result.awayGoals) {
    return 'exact';
  }
  if (
    scoreOutcome(pick.homeGoals, pick.awayGoals) ===
    scoreOutcome(result.homeGoals, result.awayGoals)
  ) {
    return 'result';
  }
  return 'miss';
}
