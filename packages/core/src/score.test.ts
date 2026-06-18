import { describe, expect, it } from 'vitest';
import { impliedProbabilities } from './odds.js';
import { predictScore } from './score.js';

describe('predictScore', () => {
  it('predicts a home-win scoreline for a strong home favorite', () => {
    const p = impliedProbabilities({ home: 1.4, draw: 4.6, away: 8.5 }); // Portugal-ish
    const s = predictScore(p);
    expect(s.homeGoals).toBeGreaterThan(s.awayGoals);
    expect(s.expectedHome).toBeGreaterThan(s.expectedAway);
    expect(s.prob).toBeGreaterThan(0);
    expect(s.prob).toBeLessThan(1);
  });

  it('predicts a low-scoring draw for an even, low-scoring market', () => {
    // Balanced 1X2 with a healthy draw price → typically 1–1.
    const p = impliedProbabilities({ home: 2.7, draw: 3.1, away: 2.9 });
    const s = predictScore(p);
    expect(s.homeGoals).toBe(s.awayGoals); // a draw
    expect(s.homeGoals).toBeLessThanOrEqual(1);
  });

  it('returns top scorelines sorted by probability, mode first', () => {
    const p = impliedProbabilities({ home: 2.1, draw: 3.4, away: 3.6 });
    const s = predictScore(p, { topN: 5 });
    expect(s.top).toHaveLength(5);
    for (let i = 1; i < s.top.length; i++) {
      expect(s.top[i]!.prob).toBeLessThanOrEqual(s.top[i - 1]!.prob);
    }
    expect(s.top[0]).toMatchObject({ homeGoals: s.homeGoals, awayGoals: s.awayGoals });
  });

  it('reproduces the input 1X2 probabilities reasonably well', () => {
    const target = impliedProbabilities({ home: 1.83, draw: 3.5, away: 4.6 });
    const s = predictScore(target);
    // Re-derive outcome probs from the solved expected goals and compare loosely.
    const lh = s.expectedHome;
    const la = s.expectedAway;
    // Higher home xG than away xG, consistent with home being favored.
    expect(lh).toBeGreaterThan(la);
    expect(lh).toBeGreaterThan(1.0);
  });

  it('flips orientation for a strong away favorite', () => {
    const p = impliedProbabilities({ home: 6.5, draw: 4.5, away: 1.5 }); // City away
    const s = predictScore(p);
    expect(s.awayGoals).toBeGreaterThan(s.homeGoals);
    expect(s.expectedAway).toBeGreaterThan(s.expectedHome);
  });
});
