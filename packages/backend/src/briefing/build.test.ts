import { describe, expect, it } from 'vitest';
import { buildBriefing } from './build.js';
import { createOfflineFotMobClient } from '../fotmob/index.js';
import { MockOddsProvider } from '../odds/mock.js';
import { seedSampleData } from '../store/seed.js';
import { Store } from '../store/store.js';

function buildDemo() {
  const store = new Store(':memory:');
  seedSampleData(store);
  return buildBriefing({
    store,
    odds: new MockOddsProvider(),
    fotmob: createOfflineFotMobClient(),
    now: new Date('2026-06-18T15:00:00.000Z'), // 18:00 Helsinki
    tz: 'Europe/Helsinki',
  });
}

describe('buildBriefing (demo pipeline)', () => {
  it('produces cards only for matches inside the 24h window', async () => {
    const doc = await buildDemo();
    // England–Serbia (prev window) is recap, not a card.
    const ids = doc.cards.map((c) => `${c.homeTeam}–${c.awayTeam}`);
    expect(ids).toContain('Portugal–DR Congo');
    expect(ids).toContain('Crystal Palace–Manchester City');
    expect(ids).not.toContain('England–Serbia');
    expect(doc.date).toBe('2026-06-18');
  });

  it('attaches odds + normalized probabilities + the market favorite (no pick)', async () => {
    const doc = await buildDemo();
    const card = doc.cards.find((c) => c.homeTeam === 'Portugal')!;
    expect(card.odds).toBeDefined();
    const sum = card.odds!.impliedHome + card.odds!.impliedDraw + card.odds!.impliedAway;
    expect(sum).toBeCloseTo(1, 10);
    expect(card.marketFavorite?.outcome).toBe('home'); // Portugal clear favorite
    expect(card.marketFavorite!.prob).toBeGreaterThan(0.6);
    // Direct analysis only — no pick/recommendation fields.
    expect('pick' in card).toBe(false);
    expect('recommendation' in card).toBe(false);
  });

  it('enriches the FotMob-linked card with real XIs and injuries', async () => {
    const doc = await buildDemo();
    const card = doc.cards.find((c) => c.homeTeam === 'Crystal Palace')!;
    expect(card.lineup).toBeDefined();
    expect(card.lineup!.home.starters).toHaveLength(11);
    expect(card.lineup!.away.starters).toHaveLength(11);
    expect(card.lineup!.home.unavailable.length).toBeGreaterThan(0);
  });

  it('lists the previous window as a results recap (final scores)', async () => {
    const doc = await buildDemo();
    expect(doc.recap).toHaveLength(1);
    expect(doc.recap[0]).toMatchObject({
      homeTeam: 'England',
      awayTeam: 'Serbia',
      result: { homeGoals: 2, awayGoals: 0 },
    });
  });
});
