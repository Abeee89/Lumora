/**
 * NFR-012 and API-CONVENTIONS section 10: fixed 60 second windows in
 * `rate_limit_counters`. The port is small so a module never learns the storage.
 *
 * Failure policy is the caller's: reads fail open, sign-in, sign-up and reset fail
 * closed (API-SECURITY section 4). The port throws; the caller decides.
 */
import type { Queryable } from "./db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

export interface RateLimiter {
  consume(bucket: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

function windowStart(now: Date, windowSeconds: number): Date {
  const size = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / size) * size);
}

export function createPostgresRateLimiter(
  database: Queryable,
  now: () => Date = () => new Date(),
): RateLimiter {
  return {
    async consume(bucket, limit, windowSeconds) {
      const start = windowStart(now(), windowSeconds);
      const rows = await database.query<{ hits: number }>(
        `INSERT INTO rate_limit_counters (bucket, window_start, hits)
         VALUES ($1, $2, 1)
         ON CONFLICT (bucket, window_start) DO UPDATE SET hits = rate_limit_counters.hits + 1
         RETURNING hits`,
        [bucket, start.toISOString()],
      );
      const hits = rows[0]?.hits ?? limit + 1;
      const resetSeconds = Math.max(
        1,
        Math.ceil((start.getTime() + windowSeconds * 1000 - now().getTime()) / 1000),
      );
      return { allowed: hits <= limit, remaining: Math.max(0, limit - hits), resetSeconds };
    },
  };
}

export function createMemoryRateLimiter(now: () => Date = () => new Date()): RateLimiter {
  const counters = new Map<string, { start: number; hits: number }>();
  return {
    async consume(bucket, limit, windowSeconds) {
      const current = now();
      const start = windowStart(current, windowSeconds).getTime();
      const entry = counters.get(bucket);
      const hits = entry === undefined || entry.start !== start ? 1 : entry.hits + 1;
      counters.set(bucket, { start, hits });
      return {
        allowed: hits <= limit,
        remaining: Math.max(0, limit - hits),
        resetSeconds: Math.max(1, Math.ceil((start + windowSeconds * 1000 - current.getTime()) / 1000)),
      };
    },
  };
}