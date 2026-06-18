/**
 * Normalized FotMob shapes. FotMob is the standing source for each match's
 * lineups / injuries / Opta data. We fetch live JSON (see jsonClient) rather than
 * the static HTML, which lags (the lineup/injury widget renders client-side).
 */

export interface FotmobPlayer {
  id: number;
  name: string;
  shirtNumber?: string;
}

export interface FotmobUnavailable {
  id: number;
  name: string;
  /** "injury" | "suspension" | "national_duty" | ... (FotMob's raw type). */
  type?: string;
  /** Free-text expected return, e.g. "Early September 2025". */
  expectedReturn?: string;
}

export interface FotmobTeamLineup {
  teamId: number;
  teamName: string;
  formation?: string;
  coach?: string;
  starters: FotmobPlayer[];
  subs: FotmobPlayer[];
  /** Injured / suspended / otherwise unavailable players. */
  unavailable: FotmobUnavailable[];
}

export interface FotmobMatchDetails {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  /** Kickoff in UTC (ISO-8601) — taken from FotMob's matchTimeUTCDate. */
  koUtc: string;
  started: boolean;
  finished: boolean;
  /** FotMob's raw lineup type, e.g. "predicted" | "confirmed" | "standard". */
  lineupType?: string;
  lineupSource?: string;
  /** False only when FotMob explicitly marks the XI as "predicted". */
  confirmedXI: boolean;
  home: FotmobTeamLineup;
  away: FotmobTeamLineup;
}

export interface FotmobFixture {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  /** Kickoff in UTC (ISO-8601). */
  koUtc: string;
  started: boolean;
  finished: boolean;
  leagueId: number;
  leagueName: string;
  /** Parent league id — World Cup finals = 77. */
  parentLeagueId?: number;
  parentLeagueName?: string;
  /** FotMob group label when present, e.g. "World Cup Grp. A". */
  groupName?: string;
}

export interface FotMobClient {
  readonly name: string;
  getMatchDetails(matchId: string): Promise<FotmobMatchDetails>;
  /** date as YYYYMMDD (FotMob's format). */
  getFixturesByDate(yyyymmdd: string): Promise<FotmobFixture[]>;
}
