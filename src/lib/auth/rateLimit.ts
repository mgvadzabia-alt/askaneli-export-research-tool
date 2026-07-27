/**
 * In-memory rate limiting for auth endpoints (login/signup) — no external
 * dependency, appropriate for this single-process local tool. Limits repeated
 * attempts by the combination of client IP + the email being tried, so one
 * attacker can't brute-force a single account by hammering it, without
 * locking out every user behind a shared IP for one bad actor's target email.
 *
 * State is process-memory only: it resets on server restart. That's an
 * accepted tradeoff for a local team tool, not a public multi-instance
 * deployment.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

const buckets = new Map<string, Bucket>();

// Periodically forget old buckets so this map doesn't grow unbounded over a
// long-running process. Cheap: only runs when a check happens to land past
// the cleanup interval.
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupIfDue(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
  }
}

/**
 * Records an attempt for `key` and returns whether it's allowed. Once a key
 * exceeds MAX_ATTEMPTS within WINDOW_MS, further attempts are rejected until
 * the window rolls over.
 */
export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  cleanupIfDue(now);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - bucket.windowStart) };
  }

  bucket.count += 1;
  return { allowed: true };
}

/** Best-effort client identifier from request headers (works behind most proxies; falls back to a constant). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
