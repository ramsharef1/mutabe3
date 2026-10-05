import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { sendMail } from './email';

// Newsletter delivery (D-043 Stage 4): render an issue, send it to active
// subscribers in the background, and the optional automatic morning digest.
export const SITE_URL = (process.env.SITE_URL || 'https://mutabe3.news').replace(/\/$/, '');
export const AUTO_KEY = 'newsletter.auto';
export const newToken = () => crypto.randomBytes(18).toString('base64url');

const esc = (s: string) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const abs = (u?: string | null) => (!u ? '' : /^https?:\/\//.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`);
const plain = (html: string) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

type Art = { id: string; title: string; summary: string | null; content: string; featuredImageUrl: string | null; category: { name: string } | null };

export function renderIssue(issue: { subject: string; intro: string | null }, articles: Art[], unsubToken: string) {
  const unsub = `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  const items = articles.map((a) => {
    const link = `${SITE_URL}/article/${a.id}`;
    const blurb = (a.summary || plain(a.content)).slice(0, 220);
    const img = abs(a.featuredImageUrl);
    return `<tr><td style="padding:14px 0;border-bottom:1px solid #eee">
      ${img ? `<a href="${link}"><img src="${esc(img)}" alt="" width="560" style="width:100%;max-width:560px;height:auto;border-radius:6px;display:block;margin-bottom:8px"></a>` : ''}
      ${a.category ? `<div style="color:#990000;font-size:12px;font-weight:bold;margin-bottom:4px">${esc(a.category.name)}</div>` : ''}
      <a href="${link}" style="color:#111;font-size:18px;font-weight:bold;text-decoration:none;line-height:1.5">${esc(a.title)}</a>
      <p style="color:#444;font-size:14px;line-height:1.7;margin:6px 0 0">${esc(blurb)}</p>
    </td></tr>`;
  }).join('');
  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f4f4f4">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4"><tr><td align="center" style="padding:20px 10px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right">
    <tr><td style="background:#990000;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0"><a href="${SITE_URL}" style="color:#fff;text-decoration:none;font-size:22px;font-weight:bold">المتابع</a><span style="font-size:13px;opacity:.85"> · ${esc(issue.subject)}</span></td></tr>
    ${issue.intro ? `<tr><td style="padding:16px 20px 0;color:#333;font-size:15px;line-height:1.8">${esc(issue.intro).replace(/\n/g, '<br>')}</td></tr>` : ''}
    <tr><td style="padding:0 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>
    <tr><td style="padding:18px 20px;color:#888;font-size:12px;line-height:1.7">وصلتك هذه الرسالة لأنك اشتركت في نشرة موقع المتابع الاخباري.<br><a href="${unsub}" style="color:#888">إلغاء الاشتراك بضغطة واحدة</a> · <a href="${SITE_URL}" style="color:#888">mutabe3.news</a></td></tr>
  </table></td></tr></table></body></html>`;
  const text = [issue.subject, issue.intro || '', ...articles.map((a) => `${a.title}\n${SITE_URL}/article/${a.id}`), `إلغاء الاشتراك: ${unsub}`].filter(Boolean).join('\n\n');
  // RFC 8058 one-click unsubscribe (Gmail / Yahoo bulk-sender requirement)
  const headers = { 'List-Unsubscribe': `<${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
  return { html, text, headers };
}

const ARTICLE_SELECT = { id: true, title: true, summary: true, content: true, featuredImageUrl: true, category: { select: { name: true } } } as const;

export async function issueArticles(prisma: PrismaClient, ids: string[]) {
  const rows = await prisma.article.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, select: ARTICLE_SELECT });
  const by = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => by.get(id)).filter(Boolean) as Art[];
}

/** Active subscribers for an edition: those who chose it, plus those who chose nothing (= everything). */
export const recipientWhere = (edition?: string | null) =>
  edition ? { status: 'active', OR: [{ categories: { has: edition } }, { categories: { isEmpty: true } }] } : { status: 'active' };

/** Send one issue to its recipients. Safe against double clicks: only a draft/failed issue can start. */
export async function sendIssue(prisma: PrismaClient, issueId: string) {
  const claimed = await prisma.newsletterIssue.updateMany({ where: { id: issueId, status: { in: ['draft', 'failed'] } }, data: { status: 'sending', sent: 0, failed: 0, lastError: null } });
  if (!claimed.count) return { started: false };
  const issue = await prisma.newsletterIssue.findUniqueOrThrow({ where: { id: issueId } });
  const articles = await issueArticles(prisma, issue.articleIds);
  if (!articles.length) {
    await prisma.newsletterIssue.update({ where: { id: issueId }, data: { status: 'failed', lastError: 'لا توجد مقالات منشورة في هذا العدد' } });
    return { started: false };
  }
  const subs = await prisma.subscription.findMany({ where: recipientWhere(issue.edition), select: { id: true, email: true, unsubToken: true } });
  await prisma.newsletterIssue.update({ where: { id: issueId }, data: { recipients: subs.length } });
  let sent = 0, failed = 0, lastError: string | null = null;
  for (const [i, s] of subs.entries()) {
    try {
      let token = s.unsubToken;
      if (!token) { token = newToken(); await prisma.subscription.update({ where: { id: s.id }, data: { unsubToken: token } }); }
      const { html, text, headers } = renderIssue(issue, articles, token);
      await sendMail({ to: s.email, subject: issue.subject, html, text, headers });
      sent++;
    } catch (e: any) {
      failed++;
      lastError = String(e?.message || e).slice(0, 300);
    }
    if ((i + 1) % 20 === 0) await prisma.newsletterIssue.update({ where: { id: issueId }, data: { sent, failed, lastError } });
  }
  await prisma.newsletterIssue.update({
    where: { id: issueId },
    data: { sent, failed, lastError, status: sent === 0 && failed > 0 ? 'failed' : 'sent', sentAt: new Date() },
  });
  console.log(`📰 newsletter ${issueId}: ${sent} sent, ${failed} failed of ${subs.length}`);
  return { started: true, sent, failed };
}

/* ───────────── automatic morning digest (off by default) ───────────── */

export interface AutoSetting { enabled: boolean; hour: number; lastDate?: string }

export async function readAuto(prisma: PrismaClient): Promise<AutoSetting> {
  const row = await prisma.siteSetting.findUnique({ where: { key: AUTO_KEY } });
  const v = (row?.value || {}) as Partial<AutoSetting>;
  return { enabled: !!v.enabled, hour: Number.isInteger(v.hour) ? (v.hour as number) : 7, lastDate: v.lastDate };
}

export async function writeAuto(prisma: PrismaClient, s: AutoSetting) {
  const value = { enabled: !!s.enabled, hour: Math.min(23, Math.max(0, Math.round(s.hour))), ...(s.lastDate ? { lastDate: s.lastDate } : {}) };
  await prisma.siteSetting.upsert({ where: { key: AUTO_KEY }, update: { value }, create: { key: AUTO_KEY, value } });
  return value;
}

const ammanNow = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: parseInt(p.hour, 10) };
};

/** Called every minute by the scheduler: at the configured Amman hour, once a day, build and send the digest. */
export async function autoDigestTick(prisma: PrismaClient) {
  const s = await readAuto(prisma);
  if (!s.enabled) return;
  const now = ammanNow();
  if (now.hour !== s.hour || s.lastDate === now.date) return;
  await writeAuto(prisma, { ...s, lastDate: now.date }); // claim the day first so a slow send never repeats
  const since = new Date(Date.now() - 24 * 3600_000);
  const top = await prisma.article.findMany({
    where: { status: 'PUBLISHED', publishedAt: { gte: since } },
    orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
    take: 8,
    select: { id: true },
  });
  if (!top.length) { console.log('📰 auto digest: nothing published in the last 24h, skipped'); return; }
  const dateAr = new Intl.DateTimeFormat('ar-JO', { timeZone: 'Asia/Amman', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const issue = await prisma.newsletterIssue.create({
    data: { subject: `نشرة المتابع الصباحية — ${dateAr}`, intro: 'أبرز ما نشره موقع المتابع خلال الساعات الأربع والعشرين الماضية.', articleIds: top.map((t) => t.id), auto: true },
  });
  sendIssue(prisma, issue.id).catch((e) => console.error('auto digest:', e));
}
