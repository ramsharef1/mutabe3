import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { allow, fingerprint } from '../ratelimit';
import { activePolls, pollDto } from '../polls';
import { newToken, SITE_URL } from '../newsletter';
import { sendMail } from '../email';

// Public reader endpoints (D-043 Stage 4), mounted at /api.
const router = Router();
const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ip = (req: Request) => req.ip || 'unknown';
const tooMany = (res: Response) => res.status(429).json({ error: 'محاولات كثيرة — حاول بعد قليل' });

const publishedId = async (idOrSlug: string) =>
  (await prisma.article.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: 'PUBLISHED' }, select: { id: true } }))?.id || null;

/* ───────────── comments ───────────── */

// GET /api/articles/:id/comments — approved only; never exposes emails or hashes
router.get('/articles/:id/comments', async (req: Request, res: Response) => {
  try {
    const id = await publishedId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Article not found' });
    const rows = await prisma.comment.findMany({
      where: { articleId: id, status: 'APPROVED' },
      select: { id: true, content: true, authorName: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 300,
    });
    res.json({ success: true, data: rows.map((c) => ({ id: c.id, name: c.authorName || c.user?.name || 'قارئ', content: c.content, createdAt: c.createdAt })) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/articles/:id/comments { name, email?, content, website } → held for moderation
router.post('/articles/:id/comments', async (req: Request, res: Response) => {
  try {
    const { name, email, content, website } = req.body || {};
    if (website) return res.status(201).json({ success: true, status: 'PENDING' }); // honeypot: bots get a fake success
    if (!allow(`c:${ip(req)}`, 5, 10 * 60_000)) return tooMany(res);
    const n = String(name || '').trim().slice(0, 60);
    const em = String(email || '').trim().toLowerCase();
    const body = String(content || '').replace(/\r/g, '').trim();
    if (n.length < 2) return res.status(400).json({ error: 'اكتب اسمك (حرفان على الأقل)' });
    if (body.length < 3) return res.status(400).json({ error: 'التعليق قصير جداً' });
    if (body.length > 2000) return res.status(400).json({ error: 'التعليق أطول من 2000 حرف' });
    if (em && !EMAIL_RE.test(em)) return res.status(400).json({ error: 'البريد الإلكتروني غير صالح' });
    const id = await publishedId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Article not found' });
    if (!allow(`ca:${ip(req)}:${id}`, 3, 60 * 60_000)) return tooMany(res);
    await prisma.comment.create({ data: { articleId: id, content: body, authorName: n, authorEmail: em || null, ipHash: fingerprint('ip', ip(req)), status: 'PENDING' } });
    res.status(201).json({ success: true, status: 'PENDING' });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

/* ───────────── polls ───────────── */

router.get('/polls/active', async (_req: Request, res: Response) => {
  try { res.json({ success: true, data: await activePolls(prisma) }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/polls/:id/vote { optionId, voter } — `voter` is a random id the browser keeps;
// one vote per (poll, voter), plus an IP ceiling so clearing storage can't flood a poll.
// (Many Jordanian mobile users share one IP behind carrier NAT, so IP alone can't be the key.)
router.post('/polls/:id/vote', async (req: Request, res: Response) => {
  try {
    const { optionId, voter } = req.body || {};
    const v = String(voter || '');
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(v)) return res.status(400).json({ error: 'voter id required' });
    const poll = await prisma.poll.findUnique({ where: { id: req.params.id }, include: { options: true } });
    if (!poll || !poll.active) return res.status(404).json({ error: 'الاستطلاع مغلق' });
    if (!poll.options.some((o) => o.id === optionId)) return res.status(400).json({ error: 'خيار غير صالح' });
    if (!allow(`v:${ip(req)}:${poll.id}`, 40, 60 * 60_000)) return tooMany(res);
    const voterHash = fingerprint('poll', poll.id, v);
    try {
      await prisma.$transaction([
        prisma.pollVote.create({ data: { pollId: poll.id, optionId, voterHash } }),
        prisma.pollOption.update({ where: { id: optionId }, data: { votes: { increment: 1 } } }),
      ]);
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e; // P2002 = already voted → just return the results
      const fresh = await prisma.poll.findUniqueOrThrow({ where: { id: poll.id }, include: { options: true } });
      return res.status(409).json({ success: false, already: true, data: pollDto(fresh) });
    }
    const fresh = await prisma.poll.findUniqueOrThrow({ where: { id: poll.id }, include: { options: true } });
    res.json({ success: true, data: pollDto(fresh) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

/* ───────────── newsletter ───────────── */

// POST /api/newsletter/subscribe { email, categories?, source?, website } — single opt-in;
// every issue carries a one-click unsubscribe link.
// Confirmation mail for double opt-in (D-054, S-10): plain, one button, one-click unsubscribe not needed yet.
async function sendConfirmMail(email: string, token: string) {
  const link = `${SITE_URL}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f6f6f6;font-family:Tahoma,Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#101033;color:#fff;padding:14px 20px;font-weight:bold;font-size:18px">موقع المتابع الاخباري</td></tr>
<tr><td style="padding:22px 20px;color:#222;font-size:15px;line-height:1.8">
<p style="margin:0 0 12px">طلبت الاشتراك في نشرة المتابع البريدية باستخدام هذا العنوان: <b dir="ltr">${esc(email)}</b>.</p>
<p style="margin:0 0 18px">اضغط الزر لتأكيد الاشتراك. إن لم تكن أنت من طلب ذلك فتجاهل هذه الرسالة ولن تصلك أي رسائل.</p>
<p style="margin:0 0 18px;text-align:center"><a href="${link}" style="display:inline-block;background:#990000;color:#fff;text-decoration:none;padding:12px 26px;border-radius:6px;font-weight:bold">تأكيد الاشتراك</a></p>
<p style="margin:0;color:#666;font-size:12.5px">أو انسخ الرابط: <span dir="ltr">${esc(link)}</span><br>الرابط صالح لمدة 48 ساعة.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `طلبت الاشتراك في نشرة المتابع البريدية (${email}).\nلتأكيد الاشتراك افتح الرابط التالي خلال 48 ساعة:\n${link}\n\nإن لم تكن أنت من طلب ذلك فتجاهل هذه الرسالة.`;
  await sendMail({ to: email, subject: 'أكّد اشتراكك في نشرة المتابع', html, text });
}

// POST /api/newsletter/subscribe — double opt-in: the address is `pending` until the mailed link is used.
// Same neutral answer for new, pending and unsubscribed addresses; an already-active address is told so.
router.post('/newsletter/subscribe', async (req: Request, res: Response) => {
  try {
    const { email, categories, source, website } = req.body || {};
    if (website) return res.json({ success: true, status: 'pending' }); // honeypot
    if (!allow(`n:${ip(req)}`, 6, 60 * 60_000)) return tooMany(res);
    const em = String(email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(em) || em.length > 200) return res.status(400).json({ error: 'البريد الإلكتروني غير صالح' });
    if (!allow(`n:${em}`, 3, 24 * 60 * 60_000)) return tooMany(res); // at most 3 confirmation mails per address per day
    const cats = Array.isArray(categories) ? categories.map((c) => String(c).trim().slice(0, 40)).filter(Boolean).slice(0, 12) : [];
    const src = source ? String(source).slice(0, 40) : null;
    const existing = await prisma.subscription.findUnique({ where: { email: em } });
    if (existing?.status === 'active') return res.json({ success: true, status: 'active' });

    const confirmToken = newToken();
    if (existing) {
      // pending (resend) or unsubscribed (must confirm again — never silently re-activated)
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'pending', confirmToken, confirmedAt: null, categories: cats.length ? cats : existing.categories, unsubToken: existing.unsubToken || newToken(), updatedAt: new Date() },
      });
    } else {
      await prisma.subscription.create({ data: { email: em, categories: cats, source: src, status: 'pending', confirmToken, unsubToken: newToken() } });
    }
    try {
      await sendConfirmMail(em, confirmToken);
    } catch (e) {
      console.error('confirm mail failed:', e);
      return res.status(502).json({ error: 'تعذّر إرسال رسالة التأكيد الآن — حاول بعد قليل' });
    }
    res.json({ success: true, status: 'pending' });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/newsletter/confirm { token } — activates a pending subscription (link valid 48h).
router.post('/newsletter/confirm', async (req: Request, res: Response) => {
  try {
    if (!allow(`nc:${ip(req)}`, 20, 60 * 60_000)) return tooMany(res);
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token || token.length > 64) return res.status(400).json({ error: 'رابط التأكيد غير صالح' });
    const sub = await prisma.subscription.findFirst({ where: { confirmToken: token } });
    if (!sub) return res.status(404).json({ error: 'رابط التأكيد غير صالح أو استُخدم من قبل' });
    if (Date.now() - new Date(sub.updatedAt).getTime() > 48 * 60 * 60_000) return res.status(410).json({ error: 'انتهت صلاحية رابط التأكيد — اشترك من جديد لتصلك رسالة أخرى' });
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'active', confirmedAt: new Date(), confirmToken: null, unsubscribedAt: null } });
    res.json({ success: true, email: sub.email.replace(/^(.).*(@.*)$/, '$1***$2') });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/newsletter/unsubscribe { token } or ?token= (RFC 8058 one-click POST from mail clients)
router.post('/newsletter/unsubscribe', async (req: Request, res: Response) => {
  try {
    const token = String(req.body?.token || req.query.token || '').trim();
    if (!token) return res.status(400).json({ error: 'token required' });
    const sub = await prisma.subscription.findFirst({ where: { unsubToken: token } });
    if (!sub) return res.status(404).json({ error: 'رابط إلغاء الاشتراك غير صالح' });
    if (sub.status !== 'unsubscribed') await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'unsubscribed', unsubscribedAt: new Date() } });
    res.json({ success: true, email: sub.email.replace(/^(.).*(@.*)$/, '$1***$2') });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
