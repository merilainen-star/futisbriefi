import { cachedJson } from '../http/cache.js';
import { parseFixturesByDate, parseMatchDetails } from './parse.js';
import type { FotMobClient, FotmobFixture, FotmobMatchDetails } from './types.js';

const BASE = 'https://www.fotmob.com/api/data';

export interface JsonFotMobOptions {
  userAgent: string;
  /** Optional auth header value (x-fm-req) if FotMob re-locks the API. */
  token?: string;
}

/**
 * Option A: FotMob live JSON. As of now the /api/data/* endpoints respond without
 * an auth header, but FotMob has historically gated them (x-mas → x-fm-req), so we
 * send a realistic User-Agent and pass an optional token header through. If FotMob
 * re-locks and this starts failing, switch FOTMOB_CLIENT=playwright.
 */
export class JsonFotMobClient implements FotMobClient {
  readonly name = 'json';

  constructor(private readonly opts: JsonFotMobOptions) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'User-Agent': this.opts.userAgent,
      Accept: 'application/json',
    };
    if (this.opts.token) h['x-fm-req'] = this.opts.token;
    return h;
  }

  async getMatchDetails(matchId: string): Promise<FotmobMatchDetails> {
    const url = `${BASE}/matchDetails?matchId=${encodeURIComponent(matchId)}`;
    const json = await cachedJson<unknown>(url, {
      ttlMs: 10 * 60_000,
      minIntervalMs: 1200,
      headers: this.headers(),
    });
    return parseMatchDetails(json);
  }

  async getFixturesByDate(yyyymmdd: string): Promise<FotmobFixture[]> {
    const url = `${BASE}/matches?date=${encodeURIComponent(yyyymmdd)}`;
    const json = await cachedJson<unknown>(url, {
      ttlMs: 10 * 60_000,
      minIntervalMs: 1200,
      headers: this.headers(),
    });
    return parseFixturesByDate(json);
  }
}
