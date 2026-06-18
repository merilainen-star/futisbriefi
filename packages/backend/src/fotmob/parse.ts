import type {
  FotmobFixture,
  FotmobMatchDetails,
  FotmobPlayer,
  FotmobTeamLineup,
  FotmobUnavailable,
} from './types.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- raw FotMob JSON is untyped */

function asPlayer(p: any): FotmobPlayer {
  return {
    id: Number(p?.id),
    name: String(p?.name ?? ''),
    shirtNumber: p?.shirtNumber != null ? String(p.shirtNumber) : undefined,
  };
}

function asUnavailable(p: any): FotmobUnavailable {
  return {
    id: Number(p?.id),
    name: String(p?.name ?? ''),
    type: p?.unavailability?.type ?? undefined,
    expectedReturn: p?.unavailability?.expectedReturn ?? undefined,
  };
}

function coachName(raw: any): string | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw[0]?.name ?? undefined;
  return raw.name ?? undefined;
}

function asTeamLineup(team: any): FotmobTeamLineup {
  return {
    teamId: Number(team?.id),
    teamName: String(team?.name ?? ''),
    formation: team?.formation ?? undefined,
    coach: coachName(team?.coach),
    starters: Array.isArray(team?.starters) ? team.starters.map(asPlayer) : [],
    subs: Array.isArray(team?.subs) ? team.subs.map(asPlayer) : [],
    unavailable: Array.isArray(team?.unavailable) ? team.unavailable.map(asUnavailable) : [],
  };
}

/**
 * Parse a FotMob /api/data/matchDetails payload into our normalized shape.
 *
 * Kickoff comes from general.matchTimeUTCDate, which is already a UTC ISO string
 * — we keep it as the canonical UTC instant and never shift it (see core/time).
 */
export function parseMatchDetails(json: any): FotmobMatchDetails {
  const g = json?.general ?? {};
  const lineup = json?.content?.lineup ?? {};
  const lineupType: string | undefined = lineup?.lineupType ?? undefined;

  return {
    matchId: String(g?.matchId ?? ''),
    homeTeamName: String(g?.homeTeam?.name ?? lineup?.homeTeam?.name ?? ''),
    awayTeamName: String(g?.awayTeam?.name ?? lineup?.awayTeam?.name ?? ''),
    koUtc: String(g?.matchTimeUTCDate ?? ''),
    started: Boolean(g?.started),
    finished: Boolean(g?.finished),
    lineupType,
    lineupSource: lineup?.source ?? undefined,
    confirmedXI: lineupType != null && lineupType.toLowerCase() !== 'predicted',
    home: asTeamLineup(lineup?.homeTeam ?? {}),
    away: asTeamLineup(lineup?.awayTeam ?? {}),
  };
}

/** Parse a FotMob /api/data/matches?date= payload into a flat fixture list. */
export function parseFixturesByDate(json: any): FotmobFixture[] {
  const leagues: any[] = Array.isArray(json?.leagues) ? json.leagues : [];
  const out: FotmobFixture[] = [];
  for (const league of leagues) {
    const matches: any[] = Array.isArray(league?.matches) ? league.matches : [];
    for (const m of matches) {
      out.push({
        matchId: String(m?.id),
        homeTeam: String(m?.home?.name ?? ''),
        awayTeam: String(m?.away?.name ?? ''),
        koUtc: String(m?.status?.utcTime ?? m?.time ?? ''),
        started: Boolean(m?.status?.started),
        finished: Boolean(m?.status?.finished),
        leagueId: Number(league?.id),
        leagueName: String(league?.name ?? ''),
        groupName: league?.isGroup ? (league?.name ?? undefined) : undefined,
      });
    }
  }
  return out;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
