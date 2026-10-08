import nodemailer, { Transporter } from 'nodemailer';
import dns from 'dns';
import fs from 'fs';
import { PrismaClient, Prisma } from '@prisma/client';
import { seal, open, needsReseal } from './secretbox';

// Mail transport (D-043 Stage 4, dashboard settings D-044). Precedence:
// 1. MAIL_DRY_RUN=1                → nothing leaves the machine; messages are logged.
// 2. Dashboard settings (enabled)  → SiteSetting["mail.smtp"], password AES-GCM sealed.
// 3. SMTP_HOST env                 → that server (SMTP_PORT default 587, SMTP_SECURE, SMTP_USER/PASSWORD).
// 4. Fallback                      → the VPS's own Postfix on localhost:25 (relays for
//                                    127.0.0.1 without auth; self-signed STARTTLS ok for localhost only).
const prisma = new PrismaClient();
const DRY = process.env.MAIL_DRY_RUN === '1';
export const SMTP_KEY = 'mail.smtp';
const DEFAULT_FROM = { name: 'المتابع', address: 'noreply@mutabe3.news' };

export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean; // true = implicit TLS (465); false = STARTTLS required (587) unless localhost
  user: string;
  passEnc?: string | null;
  fromName: string;
  fromEmail: string;
  updatedAt?: string;
  updatedBy?: string;
}

type Source = 'dry-run' | 'dashboard' | 'env' | 'local';
interface Conf { source: Source; host: string; port: number; secure: boolean; user?: string; pass?: string; from: { name: string; address: string }; error?: string }

const isLocal = (h: string) => h === 'localhost' || h === '127.0.0.1' || h === '::1';

// DKIM (PLAN Q5): the VPS's Postfix is shared and does not sign, so mail we hand to it is signed here
// with a mutabe3-only key (DKIM_KEY_FILE, selector DKIM_SELECTOR, public half in the mutabe3.news zone).
// Only for the local route and only when the sender is @mutabe3.news; external providers sign themselves.
const DKIM_SELECTOR = process.env.DKIM_SELECTOR || 'm3';
let dkimKey: string | null | undefined;
function dkimFor(c: Pick<Conf, 'host' | 'from'>) {
  const domain = c.from.address.split('@')[1]?.toLowerCase();
  if (!isLocal(c.host) || domain !== 'mutabe3.news' || !process.env.DKIM_KEY_FILE) return undefined;
  if (dkimKey === undefined) {
    try { dkimKey = fs.readFileSync(process.env.DKIM_KEY_FILE, 'utf8'); } catch (e: any) { dkimKey = null; console.error(`DKIM key unreadable: ${e?.code || e}`); }
  }
  return dkimKey ? { domainName: domain, keySelector: DKIM_SELECTOR, privateKey: dkimKey } : undefined;
}

function parseEnvFrom(v?: string) {
  if (!v) return DEFAULT_FROM;
  const m = v.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || DEFAULT_FROM.name, address: m[2].trim() } : { name: DEFAULT_FROM.name, address: v.trim() };
}

export async function readSmtp(): Promise<SmtpSettings | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SMTP_KEY } });
  if (!row) return null;
  const v = row.value as unknown as SmtpSettings;
  // D-073/D-079: a password sealed under an older root (v1/v2) is re-sealed with the current one on first read
  if (needsReseal(v.passEnc)) {
    const plain = open(v.passEnc);
    if (plain !== null) {
      const next = { ...v, passEnc: seal(plain, 'smtp') };
      await prisma.siteSetting.update({ where: { key: SMTP_KEY }, data: { value: next as unknown as Prisma.InputJsonObject } });
      return next;
    }
  }
  return v;
}

export async function writeSmtp(s: SmtpSettings) {
  const value = s as unknown as Prisma.InputJsonObject;
  await prisma.siteSetting.upsert({ where: { key: SMTP_KEY }, update: { value }, create: { key: SMTP_KEY, value } });
  resetMailTransport();
}

export const sealPassword = (plain: string) => seal(plain, 'smtp');
export const passwordReadable = (s: SmtpSettings | null) => (s?.passEnc ? open(s.passEnc) !== null : null);

async function effectiveConf(): Promise<Conf> {
  if (DRY) return { source: 'dry-run', host: '-', port: 0, secure: false, from: parseEnvFrom(process.env.SMTP_FROM) };
  const s = await readSmtp().catch(() => null);
  if (s?.enabled && s.host) {
    const pass = s.passEnc ? open(s.passEnc) : undefined;
    return {
      source: 'dashboard', host: s.host, port: s.port, secure: s.secure, user: s.user || undefined, pass: pass ?? undefined,
      from: { name: s.fromName || DEFAULT_FROM.name, address: s.fromEmail || DEFAULT_FROM.address },
      error: s.passEnc && pass === null ? 'تعذّر فك تشفير كلمة مرور البريد المحفوظة — أعد إدخالها في إعدادات البريد' : undefined,
    };
  }
  if (process.env.SMTP_HOST) {
    return {
      source: 'env', host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || '587', 10), secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD, from: parseEnvFrom(process.env.SMTP_FROM),
    };
  }
  return { source: 'local', host: 'localhost', port: 25, secure: false, from: parseEnvFrom(process.env.SMTP_FROM) };
}

