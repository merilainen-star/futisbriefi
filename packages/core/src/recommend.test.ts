import { describe, expect, it } from 'vitest';
import { impliedProbabilities } from './odds.js';
import { marketFavorite, recommend, scorePick } from './recommend.js';

const strongHome = impliedProbabilities({ home: 1.4, draw: 5, away: 8 }); // home ~0.7
const coinFlip = impliedProbabilities({ home: 2.9, draw: 3.2, away: 2.9 }); // ~even

describe('marketFavorite', () => {
  it('picks the highest-probability outcome', () => {
    expect(marketFavorite(strongHome).outcome).toBe('home');
    expect(marketFavorite(strongHome).prob).toBeGreaterThan(0.6);
  });
});

describe('recommend', () => {
  it('locked picks are always Locked', () => {
    const r = recommend({ pickHomeGoals: 0, pickAwayGoals: 3, implied: strongHome, locked: true });
    expect(r.recommendation).toBe('Locked');
  });

  it('agreeing with a strong favorite → Hold', () => {
    const r = recommend({ pickHomeGoals: 2, pickAwayGoals: 0, implied: strongHome });
    expect(r.pickOutcome).toBe('home');
    expect(r.recommendation).toBe('Hold');
  });

  it('disagreeing with a very confident market → Switch', () => {
    const r = recommend({ pickHomeGoals: 0, pickAwayGoals: 2, implied: strongHome });
    expect(r.recommendation).toBe('Switch');
  });

  it('a close market → Risky even when aligned', () => {
    const r = recommend({ pickHomeGoals: 1, pickAwayGoals: 0, implied: coinFlip });
    expect(r.recommendation).toBe('Risky');
  });
});

describe('scorePick', () => {
  it('exact score', () => {
    expect(scorePick({ homeGoals: 1, awayGoals: 1 }, { homeGoals: 1, awayGoals: 1 })).toBe('exact');
  });
  it('correct result, wrong score', () => {
    expect(scorePick({ homeGoals: 2, awayGoals: 0 }, { homeGoals: 1, awayGoals: 0 })).toBe('result');
  });
  it('miss', () => {
    expect(scorePick({ homeGoals: 2, awayGoals: 0 }, { homeGoals: 0, awayGoals: 1 })).toBe('miss');
  });
});
