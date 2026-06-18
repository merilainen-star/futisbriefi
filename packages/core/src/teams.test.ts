import { describe, expect, it } from 'vitest';
import { EN_DASH, formatFixture, formatScoreline, scoreOutcome } from './teams.js';

describe('FIFA home-away ordering', () => {
  it('formats the fixture home team first with an en dash', () => {
    expect(formatFixture('CIV', 'ECU')).toBe('CIV–ECU');
    expect(formatFixture('CIV', 'ECU')).not.toBe('ECU–CIV');
  });

  it('pairs home goals with the home team — "CIV–ECU 0–1", never flipped', () => {
    expect(formatScoreline('CIV', 'ECU', 0, 1)).toBe('CIV–ECU 0–1');
    expect(formatScoreline('Portugal', 'DR Congo', 1, 1)).toBe('Portugal–DR Congo 1–1');
  });

  it('uses an en dash, not a hyphen', () => {
    expect(formatScoreline('CIV', 'ECU', 0, 1).includes(EN_DASH)).toBe(true);
    expect(formatScoreline('CIV', 'ECU', 0, 1).includes('-')).toBe(false);
  });
});

describe('scoreOutcome', () => {
  it('reads from the home perspective', () => {
    expect(scoreOutcome(2, 0)).toBe('home');
    expect(scoreOutcome(1, 1)).toBe('draw');
    expect(scoreOutcome(0, 1)).toBe('away');
  });
});
