// No "server-only" guard and no next/headers import (unlike rate-limit.ts's
// getClientIp) — this is pure in-memory bucket logic, safe to unit-test
// directly (see rate-limit-core.test.ts).

type Bucket = { count: number; resetAt: number };

// In-memory, single-process rate limiting — resets on restart and doesn't
// share state across multiple server instances. That's a real, known
// limitation, not a hidden one: this app's current deployment model is a
// single Node process (see docker-compose.yml — no Redis or other shared
// cache), so it's an honest fit for now. Move this to a shared store (e.g.
// Redis) before ever running multiple instances behind a load balancer.
const buckets = new Map<string, Bucket>();

// Periodic sweep so the map doesn't grow unbounded with long-expired keys.
// unref() so this timer alone never keeps the Node process (or a test/script
// importing this module) alive.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  },
  5 * 60 * 1000,
).unref();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** A fixed-window limiter: `limit` attempts per `windowMs`, keyed by caller. */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function formatRetryAfter(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "a minute" : `${minutes} minutes`;
}
