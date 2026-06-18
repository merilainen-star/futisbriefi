import type { AppConfig } from '../config.js';
import { MockOddsProvider } from './mock.js';
import type { OddsProvider } from './provider.js';
import { TheOddsApiProvider } from './theOddsApi.js';

export * from './provider.js';
export { MockOddsProvider } from './mock.js';
export { TheOddsApiProvider, parseOddsApiResponse } from './theOddsApi.js';

/** Build the odds provider chosen in config, falling back to mock if no key. */
export function createOddsProvider(config: AppConfig): OddsProvider {
  if (config.odds.provider === 'theoddsapi') {
    if (!config.odds.apiKey) {
      throw new Error(
        'ODDS_PROVIDER=theoddsapi but ODDS_API_KEY is empty. ' +
          'Set the key in .env or use ODDS_PROVIDER=mock.',
      );
    }
    return new TheOddsApiProvider({
      apiKey: config.odds.apiKey,
      sportKey: config.odds.sportKey,
      regions: config.odds.regions,
      markets: config.odds.markets,
    });
  }
  return new MockOddsProvider();
}
