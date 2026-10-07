import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { drainRequest } from '../middleware';
import { pollDto } from '../polls';
import { sendMail, mailStatus, readSmtp, writeSmtp, verifySmtp, sealPassword, passwordReadable, SmtpSettings } from '../email';
import { open } from '../secretbox';
import { sendIssue, renderIssue, issueArticles, recipientWhere, readAuto, writeAuto, newToken } from '../newsletter';
import { audit, q } from '../audit';

// Reader-facing admin (D-043 Stage 4): comment moderation, polls, newsletter.
// Mounted inside routes/admin.ts AFTER its auth + staff check, so req.user is set.
const router = Router();
const prisma = new PrismaClient();

type Staff = { id: string; name: string; role: string };
const who = (req: Request) => (req as any).user as Staff;
const only = (...roles: string[]) => async (req: Request, res: Response, next: NextFunction) => {
  if (!roles.includes(who(req).role)) { await drainRequest(req); return res.status(403).json({ error: 'Forbidden: insufficient role' }); }
  next();
};
const editors = only('ADMIN', 'EDITOR');

/* ───────────── comments ───────────── */

const COMMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

router.get('/comments/counts', editors, async (_req: Request, res: Response) => {
  try {
    const g = await prisma.comment.groupBy({ by: ['status'], _count: { _all: true } });
    const data: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    g.forEach((x) => { data[x.status] = x._count._all; });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get('/comments', editors, async (req: Request, res: Response) => {
  try {
    const status = COMMENT_STATUSES.includes(String(req.query.status)) ? String(req.query.status) : 'PENDING';
    const rows = await prisma.comment.findMany({
      where: { status: status as any },
      select: { id: true, content: true, status: true, authorName: true, authorEmail: true, ipHash: true, createdAt: true, article: { select: { id: true, title: true } } },
      orderBy: { createdAt: status === 'PENDING' ? 'asc' : 'desc' },
      take: 200,
    });
    res.json({ success: true, data: rows.map((r) => ({ ...r, ipHash: r.ipHash ? r.ipHash.slice(0, 8) : null })) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.put('/comments/:id', editors, async (req: Request, res: Response) => {
  try {
    const status = String(req.body?.status || '');
    if (!COMMENT_STATUSES.includes(status)) return res.status(400).json({ error: 'status must be PENDING, APPROVED or REJECTED' });
    const before = await prisma.comment.findUnique({ where: { id: req.params.id }, select: { status: true } });
    const row = await prisma.comment.update({ where: { id: req.params.id }, data: { status: status as any }, select: { id: true, status: true, authorName: true, content: true, article: { select: { id: true, title: true } } } });
    if (before && before.status !== row.status) {
      const verb = { APPROVED: 'قبل', REJECTED: 'رفض', PENDING: 'أعاد للمراجعة' }[row.status as string];
      await audit(prisma, who(req), req, {
        action: `comment.${row.status === 'APPROVED' ? 'approve' : row.status === 'REJECTED' ? 'reject' : 'pending'}`, targetType: 'comment', targetId: row.id,
        summary: `${verb} تعليق ${row.authorName || 'قارئ'} على ${q(row.article.title, 60)}`,
        meta: { from: before.status, to: row.status, articleId: row.article.id, excerpt: row.content.slice(0, 120) },
      });
    }
    res.json({ success: true, data: { id: row.id, status: row.status } });
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: String(e) });
  }
});

router.delete('/comments/:id', editors, async (req: Request, res: Response) => {
  try {
    const gone = await prisma.comment.delete({ where: { id: req.params.id }, select: { id: true, status: true, authorName: true, content: true, article: { select: { id: true, title: true } } } });
    await audit(prisma, who(req), req, {
      action: 'comment.delete', targetType: 'comment', targetId: gone.id,
      summary: `حذف تعليق ${gone.authorName || 'قارئ'} على ${q(gone.article.title, 60)}`,
      meta: { status: gone.status, articleId: gone.article.id, excerpt: gone.content.slice(0, 120) },
    });
    res.json({ success: true });
  }
  catch (e: any) { if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' }); res.status(500).json({ error: String(e) }); }
});

/* ───────────── polls ───────────── */

const SLOTS = ['home', 'debate'];

router.get('/polls', editors, async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.poll.findMany({ include: { options: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ success: true, data: rows.map(pollDto) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/admin/polls { slot, question, options: [{ label, byline?, note? }], active? }
router.post('/polls', editors, async (req: Request, res: Response) => {
  try {
    const { slot, question, options, active } = req.body || {};
    const s = SLOTS.includes(slot) ? slot : 'home';
    const q = String(question || '').trim().slice(0, 200);
    const opts = Array.isArray(options) ? options.map((o: any) => ({ label: String(o?.label || '').trim().slice(0, 80), byline: o?.byline ? String(o.byline).trim().slice(0, 80) : null, note: o?.note ? String(o.note).trim().slice(0, 600) : null })).filter((o) => o.label) : [];
    if (!q) return res.status(400).json({ error: 'اكتب السؤال' });
    if (s === 'debate' ? opts.length !== 2 : opts.length < 2 || opts.length > 6) return res.status(400).json({ error: s === 'debate' ? 'المناظرة تحتاج رأيين بالضبط' : 'من خيارين إلى ستة خيارات' });
    const created = await prisma.$transaction(async (tx) => {
      if (active) await tx.poll.updateMany({ where: { slot: s, active: true }, data: { active: false } });
      return tx.poll.create({ data: { slot: s, question: q, active: !!active, options: { create: opts.map((o, order) => ({ ...o, order })) } }, include: { options: true } });
    });
    await audit(prisma, who(req), req, { action: 'poll.create', targetType: 'poll', targetId: created.id, summary: `أنشأ استطلاع «${q.slice(0, 80)}»${created.active ? ' وفعّله' : ''}`, meta: { slot: s, active: created.active, options: opts.map((o) => o.label) } });
    res.status(201).json({ success: true, data: pollDto(created) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// PUT /api/admin/polls/:id { active?, question? } — activating closes the slot's current poll
router.put('/polls/:id', editors, async (req: Request, res: Response) => {
  try {
    const p = await prisma.poll.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: 'Not found' });
    const { active, question } = req.body || {};
    const updated = await prisma.$transaction(async (tx) => {
      if (active === true) await tx.poll.updateMany({ where: { slot: p.slot, active: true, NOT: { id: p.id } }, data: { active: false } });
      const data: any = {};
      if (typeof active === 'boolean') data.active = active;
      if (question !== undefined) { const q = String(question).trim().slice(0, 200); if (q) data.question = q; }
      return tx.poll.update({ where: { id: p.id }, data, include: { options: true } });
    });
    if (p.active !== updated.active || p.question !== updated.question) {
      const action = p.active !== updated.active ? (updated.active ? 'poll.activate' : 'poll.deactivate') : 'poll.update';
      const verb = { 'poll.activate': 'فعّل', 'poll.deactivate': 'أوقف', 'poll.update': 'عدّل' }[action];
      await audit(prisma, who(req), req, { action, targetType: 'poll', targetId: p.id, summary: `${verb} استطلاع ${q(updated.question)}`, meta: { activeFrom: p.active, activeTo: updated.active, ...(p.question !== updated.question ? { oldQuestion: p.question } : {}) } });
    }
    res.json({ success: true, data: pollDto(updated) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete('/polls/:id', editors, async (req: Request, res: Response) => {
  try {
    const gone = await prisma.poll.delete({ where: { id: req.params.id }, include: { options: true } });
    await audit(prisma, who(req), req, { action: 'poll.delete', targetType: 'poll', targetId: gone.id, summary: `حذف استطلاع ${q(gone.question)}`, meta: { votes: gone.options.reduce((n, o) => n + o.votes, 0) } });
    res.json({ success: true });
  }
  catch (e: any) { if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' }); res.status(500).json({ error: String(e) }); }
});

/* ───────────── newsletter ───────────── */

router.get('/newsletter', editors, async (_req: Request, res: Response) => {
  try {
    const [g, issues, mail, auto] = await Promise.all([
      prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.newsletterIssue.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
      mailStatus(),
      readAuto(prisma),
    ]);
    const stats: Record<string, number> = { active: 0, unsubscribed: 0 };
    g.forEach((x) => { stats[x.status] = x._count._all; });
    res.json({ success: true, data: { stats, issues, mail, auto } });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Subscriber emails are personal data: admins only.
router.get('/newsletter/subscribers', only('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const data = await prisma.subscription.findMany({ select: { email: true, status: true, categories: true, source: true, subscribedAt: true, unsubscribedAt: true }, orderBy: { subscribedAt: 'desc' }, take: 5000 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// PUT /api/admin/newsletter/auto { enabled, hour } — automatic morning digest (admins decide mass mail)
router.put('/newsletter/auto', only('ADMIN'), async (req: Request, res: Response) => {
  try {
    const cur = await readAuto(prisma);
    const hour = req.body?.hour !== undefined ? Number(req.body.hour) : cur.hour;
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) return res.status(400).json({ error: 'الساعة بين 0 و23' });
    const saved = await writeAuto(prisma, { ...cur, enabled: !!req.body?.enabled, hour });
    if (cur.enabled !== saved.enabled || cur.hour !== saved.hour) {
      await audit(prisma, who(req), req, { action: 'newsletter.auto', targetType: 'newsletter', summary: saved.enabled ? `فعّل النشرة الصباحية التلقائية (الساعة ${saved.hour})` : 'أوقف النشرة الصباحية التلقائية', meta: { from: { enabled: cur.enabled, hour: cur.hour }, to: { enabled: saved.enabled, hour: saved.hour } } });
    }
    res.json({ success: true, data: saved });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

/* ── SMTP settings (admins only, D-044). The password is write-only: sealed with
      AES-GCM on save and never returned; omit it on save to keep the stored one. ── */

const HOST_RE = /^[A-Za-z0-9.-]{1,253}$/;
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const publicSmtp = (s: SmtpSettings | null) => ({
  enabled: !!s?.enabled,
  host: s?.host || '',
  port: s?.port || 587,
  secure: !!s?.secure,
  user: s?.user || '',
  fromName: s?.fromName || 'المتابع',
  fromEmail: s?.fromEmail || 'noreply@mutabe3.news',
  hasPassword: !!s?.passEnc,
  passwordReadable: passwordReadable(s),
  updatedAt: s?.updatedAt || null,
});

/** Validates a settings payload; returns an error string or the normalised fields. */
function cleanSmtp(b: any): string | { enabled: boolean; host: string; port: number; secure: boolean; user: string; fromName: string; fromEmail: string } {
  const host = String(b?.host || '').trim().toLowerCase();
  const port = Number(b?.port);
  const fromEmail = String(b?.fromEmail || '').trim().toLowerCase();
  const fromName = String(b?.fromName || '').trim().slice(0, 80);
  const user = String(b?.user || '').trim().slice(0, 200);
  if (!HOST_RE.test(host)) return 'اسم خادم البريد غير صالح';
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 'المنفذ غير صالح';
  if (!MAIL_RE.test(fromEmail)) return 'عنوان المرسِل غير صالح';
  return { enabled: !!b?.enabled, host, port, secure: !!b?.secure, user, fromName: fromName || 'المتابع', fromEmail };
}

router.get('/newsletter/smtp', only('ADMIN'), async (_req: Request, res: Response) => {
  try { res.json({ success: true, data: publicSmtp(await readSmtp()) }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

// PUT { enabled, host, port, secure, user, password?, fromName, fromEmail }
router.put('/newsletter/smtp', only('ADMIN'), async (req: Request, res: Response) => {
  try {
    const c = cleanSmtp(req.body);
    if (typeof c === 'string') return res.status(400).json({ error: c });
    const cur = await readSmtp();
    const pw = typeof req.body?.password === 'string' ? req.body.password : '';
    if (pw.length > 500) return res.status(400).json({ error: 'كلمة المرور طويلة جداً' });
    // A different server or username without a new password would pair old secrets with new settings.
    const changedAccount = !!cur && (cur.host !== c.host || cur.user !== c.user);
    const passEnc = pw ? sealPassword(pw) : changedAccount ? null : cur?.passEnc ?? null;
    if (c.enabled && c.user && !passEnc) return res.status(400).json({ error: 'أدخل كلمة مرور حساب البريد' });
    const next: SmtpSettings = { ...c, passEnc, updatedAt: new Date().toISOString(), updatedBy: who(req).id };
    await writeSmtp(next);
    // Never the password itself — only whether it changed.
    await audit(prisma, who(req), req, {
      action: 'newsletter.smtp', targetType: 'newsletter',
      summary: `حفظ إعدادات البريد (${c.host}:${c.port}${c.enabled ? '، مفعّل' : '، معطّل'}${pw ? '، كلمة مرور جديدة' : ''})`,
      meta: { host: c.host, port: c.port, user: c.user, fromEmail: c.fromEmail, enabled: c.enabled, passwordChanged: !!pw, accountChanged: changedAccount, previousHost: cur?.host ?? null },
    });
    res.json({ success: true, data: publicSmtp(next), status: await mailStatus() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST …/smtp/verify — logs in with the given settings (or the stored password) and logs out; sends nothing
router.post('/newsletter/smtp/verify', only('ADMIN'), async (req: Request, res: Response) => {
  try {
    const c = cleanSmtp(req.body);
    if (typeof c === 'string') return res.status(400).json({ error: c });
    const cur = await readSmtp();
    const pw = typeof req.body?.password === 'string' && req.body.password ? req.body.password : (cur && cur.host === c.host && cur.user === c.user ? open(cur.passEnc) ?? '' : '');
    if (c.user && !pw) return res.status(400).json({ error: 'أدخل كلمة المرور لاختبار الاتصال' });
    res.json({ success: true, data: await verifySmtp({ host: c.host, port: c.port, secure: c.secure, user: c.user || undefined, pass: pw || undefined }) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

const cleanIssue = (b: any) => ({
  subject: String(b?.subject || '').trim().slice(0, 150),
  intro: b?.intro ? String(b.intro).trim().slice(0, 1500) : null,
  articleIds: Array.isArray(b?.articleIds) ? Array.from(new Set(b.articleIds.map(String))).slice(0, 12) as string[] : [],
  edition: b?.edition ? String(b.edition).trim().slice(0, 40) : null,
});

router.post('/newsletter/issues', editors, async (req: Request, res: Response) => {
  try {
    const d = cleanIssue(req.body);
    if (!d.subject) return res.status(400).json({ error: 'اكتب عنوان العدد' });
    if (!d.articleIds.length) return res.status(400).json({ error: 'اختر مقالاً واحداً على الأقل' });
    const issue = await prisma.newsletterIssue.create({ data: { ...d, createdById: who(req).id } });
    const recipients = await prisma.subscription.count({ where: recipientWhere(issue.edition) as any });
    await audit(prisma, who(req), req, { action: 'newsletter.create', targetType: 'newsletter', targetId: issue.id, summary: `أنشأ عدد النشرة ${q(issue.subject)}`, meta: { articleIds: issue.articleIds, edition: issue.edition } });
    res.status(201).json({ success: true, data: issue, recipients });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get('/newsletter/issues/:id', editors, async (req: Request, res: Response) => {
  try {
    const issue = await prisma.newsletterIssue.findUnique({ where: { id: req.params.id } });
    if (!issue) return res.status(404).json({ error: 'Not found' });
    const recipients = await prisma.subscription.count({ where: recipientWhere(issue.edition) as any });
    res.json({ success: true, data: issue, recipients });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/admin/newsletter/issues/:id/test — sends the issue only to the signed-in staff member
router.post('/newsletter/issues/:id/test', editors, async (req: Request, res: Response) => {
  try {
    const issue = await prisma.newsletterIssue.findUnique({ where: { id: req.params.id } });
    if (!issue) return res.status(404).json({ error: 'Not found' });
    const me = await prisma.user.findUnique({ where: { id: who(req).id }, select: { email: true } });
    if (!me?.email) return res.status(400).json({ error: 'لا يوجد بريد لحسابك' });
    const articles = await issueArticles(prisma, issue.articleIds);
    if (!articles.length) return res.status(400).json({ error: 'لا توجد مقالات منشورة في هذا العدد' });
    const { html, text, headers } = renderIssue(issue, articles, `test-${newToken()}`);
    await sendMail({ to: me.email, subject: `[تجربة] ${issue.subject}`, html, text, headers });
    await audit(prisma, who(req), req, { action: 'newsletter.test', targetType: 'newsletter', targetId: issue.id, summary: `أرسل نسخة تجريبية من ${q(issue.subject)} إلى بريده` });
    res.json({ success: true, to: me.email });
  } catch (e: any) { res.status(502).json({ error: `تعذّر الإرسال: ${String(e?.message || e).slice(0, 200)}` }); }
});

// POST /api/admin/newsletter/issues/:id/send — starts the background send; poll GET …/issues/:id for progress
router.post('/newsletter/issues/:id/send', editors, async (req: Request, res: Response) => {
  try {
    const issue = await prisma.newsletterIssue.findUnique({ where: { id: req.params.id } });
    if (!issue) return res.status(404).json({ error: 'Not found' });
    if (!['draft', 'failed'].includes(issue.status)) return res.status(409).json({ error: 'هذا العدد أُرسل أو قيد الإرسال' });
    const recipients = await prisma.subscription.count({ where: recipientWhere(issue.edition) as any });
    if (!recipients) return res.status(400).json({ error: 'لا يوجد مشتركون نشطون لهذا العدد' });
    sendIssue(prisma, issue.id).catch((e) => console.error('newsletter send:', e));
    await audit(prisma, who(req), req, { action: 'newsletter.send', targetType: 'newsletter', targetId: issue.id, summary: `أرسل النشرة ${q(issue.subject)} إلى ${recipients} مشتركاً`, meta: { recipients, edition: issue.edition, resend: issue.status === 'failed' } });
    res.status(202).json({ success: true, recipients });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete('/newsletter/issues/:id', editors, async (req: Request, res: Response) => {
  try {
    const issue = await prisma.newsletterIssue.findUnique({ where: { id: req.params.id } });
    if (!issue) return res.status(404).json({ error: 'Not found' });
    if (issue.status !== 'draft') return res.status(409).json({ error: 'لا تُحذف إلا المسودات' });
    await prisma.newsletterIssue.delete({ where: { id: issue.id } });
    await audit(prisma, who(req), req, { action: 'newsletter.delete', targetType: 'newsletter', targetId: issue.id, summary: `حذف مسودة النشرة ${q(issue.subject)}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
