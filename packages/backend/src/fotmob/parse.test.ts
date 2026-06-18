import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseFixturesByDate, parseMatchDetails } from './parse.js';

const here = dirname(fileURLToPath(import.meta.url));
const load = (f: string): unknown =>
  JSON.parse(readFileSync(resolve(here, '__fixtures__', f), 'utf8'));

describe('parseMatchDetails (captured FotMob sample)', () => {
  const d = parseMatchDetails(load('matchDetails-sample.json'));

  it('extracts teams and a clean UTC kickoff (no double-conversion)', () => {
    expect(d.homeTeamName).toBe('Crystal Palace');
    expect(d.awayTeamName).toBe('Manchester City');
    // matchTimeUTCDate is already a UTC ISO instant — kept verbatim.
    expect(d.koUtc).toBe('2024-04-06T11:30:00.000Z');
  });

  it('extracts full starting XIs with shirt numbers', () => {
    expect(d.home.starters).toHaveLength(11);
    expect(d.away.starters).toHaveLength(11);
    expect(d.home.formation).toBe('3-4-2-1');
    expect(d.home.starters[0]!.name).toBe('Dean Henderson');
    expect(d.home.starters[0]!.shirtNumber).toBe('30');
  });

  it('extracts the unavailable list with type and expected return', () => {
    expect(d.home.unavailable).toHaveLength(6);
    expect(d.away.unavailable).toHaveLength(2);
    const injured = d.home.unavailable.find((u) => u.name === 'Caleb Kporha');
    expect(injured?.type).toBe('injury');
    expect(injured?.expectedReturn).toBe('Early September 2025');
  });
});

describe('parseFixturesByDate (captured FotMob sample)', () => {
  const fixtures = parseFixturesByDate(load('matchesByDate-sample.json'));

  it('flattens leagues into a fixture list with UTC kickoffs', () => {
    expect(fixtures.length).toBeGreaterThan(0);
    const turkiye = fixtures.find((f) => f.homeTeam === 'Turkiye' && f.awayTeam === 'Georgia');
    expect(turkiye).toBeDefined();
    expect(turkiye!.koUtc).toBe('2024-06-18T16:00:00.000Z');
    expect(turkiye!.matchId).toBe('4043868');
  });
});
