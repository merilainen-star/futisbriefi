import type { AppConfig } from '../config.js';
import { FixtureFotMobClient } from './fixtureClient.js';
import { JsonFotMobClient } from './jsonClient.js';
import { PlaywrightFotMobClient } from './playwrightClient.js';
import type { FotMobClient } from './types.js';

export * from './types.js';
export { parseMatchDetails, parseFixturesByDate } from './parse.js';
export { JsonFotMobClient } from './jsonClient.js';
export { PlaywrightFotMobClient } from './playwrightClient.js';
export { FixtureFotMobClient } from './fixtureClient.js';

/** Build the FotMob client chosen in config. */
export function createFotMobClient(config: AppConfig): FotMobClient {
  if (config.fotmob.client === 'playwright') {
    return new PlaywrightFotMobClient(config.fotmob.userAgent);
  }
  return new JsonFotMobClient({
    userAgent: config.fotmob.userAgent,
    token: config.fotmob.token,
  });
}

/** The offline client, for tests/demos with no network. */
export function createOfflineFotMobClient(): FotMobClient {
  return new FixtureFotMobClient();
}
