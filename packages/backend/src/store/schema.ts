/** SQLite schema. Timestamps are ISO-8601 UTC strings; teams are home-first. */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS matches (
  id         TEXT PRIMARY KEY,
  fotmob_id  TEXT,
  grp        TEXT,
  home_team  TEXT NOT NULL,
  away_team  TEXT NOT NULL,
  ko_utc     TEXT NOT NULL,
  venue      TEXT
);

CREATE TABLE IF NOT EXISTS odds (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id      TEXT NOT NULL REFERENCES matches(id),
  source        TEXT NOT NULL,
  home          REAL NOT NULL,
  draw          REAL NOT NULL,
  away          REAL NOT NULL,
  captured_at   TEXT NOT NULL,
  implied_home  REAL NOT NULL,
  implied_draw  REAL NOT NULL,
  implied_away  REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_odds_match ON odds(match_id, captured_at);

CREATE TABLE IF NOT EXISTS picks (
  match_id    TEXT PRIMARY KEY REFERENCES matches(id),
  home_goals  INTEGER NOT NULL,
  away_goals  INTEGER NOT NULL,
  locked_at   TEXT
);

CREATE TABLE IF NOT EXISTS briefings (
  date        TEXT PRIMARY KEY,
  json        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
  match_id    TEXT PRIMARY KEY REFERENCES matches(id),
  home_goals  INTEGER NOT NULL,
  away_goals  INTEGER NOT NULL,
  status      TEXT NOT NULL
);
`;
