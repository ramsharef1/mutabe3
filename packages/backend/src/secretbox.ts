import crypto from 'crypto';

// Encryption at rest for secrets saved from the dashboard (the SMTP password, D-044).
// AES-256-GCM with a key derived from the server's JWT_SECRET (domain-separated),
// so a database dump alone does not reveal the password. If JWT_SECRET is ever
// rotated, stored values stop decrypting and the dashboard asks for the password again.
const KEY = crypto.createHash('sha256').update(`mutabe3:smtp:v1:${process.env.JWT_SECRET || 'dev-mail-key'}`).digest();

export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
}

/** The original string, or null when the box is malformed or was sealed with another key. */
export function open(box: string | null | undefined): string | null {
  if (!box) return null;
  try {
    const [v, iv, tag, ct] = box.split('.');
    if (v !== 'v1') return null;
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
