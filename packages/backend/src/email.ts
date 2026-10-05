import nodemailer from 'nodemailer';
import dns from 'dns';

// Mail transport (D-043 Stage 4).
// - MAIL_DRY_RUN=1  → nothing leaves the machine; messages are logged (local dev / tests).
// - SMTP_HOST set   → that server (SMTP_PORT default 587, SMTP_SECURE, SMTP_USER/PASSWORD).
// - otherwise       → the VPS's own Postfix on localhost:25, which relays for 127.0.0.1
//                     without a password (checked 2026-10-06). Its STARTTLS cert is
//                     self-signed, so certificate checks are skipped for localhost only.
const DRY = process.env.MAIL_DRY_RUN === '1';
const HOST = process.env.SMTP_HOST || 'localhost';
const PORT = parseInt(process.env.SMTP_PORT || (process.env.SMTP_HOST ? '587' : '25'), 10);
const LOCAL = HOST === 'localhost' || HOST === '127.0.0.1';
export const MAIL_FROM = process.env.SMTP_FROM || 'المتابع <noreply@mutabe3.news>';

const transporter = DRY
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      tls: LOCAL ? { rejectUnauthorized: false } : undefined,
      pool: true,
      maxConnections: 2,
      rateDelta: 1000,
      rateLimit: 5, // ≤5 messages/second keeps the local relay and receiving servers happy
    });

export interface MailOpts { to: string; subject: string; html: string; text?: string; headers?: Record<string, string> }

export async function sendMail(o: MailOpts) {
  const info = await transporter.sendMail({ from: MAIL_FROM, ...o });
  if (DRY) console.log(`✉️  [dry-run] to=${o.to} subject=${o.subject}`);
  return info;
}

const fromDomain = () => (MAIL_FROM.match(/@([^>\s]+)/)?.[1] || 'mutabe3.news').toLowerCase();

/** What the dashboard shows about mail: transport, sender, and whether the sender domain publishes SPF/DMARC. */
export async function mailStatus() {
  const domain = fromDomain();
  const txt = async (name: string) => { try { return (await dns.promises.resolveTxt(name)).map((r) => r.join('')); } catch { return []; } };
  const [root, dmarc] = await Promise.all([txt(domain), txt(`_dmarc.${domain}`)]);
  return {
    mode: DRY ? 'dry-run' : 'smtp',
    host: DRY ? null : `${HOST}:${PORT}`,
    from: MAIL_FROM,
    domain,
    spf: root.some((r) => r.toLowerCase().startsWith('v=spf1')),
    dmarc: dmarc.some((r) => r.toLowerCase().startsWith('v=dmarc1')),
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
