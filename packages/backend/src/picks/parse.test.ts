import { describe, expect, it } from 'vitest';
import { parsePickLine, parsePicks } from './parse.js';

describe('parsePickLine', () => {
  it('parses HOME–AWAY h–a in FIFA order', () => {
    expect(parsePickLine('Portugal–DR Congo 1–1')).toEqual({
      homeTeam: 'Portugal',
      awayTeam: 'DR Congo',
      homeGoals: 1,
      awayGoals: 1,
    });
  });

  it('keeps multi-word team names intact', () => {
    expect(parsePickLine('Ivory Coast–Ecuador 2–1')).toEqual({
      homeTeam: 'Ivory Coast',
      awayTeam: 'Ecuador',
      homeGoals: 2,
      awayGoals: 1,
    });
  });

  it('does not split a hyphenated team name on the hyphen', () => {
    // "Guinea-Bissau" is the home team; en dash separates the two teams.
    expect(parsePickLine('Guinea-Bissau–Togo 0–0')).toEqual({
      homeTeam: 'Guinea-Bissau',
      awayTeam: 'Togo',
      homeGoals: 0,
      awayGoals: 0,
    });
  });

  it('ignores comments and blank lines', () => {
    expect(parsePickLine('# a comment')).toBeNull();
    expect(parsePickLine('   ')).toBeNull();
  });

  it('throws on a missing score or a hyphen-only team separator', () => {
    expect(() => parsePickLine('Portugal–DR Congo')).toThrow(/score/);
    expect(() => parsePickLine('Portugal vs DR Congo 1-1')).toThrow(/en dash/);
  });
});

describe('parsePicks', () => {
  it('parses a multi-line block, skipping comments/blanks', () => {
    const text = ['# header', '', 'Portugal–DR Congo 1–1', 'Netherlands–Canada 2–0'].join('\n');
    expect(parsePicks(text)).toHaveLength(2);
  });
});
