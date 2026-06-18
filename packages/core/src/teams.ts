/**
 * FIFA home-away order rule — this has burned us before.
 *
 * Matches and scores are ALWAYS home team first, e.g. "CIV–ECU 0–1" (never
 * flipped to the away team first). Results are entered in the prediction game in
 * this same order. The home/away split is decided once when a Match is created;
 * everything here only formats what is already stored — it never reorders.
 */

/** En dash used between teams and between goals (NOT a hyphen). */
export const EN_DASH = '–';

/** "CIV–ECU" */
export function formatFixture(homeTeam: string, awayTeam: string): string {
  return `${homeTeam}${EN_DASH}${awayTeam}`;
}

/** "CIV–ECU 0–1" — home goals are always paired with the home team. */
export function formatScoreline(
  homeTeam: string,
  awayTeam: string,
  homeGoals: number,
  awayGoals: number,
): string {
  return `${formatFixture(homeTeam, awayTeam)} ${homeGoals}${EN_DASH}${awayGoals}`;
}

/**
 * Map a country/team name to a canonical key for cross-source matching.
 * Different feeds spell the same nation differently (FotMob "Czechia" vs The Odds
 * API "Czech Republic", "Bosnia and Herzegovina" vs "Bosnia & Herzegovina",
 * "Türkiye" vs "Turkey"). Normalize accents/punctuation, expand "&"→"and", then
 * fold known aliases to one canonical spelling.
 */
const TEAM_ALIASES: Record<string, string> = {
  'czech republic': 'czechia',
  'korea republic': 'south korea',
  'korea dpr': 'north korea',
  'united states': 'usa',
  'united states of america': 'usa',
  us: 'usa',
  'cote divoire': 'ivory coast',
  'democratic republic of congo': 'dr congo',
  'congo dr': 'dr congo',
  'ir iran': 'iran',
  turkiye: 'turkey',
  'cabo verde': 'cape verde',
  'china pr': 'china',
};

export function canonicalTeam(name: string): string {
  let s = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  const alias = TEAM_ALIASES[s];
  if (alias) s = alias;
  return s.replace(/\s+/g, '');
}

export type Outcome = 'home' | 'draw' | 'away';

/** The 1X2 outcome of a scoreline, from the home team's perspective. */
export function scoreOutcome(homeGoals: number, awayGoals: number): Outcome {
  if (homeGoals > awayGoals) return 'home';
  if (homeGoals < awayGoals) return 'away';
  return 'draw';
}