function build(c: Pick<Conf, 'host' | 'port' | 'secure' | 'user' | 'pass'> & { from?: Conf['from'] }, pool: boolean): Transporter {
  const local = isLocal(c.host);
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: c.user ? { user: c.user, pass: c.pass || '' } : undefined,
    requireTLS: !c.secure && !local, // never send credentials in clear to a remote server
    tls: local ? { rejectUnauthorized: false } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    dkim: c.from ? dkimFor({ host: c.host, from: c.from }) : undefined,
    ...(pool ? { pool: true, maxConnections: 2, rateDelta: 1000, rateLimit: 5 } : {}), // ≤5 msgs/s
  } as any);
}

// Settings are re-read at most every 30 s (or immediately after a save); the pooled
// transport is rebuilt only when the effective configuration actually changes.
let cache: { t: Transporter; conf: Conf; key: string; at: number } | null = null;
export function resetMailTransport() { if (cache) cache.at = 0; }

async function transport() {
  if (cache && Date.now() - cache.at < 30_000) return cache;
  const conf = await effectiveConf();
  const key = JSON.stringify([conf.source, conf.host, conf.port, conf.secure, conf.user, conf.pass, conf.from]);
  if (cache && cache.key === key) { cache.at = Date.now(); cache.conf = conf; return cache; }
  const t = DRY ? nodemailer.createTransport({ jsonTransport: true }) : build(conf, true);
  const old = cache?.t;
  cache = { t, conf, key, at: Date.now() };
  if (old) setTimeout(() => old.close(), 60_000).unref?.(); // let in-flight sends finish first
  return cache;
}

export interface MailOpts { to: string; subject: string; html: string; text?: string; headers?: Record<string, string> }

export async function sendMail(o: MailOpts) {
  const { t, conf } = await transport();
  if (conf.error) throw new Error(conf.error);
  const info = await t.sendMail({ from: conf.from, ...o });
  if (DRY) console.log(`✉️  [dry-run] to=${o.to} subject=${o.subject}`);
  return info;
}

/** Log in to an SMTP server and log out again — no message is sent. */
export async function verifySmtp(c: { host: string; port: number; secure: boolean; user?: string; pass?: string }) {
  const t = build(c, false);
  try {
    await t.verify();
    return { ok: true as const };
  } catch (e: any) {
    const code = e?.responseCode ? ` (${e.responseCode})` : e?.code ? ` (${e.code})` : '';
    return { ok: false as const, error: `${String(e?.response || e?.message || e).slice(0, 240)}${code}` };
  } finally {
    t.close();
  }
}

const mask = (u?: string) => (!u ? null : u.includes('@') ? u.replace(/^(.{2}).*(@.*)$/, '$1***$2') : `${u.slice(0, 3)}***`);

/** What the dashboard shows about mail: transport source, sender, and the sender domain's SPF/DMARC. */
export async function mailStatus() {
  const conf = await effectiveConf();
  const domain = (conf.from.address.split('@')[1] || 'mutabe3.news').toLowerCase();
  const txt = async (name: string) => { try { return (await dns.promises.resolveTxt(name)).map((r) => r.join('')); } catch { return []; } };
  const [root, dmarc, dkimTxt] = await Promise.all([txt(domain), txt(`_dmarc.${domain}`), txt(`${DKIM_SELECTOR}._domainkey.${domain}`)]);
  return {
    mode: DRY ? 'dry-run' : 'smtp',
    source: conf.source,
    host: DRY ? null : `${conf.host}:${conf.port}`,
    user: mask(conf.user),
    from: `${conf.from.name} <${conf.from.address}>`,
    domain,
    spf: root.some((r) => r.toLowerCase().startsWith('v=spf1')),
    dmarc: dmarc.some((r) => r.toLowerCase().startsWith('v=dmarc1')),
    dkim: !DRY && !!dkimFor(conf) && dkimTxt.some((r) => /p=[A-Za-z0-9+/]{100,}/.test(r)),
    error: conf.error || null,
  };
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;padding:12px 24px;background-color:#c41e3a;color:#fff;text-decoration:none;border-radius:4px;margin:20px 0;">${label}</a>`;

export async function sendVerificationEmail(email: string, name: string, verificationLink: string): Promise<void> {
  try {
    await sendMail({
      to: email,
      subject: 'تفعيل حسابك في المتابع',
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>مرحباً ${name}</h2>
          <p>شكراً لتسجيلك في موقع المتابع. يرجى تفعيل حسابك بالنقر على الزر أدناه:</p>
          ${button(verificationLink, 'تفعيل الحساب')}
          <p style="color: #666; font-size: 12px;">أو انسخ الرابط التالي في متصفحك:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${verificationLink}</p>
          <p style="color: #999; font-size: 11px;">ينتهي صلاحية هذا الرابط خلال 6 ساعات.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetLink: string): Promise<void> {
  try {
    await sendMail({
      to: email,
      subject: 'إعادة تعيين كلمة المرور',
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>مرحباً ${name}</h2>
          <p>تم طلب إعادة تعيين كلمة المرور. انقر على الزر أدناه:</p>
          ${button(resetLink, 'إعادة تعيين كلمة المرور')}
          <p style="color: #999; font-size: 11px;">ينتهي صلاحية هذا الرابط خلال ساعة واحدة.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
