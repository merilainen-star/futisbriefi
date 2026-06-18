/**
 * Parse prediction-game picks in the format I enter them:  HOME–AWAY h–a
 *   e.g.  "Portugal–DR Congo 1–1"   →  { Portugal, DR Congo, 1, 1 }
 *
 * Rules:
 *  - Teams are separated by an EN DASH "–" (home team first, FIFA order). A plain
 *    hyphen is NOT accepted as the team separator, because team names contain
 *    hyphens (e.g. "Guinea-Bissau"). The score may use either dash.
 *  - Blank lines and lines starting with "#" are ignored.
 */
export interface ParsedPick {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

const SCORE_RE = /\s+(\d+)\s*[–—-]\s*(\d+)\s*$/;

export function parsePickLine(line: string): ParsedPick | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const score = SCORE_RE.exec(trimmed);
  if (!score) {
    throw new Error(`Pick line has no "h–a" score at the end: "${line}"`);
  }
  const teamsPart = trimmed.slice(0, score.index).trim();

  // Team separator must be an en/em dash, not a hyphen.
  const sepIndex = teamsPart.search(/[–—]/);
  if (sepIndex === -1) {
    throw new Error(`Expected an en dash "–" between teams in: "${line}"`);
  }
  const homeTeam = teamsPart.slice(0, sepIndex).trim();
  const awayTeam = teamsPart.slice(sepIndex + 1).trim();
  if (!homeTeam || !awayTeam) {
    throw new Error(`Could not read both team names in: "${line}"`);
  }

  return {
    homeTeam,
    awayTeam,
    homeGoals: Number(score[1]),
    awayGoals: Number(score[2]),
  };
}

export function parsePicks(text: string): ParsedPick[] {
  const out: ParsedPick[] = [];
  for (const line of text.split(/\r?\n/)) {
    const p = parsePickLine(line);
    if (p) out.push(p);
  }
  return out;
}
