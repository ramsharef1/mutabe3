import crypto from 'crypto';

// Encryption at rest for secrets saved from the dashboard (the SMTP password D-044, the web-push private
// key D-072). AES-256-GCM, so a database dump alone reveals neither.
//
// Keys (SECURITY S-05, D-073): every purpose gets its own 256-bit key derived from the server's JWT_SECRET
// with HKDF-SHA256 (salt "mutabe3-secretbox", info = purpose), so the SMTP seal, the push seal and the JWT
// signature never share key material. Boxes are "v2.<purpose>.iv.tag.ct". Older "v1" boxes (one SHA-256
// derived key for everything) still open, and callers re-seal them as v2 the first time they read them.
// If JWT_SECRET is ever rotated, stored values stop decrypting and the dashboard asks for them again.
const ROOT = process.env.JWT_SECRET || 'dev-mail-key';
const LEGACY_V1 = crypto.createHash('sha256').update(`mutabe3:smtp:v1:${ROOT}`).digest();
export type SealPurpose = 'smtp' | 'push';
const keyFor = (purpose: SealPurpose) => Buffer.from(crypto.hkdfSync('sha256', ROOT, 'mutabe3-secretbox', `seal:${purpose}`, 32));

export function seal(plain: string, purpose: SealPurpose = 'smtp'): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', keyFor(purpose), iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v2', purpose, iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
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
    if (p[0] === 'v2' && (p[1] === 'smtp' || p[1] === 'push')) return decrypt(keyFor(p[1]), p[2], p[3], p[4]);
    if (p[0] === 'v1') return decrypt(LEGACY_V1, p[1], p[2], p[3]);
    return null;
  } catch {
    return null;
  }
}

/** True for a box in the old single-key format that should be re-sealed (v1 → v2). */
export const needsReseal = (box: string | null | undefined) => !!box && box.startsWith('v1.');
