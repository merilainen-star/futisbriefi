import { describe, expect, it } from 'vitest';
import { impliedProbabilities } from '@fm2026/core';
import { Store } from './store.js';

function freshStore(): Store {
  return new Store(':memory:');
}

const match = {
  id: '2026-06-18-portugal-drcongo',
  group: 'Group F',
  homeTeam: 'Portugal',
  awayTeam: 'DR Congo',
  koUtc: '2026-06-18T16:00:00.000Z',
};

describe('Store', () => {
  it('round-trips a match', () => {
    const s = freshStore();
    s.upsertMatch(match);
    expect(s.getMatch(match.id)).toMatchObject(match);
    expect(s.listMatches()).toHaveLength(1);
    s.close();
  });

  it('upsert updates an existing match rather than duplicating', () => {
    const s = freshStore();
    s.upsertMatch(match);
    s.upsertMatch({ ...match, venue: 'MetLife Stadium' });
    expect(s.listMatches()).toHaveLength(1);
    expect(s.getMatch(match.id)?.venue).toBe('MetLife Stadium');
    s.close();
  });

  it('stores odds with implied probabilities and returns the latest', () => {
    const s = freshStore();
    s.upsertMatch(match);
    const p = impliedProbabilities({ home: 1.4, draw: 4.6, away: 8.5 });
    s.insertOdds({
      matchId: match.id,
      source: 'mock',
      home: 1.4,
      draw: 4.6,
      away: 8.5,
      capturedAt: '2026-06-18T10:00:00.000Z',
      impliedHome: p.home,
      impliedDraw: p.draw,
      impliedAway: p.away,
    });
    s.insertOdds({
      matchId: match.id,
      source: 'mock',
      home: 1.35,
      draw: 4.8,
      away: 9,
      capturedAt: '2026-06-18T12:00:00.000Z',
      impliedHome: 0.7,
      impliedDraw: 0.2,
      impliedAway: 0.1,
    });
    expect(s.latestOdds(match.id)?.home).toBe(1.35); // newest snapshot
    s.close();
  });

  it('round-trips a pick and a result', () => {
    const s = freshStore();
    s.upsertMatch(match);
    s.upsertPick({ matchId: match.id, homeGoals: 1, awayGoals: 1 });
    s.upsertResult({ matchId: match.id, homeGoals: 2, awayGoals: 0, status: 'finished' });
    expect(s.getPick(match.id)).toMatchObject({ homeGoals: 1, awayGoals: 1 });
    expect(s.getResult(match.id)).toMatchObject({ homeGoals: 2, awayGoals: 0, status: 'finished' });
    s.close();
  });

  it('saves and reloads a briefing JSON blob', () => {
    const s = freshStore();
    const briefing = { date: '2026-06-18', items: [], createdAt: '2026-06-18T15:00:00.000Z' };
    s.saveBriefing(briefing);
    expect(s.getBriefing('2026-06-18')).toEqual(briefing);
    s.close();
  });
});
