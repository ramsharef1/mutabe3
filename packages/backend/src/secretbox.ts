import crypto from 'crypto';

// Encryption at rest for secrets saved from the dashboard (the SMTP password D-044, the web-push private
// key D-072). AES-256-GCM, so a database dump alone reveals neither.
//
// Keys (SECURITY S-05, D-073, D-079): every purpose gets its own 256-bit key derived with HKDF-SHA256
// (salt "mutabe3-secretbox", info = purpose), so the SMTP seal and the push seal never share key material.
// Root: SEAL_SECRET (D-079, independent of the JWT keys) → boxes "v3.<purpose>.iv.tag.ct". Without it (dev)
// the root is JWT_SECRET and boxes are "v2". Older boxes still open — "v2" (JWT_SECRET root) and "v1" (one
// SHA-256 key) — and callers re-seal them with the current root the first time they read them.
// If SEAL_SECRET is ever rotated, stored values stop decrypting and the dashboard asks for them again.
const JWT_ROOT = process.env.JWT_SECRET || 'dev-mail-key';
const SEAL_ROOT = process.env.SEAL_SECRET || null;
const CUR = SEAL_ROOT ? 'v3' : 'v2';
const LEGACY_V1 = crypto.createHash('sha256').update(`mutabe3:smtp:v1:${JWT_ROOT}`).digest();
export type SealPurpose = 'smtp' | 'push';
const hk = (root: string, purpose: SealPurpose) => Buffer.from(crypto.hkdfSync('sha256', root, 'mutabe3-secretbox', `seal:${purpose}`, 32));
const keyFor = (ver: 'v2' | 'v3', purpose: SealPurpose) => hk(ver === 'v3' ? SEAL_ROOT! : JWT_ROOT, purpose);

export function seal(plain: string, purpose: SealPurpose = 'smtp'): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', keyFor(CUR, purpose), iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [CUR, purpose, iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
}

const decrypt = (key: Buffer, iv: string, tag: string, ct: string) => {
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
};

/** The original string, or null when the box is malformed or was sealed with another key. */
export function open(box: string | null | undefined): string | null {
  if (!box) return null;
  try {
    const p = box.split('.');
    if ((p[0] === 'v2' || (p[0] === 'v3' && SEAL_ROOT)) && (p[1] === 'smtp' || p[1] === 'push')) return decrypt(keyFor(p[0], p[1]), p[2], p[3], p[4]);
    if (p[0] === 'v1') return decrypt(LEGACY_V1, p[1], p[2], p[3]);
    return null;
  } catch {
    return null;
  }
}

/** True for a box sealed under an older root that should be re-sealed with the current one (v1/v2 → v3). */
export const needsReseal = (box: string | null | undefined) => !!box && !box.startsWith(`${CUR}.`) && /^v[12]\./.test(box);
