import { describe, expect, it } from 'vitest';
import { impliedProbabilities } from '@fm2026/core';
import { parseOddsApiResponse, type OddsApiEvent } from './theOddsApi.js';

const sample: OddsApiEvent[] = [
  {
    id: 'evt1',
    commence_time: '2026-06-18T15:00:00Z',
    home_team: 'Portugal',
    away_team: 'DR Congo',
    bookmakers: [
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              // Deliberately out of FIFA order to prove we map by name, not slot.
              { name: 'Draw', price: 4.6 },
              { name: 'DR Congo', price: 8.5 },
              { name: 'Portugal', price: 1.4 },
            ],
          },
        ],
      },
    ],
  },
];

describe('parseOddsApiResponse', () => {
  it('maps outcomes by team name, keeping FIFA home-away order', () => {
    const [row] = parseOddsApiResponse(sample);
    expect(row).toBeDefined();
    expect(row!.homeTeam).toBe('Portugal');
    expect(row!.awayTeam).toBe('DR Congo');
    expect(row!.home).toBe(1.4);
    expect(row!.draw).toBe(4.6);
    expect(row!.away).toBe(8.5);
    expect(row!.bookmaker).toBe('Pinnacle');
  });

  it('produces odds that normalize to a sane favorite', () => {
    const [row] = parseOddsApiResponse(sample);
    const p = impliedProbabilities({ home: row!.home, draw: row!.draw, away: row!.away });
    expect(p.home).toBeGreaterThan(0.6); // Portugal clear favorite
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 10);
  });

  it('skips events whose bookmaker lacks a complete 1X2 market', () => {
    const incomplete: OddsApiEvent[] = [
      {
        id: 'evt2',
        commence_time: '2026-06-18T18:00:00Z',
        home_team: 'A',
        away_team: 'B',
        bookmakers: [
          {
            key: 'x',
            title: 'X',
            markets: [{ key: 'h2h', outcomes: [{ name: 'A', price: 2 }, { name: 'Draw', price: 3 }] }],
          },
        ],
      },
    ];
    expect(parseOddsApiResponse(incomplete)).toHaveLength(0);
  });
});
