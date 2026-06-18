import { describe, expect, it } from 'vitest';
import { impliedProbabilities } from '@fm2026/core';
import { MockOddsProvider } from './mock.js';

describe('MockOddsProvider', () => {
  it('returns deterministic, normalizable 1X2 odds in FIFA order', async () => {
    const fixedNow = new Date('2026-06-18T15:00:00Z');
    const rows = await new MockOddsProvider(() => fixedNow).fetchOdds();

    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const p = impliedProbabilities({ home: r.home, draw: r.draw, away: r.away });
      expect(p.home + p.draw + p.away).toBeCloseTo(1, 10);
      expect(r.source).toBe('mock');
      // commence times are in the future relative to "now"
      expect(new Date(r.commenceUtc).getTime()).toBeGreaterThan(fixedNow.getTime());
    }
  });
});
