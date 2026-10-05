import crypto from 'crypto';

// Tiny in-memory fixed-window limiter for the public write endpoints (comments,
// votes, newsletter signups). One process serves the API, so memory is enough;
// a restart simply resets the windows.
const hits = new Map<string, { n: number; until: number }>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.until <= now) {
    if (hits.size > 100_000) hits.clear();
    hits.set(key, { n: 1, until: now + windowMs });
    return true;
  }
  if (h.n >= limit) return false;
  h.n++;
  return true;
}

const SALT = process.env.JWT_SECRET || 'dev-salt';

/** Stable, non-reversible fingerprint (salted SHA-256) so raw IPs / voter ids are never stored. */
export const fingerprint = (...parts: string[]) => crypto.createHash('sha256').update([SALT, ...parts].join('|')).digest('hex').slice(0, 40);
