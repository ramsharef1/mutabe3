import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { allow, fingerprint } from '../ratelimit';
import { activePolls, pollDto } from '../polls';
import { newToken } from '../newsletter';

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
router.post('/newsletter/subscribe', async (req: Request, res: Response) => {
  try {
    const { email, categories, source, website } = req.body || {};
    if (website) return res.json({ success: true, status: 'active' });
    if (!allow(`n:${ip(req)}`, 6, 60 * 60_000)) return tooMany(res);
    const em = String(email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(em) || em.length > 200) return res.status(400).json({ error: 'البريد الإلكتروني غير صالح' });
    const cats = Array.isArray(categories) ? categories.map((c) => String(c).trim().slice(0, 40)).filter(Boolean).slice(0, 12) : [];
    const src = source ? String(source).slice(0, 40) : null;
    const existing = await prisma.subscription.findUnique({ where: { email: em } });
    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'active', unsubscribedAt: null, categories: cats.length ? cats : existing.categories, unsubToken: existing.unsubToken || newToken() },
      });
    } else {
      await prisma.subscription.create({ data: { email: em, categories: cats, source: src, unsubToken: newToken() } });
    }
    res.json({ success: true, status: 'active' });
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
