import { parseFixturesByDate, parseMatchDetails } from './parse.js';
import type { FotMobClient, FotmobFixture, FotmobMatchDetails } from './types.js';

const BASE = 'https://www.fotmob.com/api/data';

/**
 * Option B (fallback): drive a real headless browser so FotMob's own scripts
 * produce whatever request headers/cookies it now requires. We fetch the JSON
 * through the browser's network stack (context.request), which carries the real
 * fingerprint, then reuse the same parsers as the JSON client.
 *
 * Playwright + its Chromium are heavier deps; they're imported lazily so the rest
 * of the backend runs without them. Install once with:  npx playwright install chromium
 */
export class PlaywrightFotMobClient implements FotMobClient {
  readonly name = 'playwright';

  constructor(private readonly userAgent: string) {}

  // request is Playwright's APIRequestContext; typed as any since playwright is an
  // optional, lazily-imported dependency not present at compile time.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async withContext<T>(fn: (request: any) => Promise<T>): Promise<T> {
    let chromium;
    try {
      // Specifier cast to string so TS does not try to resolve the optional module.
      ({ chromium } = await import('playwright' as string));
    } catch {
      throw new Error(
        'FOTMOB_CLIENT=playwright requires the "playwright" package and a browser. ' +
          'Run: npm i -w @fm2026/backend playwright && npx playwright install chromium',
      );
    }
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ userAgent: this.userAgent });
      // Warm up cookies/anti-bot by visiting the site once.
      const page = await context.newPage();
      await page.goto('https://www.fotmob.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.close();
      return await fn(context.request);
    } finally {
      await browser.close();
    }
  }

  async getMatchDetails(matchId: string): Promise<FotmobMatchDetails> {
    return this.withContext(async (request) => {
      const res = await request.get(`${BASE}/matchDetails?matchId=${encodeURIComponent(matchId)}`);
      if (!res.ok()) throw new Error(`FotMob matchDetails via Playwright → ${res.status()}`);
      return parseMatchDetails(await res.json());
    });
  }

  async getFixturesByDate(yyyymmdd: string): Promise<FotmobFixture[]> {
    return this.withContext(async (request) => {
      const res = await request.get(`${BASE}/matches?date=${encodeURIComponent(yyyymmdd)}`);
      if (!res.ok()) throw new Error(`FotMob matches via Playwright → ${res.status()}`);
      return parseFixturesByDate(await res.json());
    });
  }
}
