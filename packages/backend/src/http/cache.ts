import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Tiny disk-backed TTL cache for external responses. Keeps us from hammering
 * FotMob / The Odds API during development and respects their rate limits.
 */
const CACHE_DIR = resolve(process.cwd(), 'data', 'cache');

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

function keyToPath(key: string): string {
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 16);
  return resolve(CACHE_DIR, `${hash}.json`);
}

export function getCached<T>(key: string): T | undefined {
  const path = keyToPath(key);
  if (!existsSync(path)) return undefined;
  try {
    const entry = JSON.parse(readFileSync(path, 'utf8')) as CacheEntry<T>;
    if (Date.now() > entry.expiresAt) return undefined;
    return entry.value;
  } catch {
    return undefined;
  }
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  const entry: CacheEntry<T> = { expiresAt: Date.now() + ttlMs, value };
  writeFileSync(keyToPath(key), JSON.stringify(entry), 'utf8');
}

/** Per-host minimum interval gate, so concurrent calls don't burst a source. */
const lastCallAt = new Map<string, number>();

export async function rateLimit(host: string, minIntervalMs: number): Promise<void> {
  const now = Date.now();
  const last = lastCallAt.get(host) ?? 0;
  const wait = last + minIntervalMs - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt.set(host, Date.now());
}

/** Fetch JSON through the TTL cache + rate limiter. */
export async function cachedJson<T>(
  url: string,
  opts: { ttlMs: number; minIntervalMs?: number; headers?: Record<string, string> } = {
    ttlMs: 60_000,
  },
): Promise<T> {
  const cacheKey = `GET ${url}`;
  const hit = getCached<T>(cacheKey);
  if (hit !== undefined) return hit;

  const host = new URL(url).host;
  await rateLimit(host, opts.minIntervalMs ?? 1000);

  const res = await fetch(url, { headers: opts.headers });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  const value = (await res.json()) as T;
  setCached(cacheKey, value, opts.ttlMs);
  return value;
}
