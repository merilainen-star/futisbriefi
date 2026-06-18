/**
 * Exact-score prediction from 1X2 odds.
 *
 * We model goals as two independent Poisson variables (home ~ Poisson(λh),
 * away ~ Poisson(λa)) and solve for (λh, λa) so the model reproduces the
 * margin-removed 1X2 probabilities. The predicted exact score is the most likely
 * (i, j) cell; we also return the next most likely scorelines and the implied
 * expected goals.
 *
 * Independent Poisson slightly under-weights draws vs reality (Dixon–Coles would
 * correct that) but is a solid, transparent baseline that needs only the 1X2
 * prices we already fetch.
 */

export interface ScorelineProb {
  homeGoals: number;
  awayGoals: number;
  prob: number;
}

export interface ScorePrediction {
  /** Most likely exact score. */
  homeGoals: number;
  awayGoals: number;
  /** Probability of that exact score. */
  prob: number;
  /** Most likely scorelines, highest first (includes the mode). */
  top: ScorelineProb[];
  /** Solved expected goals. */
  expectedHome: number;
  expectedAway: number;
}

const MAX_GOALS = 10;
const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];

function poisson(lambda: number, k: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / FACT[k]!;
}

function pmfArray(lambda: number): number[] {
  const a: number[] = [];
  for (let k = 0; k <= MAX_GOALS; k++) a.push(poisson(lambda, k));
  return a;
}

/** Match probabilities (home/draw/away/over-the-line) implied by the two Poissons. */
function modelProbs(
  lh: number,
  la: number,
  line: number,
): { home: number; draw: number; away: number; over: number } {
  const ph = pmfArray(lh);
  const pa = pmfArray(la);
  let home = 0;
  let draw = 0;
  let away = 0;
  let over = 0;
  let total = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = ph[i]! * pa[j]!;
      total += p;
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
      if (i + j > line) over += p;
    }
  }
  return { home: home / total, draw: draw / total, away: away / total, over: over / total };
}

interface SolveTargets {
  home: number;
  away: number;
  /** De-margined P(total goals > line), when an over/under market is available. */
  overProb?: number;
  line: number;
  /** Expected total goals to pull toward when no over/under is available. */
  priorTotal: number;
}

/**
 * Find (λh, λa) that match the market's SUPREMACY (home−away win prob) and its
 * TOTAL goals. We deliberately do not force the draw probability: independent
 * Poisson cannot honour the market's draw inflation and total goals at once, and
 * matching the draw is what collapses the model to 1–0. Anchoring totals (via the
 * over/under line, or a prior when absent) keeps scorelines realistic.
 */
function solveLambdas(t: SolveTargets): { lh: number; la: number } {
  const targetSupremacy = t.home - t.away;
  let best = { lh: 1, la: 1, err: Infinity };

  const err = (lh: number, la: number): number => {
    const m = modelProbs(lh, la, t.line);
    const suprErr = (m.home - m.away - targetSupremacy) ** 2;
    const totalErr =
      t.overProb !== undefined
        ? 1.5 * (m.over - t.overProb) ** 2
        : 0.04 * (lh + la - t.priorTotal) ** 2;
    return suprErr + totalErr;
  };

  for (let lh = 0.1; lh <= 4.5; lh += 0.1) {
    for (let la = 0.1; la <= 4.5; la += 0.1) {
      const e = err(lh, la);
      if (e < best.err) best = { lh, la, err: e };
    }
  }
  const c = best;
  for (let lh = Math.max(0.05, c.lh - 0.1); lh <= c.lh + 0.1; lh += 0.01) {
    for (let la = Math.max(0.05, c.la - 0.1); la <= c.la + 0.1; la += 0.01) {
      const e = err(lh, la);
      if (e < best.err) best = { lh, la, err: e };
    }
  }
  return { lh: best.lh, la: best.la };
}

export interface PredictScoreOptions {
  /** How many scorelines to return in `top` (default 5). */
  topN?: number;
  /** Largest goal count to consider per side for the score grid (default 6). */
  maxGoalsPerSide?: number;
  /** Over/under market — when present, anchors the total goals precisely. */
  overUnder?: { line: number; over: number; under: number };
  /** Expected total goals to assume when no over/under is given (default 2.6). */
  priorTotalGoals?: number;
}

/**
 * Predict the exact score from margin-removed 1X2 probabilities, optionally
 * anchored by an over/under market for realistic totals.
 */
export function predictScore(
  implied: { home: number; draw: number; away: number },
  opts: PredictScoreOptions = {},
): ScorePrediction {
  const topN = opts.topN ?? 5;
  const maxG = opts.maxGoalsPerSide ?? 6;

  let overProb: number | undefined;
  let line = 2.5;
  if (opts.overUnder) {
    line = opts.overUnder.line;
    // De-margin the two-way over/under to a fair P(over).
    const io = 1 / opts.overUnder.over;
    const iu = 1 / opts.overUnder.under;
    overProb = io / (io + iu);
  }

  const { lh, la } = solveLambdas({
    home: implied.home,
    away: implied.away,
    overProb,
    line,
    priorTotal: opts.priorTotalGoals ?? 2.6,
  });
  const ph = pmfArray(lh);
  const pa = pmfArray(la);

  const all: ScorelineProb[] = [];
  for (let i = 0; i <= maxG; i++) {
    for (let j = 0; j <= maxG; j++) {
      all.push({ homeGoals: i, awayGoals: j, prob: ph[i]! * pa[j]! });
    }
  }
  all.sort((a, b) => b.prob - a.prob);
  const mode = all[0]!;

  return {
    homeGoals: mode.homeGoals,
    awayGoals: mode.awayGoals,
    prob: mode.prob,
    top: all.slice(0, topN),
    expectedHome: lh,
    expectedAway: la,
  };
}
