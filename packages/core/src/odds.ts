/** Decimal 1X2 odds, in FIFA home-away order. */
export interface Odds1x2 {
  home: number;
  draw: number;
  away: number;
}

export interface ImpliedProbabilities {
  home: number;
  draw: number;
  away: number;
  /** Bookmaker margin: (Σ 1/odds) − 1. e.g. 0.05 = 5% overround. */
  overround: number;
}

/**
 * Margin-removed implied probabilities.
 *
 *   p_i = (1/odds_i) / Σ_j (1/odds_j)
 *
 * The normalization divides out the bookmaker's overround so the three
 * probabilities sum to exactly 1. `overround` is returned for transparency.
 */
export function impliedProbabilities(o: Odds1x2): ImpliedProbabilities {
  for (const key of ['home', 'draw', 'away'] as const) {
    const v = o[key];
    if (!Number.isFinite(v) || v <= 1) {
      throw new Error(`Decimal odds must be a finite number > 1, got ${key}=${v}`);
    }
  }
  const inv = { home: 1 / o.home, draw: 1 / o.draw, away: 1 / o.away };
  const booksum = inv.home + inv.draw + inv.away;
  return {
    home: inv.home / booksum,
    draw: inv.draw / booksum,
    away: inv.away / booksum,
    overround: booksum - 1,
  };
}

/** Odds movement between two snapshots (later − earlier), in decimal points. */
export interface OddsMovement {
  home: number;
  draw: number;
  away: number;
}

export function oddsMovement(earlier: Odds1x2, later: Odds1x2): OddsMovement {
  return {
    home: later.home - earlier.home,
    draw: later.draw - earlier.draw,
    away: later.away - earlier.away,
  };
}
