import crypto from 'crypto';

// Tiny in-memory fixed-window limiter for the public write endpoints (comments,
// votes, newsletter signups). One process serves the API, so memory is enough;
// a restart simply resets the windows.
const hits = new Map<string, { n: number; until: number }>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.until <= now) {
    // Drop expired windows first; clearing everything would let a flood of fresh keys reset every
    // other client's window (D-064).
    if (hits.size > 100_000) {
      for (const [k, v] of hits) if (v.until <= now) hits.delete(k);
      if (hits.size > 100_000) hits.clear();
    }
    hits.set(key, { n: 1, until: now + windowMs });
    return true;
  }
  if (h.n >= limit) return false;
  h.n++;
  return true;
}

/**
 * Requests from this host itself: the Next server renders pages by calling the API on 127.0.0.1, so a
 * per-IP limit must never count them (every reader would share one bucket). Browser traffic arrives
 * through nginx with the reader's address in X-Forwarded-For (verified D-064), never as loopback.
 */
export const isLoopback = (ip?: string) => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

// D-079: own secret, independent of the JWT keys (set to the old JWT_SECRET value on the server so existing
// poll/view dedupe fingerprints keep matching); falls back to JWT_SECRET where it is not set.
const SALT = process.env.FINGERPRINT_SALT || process.env.JWT_SECRET || 'dev-salt';

/** Stable, non-reversible fingerprint (salted SHA-256) so raw IPs / voter ids are never stored. */
export const fingerprint = (...parts: string[]) => crypto.createHash('sha256').update([SALT, ...parts].join('|')).digest('hex').slice(0, 40);
