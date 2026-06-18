import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFixturesByDate, parseMatchDetails } from './parse.js';
import type { FotMobClient, FotmobFixture, FotmobMatchDetails } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, '__fixtures__');

function loadJson(file: string): unknown {
  return JSON.parse(readFileSync(resolve(fixturesDir, file), 'utf8'));
}

/**
 * Offline client backed by captured sample payloads. Lets the briefing pipeline,
 * the print-CLI, and tests run deterministically with no network — analogous to
 * MockOddsProvider. Returns the sample match regardless of the requested id.
 */
export class FixtureFotMobClient implements FotMobClient {
  readonly name = 'fixture';

  async getMatchDetails(_matchId: string): Promise<FotmobMatchDetails> {
    return parseMatchDetails(loadJson('matchDetails-sample.json'));
  }

  async getFixturesByDate(_yyyymmdd: string): Promise<FotmobFixture[]> {
    return parseFixturesByDate(loadJson('matchesByDate-sample.json'));
  }
}
