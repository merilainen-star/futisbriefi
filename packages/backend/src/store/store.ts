import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
// Type-only import (erased before Vite resolves it); the runtime value comes from
// the createRequire call below.
import type { DatabaseSync as SqliteDatabase } from 'node:sqlite';
import type { Briefing, Match, Odds, Pick, Result } from '@fm2026/core';
import { SCHEMA } from './schema.js';

// node:sqlite is a Node built-in, but Vite/Vitest's resolver doesn't yet know it
// and tries to bundle a bare "sqlite". Loading it through createRequire bypasses
// that static analysis while keeping full types.
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite') as typeof import('node:sqlite');

/**
 * SQLite-backed store using Node's built-in node:sqlite (no native build step).
 * One row per entity; teams are stored home-first (FIFA order).
 */
export class Store {
  private readonly db: SqliteDatabase;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      mkdirSync(dirname(resolve(dbPath)), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  // --- matches ---------------------------------------------------------------

  upsertMatch(m: Match): void {
    this.db
      .prepare(
        `INSERT INTO matches (id, fotmob_id, grp, home_team, away_team, ko_utc, venue)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           fotmob_id=excluded.fotmob_id, grp=excluded.grp,
           home_team=excluded.home_team, away_team=excluded.away_team,
           ko_utc=excluded.ko_utc, venue=excluded.venue`,
      )
      .run(
        m.id,
        m.fotmobId ?? null,
        m.group ?? null,
        m.homeTeam,
        m.awayTeam,
        m.koUtc,
        m.venue ?? null,
      );
  }

  getMatch(id: string): Match | undefined {
    const r = this.db.prepare(`SELECT * FROM matches WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    return r ? rowToMatch(r) : undefined;
  }

  listMatches(): Match[] {
    const rows = this.db
      .prepare(`SELECT * FROM matches ORDER BY ko_utc`)
      .all() as Record<string, unknown>[];
    return rows.map(rowToMatch);
  }

  // --- odds ------------------------------------------------------------------

  insertOdds(o: Odds): void {
    this.db
      .prepare(
        `INSERT INTO odds
           (match_id, source, home, draw, away, captured_at,
            implied_home, implied_draw, implied_away)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        o.matchId,
        o.source,
        o.home,
        o.draw,
        o.away,
        o.capturedAt,
        o.impliedHome,
        o.impliedDraw,
        o.impliedAway,
      );
  }

  latestOdds(matchId: string): Odds | undefined {
    const r = this.db
      .prepare(`SELECT * FROM odds WHERE match_id = ? ORDER BY captured_at DESC, id DESC LIMIT 1`)
      .get(matchId) as Record<string, unknown> | undefined;
    return r ? rowToOdds(r) : undefined;
  }

  // --- picks -----------------------------------------------------------------

  upsertPick(p: Pick): void {
    this.db
      .prepare(
        `INSERT INTO picks (match_id, home_goals, away_goals, locked_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(match_id) DO UPDATE SET
           home_goals=excluded.home_goals, away_goals=excluded.away_goals,
           locked_at=excluded.locked_at`,
      )
      .run(p.matchId, p.homeGoals, p.awayGoals, p.lockedAt ?? null);
  }

  getPick(matchId: string): Pick | undefined {
    const r = this.db.prepare(`SELECT * FROM picks WHERE match_id = ?`).get(matchId) as
      | Record<string, unknown>
      | undefined;
    return r ? rowToPick(r) : undefined;
  }

  listPicks(): Pick[] {
    const rows = this.db.prepare(`SELECT * FROM picks`).all() as Record<string, unknown>[];
    return rows.map(rowToPick);
  }

  // --- briefings -------------------------------------------------------------

  saveBriefing(b: Briefing): void {
    this.db
      .prepare(
        `INSERT INTO briefings (date, json, created_at)
         VALUES (?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET json=excluded.json, created_at=excluded.created_at`,
      )
      .run(b.date, JSON.stringify(b), b.createdAt);
  }

  getBriefing(date: string): Briefing | undefined {
    const r = this.db.prepare(`SELECT json FROM briefings WHERE date = ?`).get(date) as
      | { json: string }
      | undefined;
    return r ? (JSON.parse(r.json) as Briefing) : undefined;
  }

  // --- results ---------------------------------------------------------------

  upsertResult(res: Result): void {
    this.db
      .prepare(
        `INSERT INTO results (match_id, home_goals, away_goals, status)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(match_id) DO UPDATE SET
           home_goals=excluded.home_goals, away_goals=excluded.away_goals,
           status=excluded.status`,
      )
      .run(res.matchId, res.homeGoals, res.awayGoals, res.status);
  }

  getResult(matchId: string): Result | undefined {
    const r = this.db.prepare(`SELECT * FROM results WHERE match_id = ?`).get(matchId) as
      | Record<string, unknown>
      | undefined;
    return r ? rowToResult(r) : undefined;
  }
}

function rowToMatch(r: Record<string, unknown>): Match {
  return {
    id: String(r.id),
    fotmobId: r.fotmob_id ? String(r.fotmob_id) : undefined,
    group: r.grp ? String(r.grp) : undefined,
    homeTeam: String(r.home_team),
    awayTeam: String(r.away_team),
    koUtc: String(r.ko_utc),
    venue: r.venue ? String(r.venue) : undefined,
  };
}

function rowToOdds(r: Record<string, unknown>): Odds {
  return {
    matchId: String(r.match_id),
    source: String(r.source),
    home: Number(r.home),
    draw: Number(r.draw),
    away: Number(r.away),
    capturedAt: String(r.captured_at),
    impliedHome: Number(r.implied_home),
    impliedDraw: Number(r.implied_draw),
    impliedAway: Number(r.implied_away),
  };
}

function rowToPick(r: Record<string, unknown>): Pick {
  return {
    matchId: String(r.match_id),
    homeGoals: Number(r.home_goals),
    awayGoals: Number(r.away_goals),
    lockedAt: r.locked_at ? String(r.locked_at) : undefined,
  };
}

function rowToResult(r: Record<string, unknown>): Result {
  return {
    matchId: String(r.match_id),
    homeGoals: Number(r.home_goals),
    awayGoals: Number(r.away_goals),
    status: String(r.status) as Result['status'],
  };
}
