import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Walk up from this file to find the repo-root .env and load it (once). */
function bootstrapEnv(): void {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fall back to default (cwd/.env); harmless if absent.
  loadDotenv();
}

bootstrapEnv();

function env(key: string, fallback?: string): string {
  const v = process.env[key];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var ${key}`);
  }
  return v;
}

export type OddsProviderName = 'theoddsapi' | 'mock';
export type FotmobClientName = 'json' | 'playwright';

export interface AppConfig {
  appTz: string;
  dbPath: string;
  odds: {
    provider: OddsProviderName;
    apiKey: string | undefined;
    sportKey: string;
    regions: string;
    markets: string;
  };
  fotmob: {
    client: FotmobClientName;
  };
}

export function loadConfig(): AppConfig {
  const provider = env('ODDS_PROVIDER', 'mock') as OddsProviderName;
  return {
    appTz: env('APP_TZ', 'Europe/Helsinki'),
    dbPath: env('DB_PATH', './data/fm2026.db'),
    odds: {
      provider,
      apiKey: process.env.ODDS_API_KEY || undefined,
      sportKey: env('ODDS_SPORT_KEY', 'soccer_fifa_world_cup'),
      regions: env('ODDS_REGIONS', 'eu'),
      markets: env('ODDS_MARKETS', 'h2h'),
    },
    fotmob: {
      client: env('FOTMOB_CLIENT', 'json') as FotmobClientName,
    },
  };
}
