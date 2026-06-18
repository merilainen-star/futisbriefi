import { describe, expect, it } from 'vitest';
import { impliedProbabilities, oddsMovement } from './odds.js';

describe('impliedProbabilities', () => {
  it('normalizes to sum 1 and reports the overround', () => {
    // A book with ~5% margin.
    const p = impliedProbabilities({ home: 2.1, draw: 3.4, away: 3.6 });
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 10);
    expect(p.overround).toBeGreaterThan(0);
    expect(p.overround).toBeCloseTo(1 / 2.1 + 1 / 3.4 + 1 / 3.6 - 1, 10);
  });

  it('a perfectly fair book has zero overround and matches raw inverses', () => {
    // 1/2 + 1/4 + 1/4 = 1 exactly.
    const p = impliedProbabilities({ home: 2, draw: 4, away: 4 });
    expect(p.overround).toBeCloseTo(0, 12);
    expect(p.home).toBeCloseTo(0.5, 12);
    expect(p.draw).toBeCloseTo(0.25, 12);
    expect(p.away).toBeCloseTo(0.25, 12);
  });

  it('keeps home/draw/away in order (no flipping)', () => {
    const p = impliedProbabilities({ home: 1.5, draw: 4.5, away: 7 });
    expect(p.home).toBeGreaterThan(p.draw);
    expect(p.draw).toBeGreaterThan(p.away);
  });

  it('rejects invalid decimal odds (must be > 1)', () => {
    expect(() => impliedProbabilities({ home: 1, draw: 3, away: 3 })).toThrow();
    expect(() => impliedProbabilities({ home: 0.9, draw: 3, away: 3 })).toThrow();
    expect(() => impliedProbabilities({ home: NaN, draw: 3, away: 3 })).toThrow();
  });
});

describe('oddsMovement', () => {
  it('computes later − earlier per outcome', () => {
    const m = oddsMovement({ home: 2.1, draw: 3.4, away: 3.6 }, { home: 2.0, draw: 3.5, away: 3.8 });
    expect(m.home).toBeCloseTo(-0.1, 10);
    expect(m.draw).toBeCloseTo(0.1, 10);
    expect(m.away).toBeCloseTo(0.2, 10);
  });
});
