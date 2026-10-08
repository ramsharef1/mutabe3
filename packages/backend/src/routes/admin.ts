import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, drainRequest } from '../middleware';
import { sanitizeArticleHtml } from '../sanitize';
import { imageUpload, storeUpload, listMedia, MAX_UPLOAD_BYTES, UPLOAD_URL, uploadRel, uploadExists, deleteUpload } from '../uploads';
import { hashPassword } from '../auth';
import { readHomepageSetting, writeHomepageSetting, resolveHomepage, MAX_PICKS, HomepageSetting } from '../homepage';
import readerAdmin from './adminReaders';
import { readAds, parseAds, writeAds, adStats, safeHref, AdsSetting, ZONES } from '../ads';
import { audit, listAudit, q } from '../audit';
import { sendError } from '../errors';
import { freeSlug, parseProfile } from '../authors';
import { plainText, LIVE_TEXT_MAX, LIVE_TITLE_MAX } from '../live';
import { siteStats } from '../stats';
import { readPush, setPushEnabled, sendAlert, SEND_GAP_MS } from '../push';
import { SPECS as DATA_SPECS, parseBlock, readBlock, writeBlock, publicItems, readFx, fxView } from '../datablocks';
import { reindexArticle } from '../search';
import { RejectedImage } from '../images';

const router = Router();
const prisma = new PrismaClient();

// Roles (D-043 Stage 3): ADMIN everything · EDITOR all content + categories +
// homepage · JOURNALIST own drafts only, no publishing · VIEWER no dashboard.
const STAFF_ROLES = ['ADMIN', 'EDITOR', 'JOURNALIST'];
const EDITOR_ROLES = ['ADMIN', 'EDITOR'];
const ROLES = ['ADMIN', 'EDITOR', 'JOURNALIST', 'VIEWER'];
const STATUSES = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'];
const KINDS = ['NEWS', 'OPINION', 'EXPLAINER', 'SPONSORED', 'LIVE', 'VIDEO', 'GALLERY', 'CARICATURE', 'NOTICE']; // ArticleKind (D-056)

type Staff = { id: string; name: string; role: string };
const who = (req: Request) => (req as any).user as Staff;
const isEditor = (u: Staff) => EDITOR_ROLES.includes(u.role);
const isUniqueError = (e: any) => e && e.code === 'P2002';

// Every admin route needs a valid token AND a staff role.
async function requireStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    if (!user || !STAFF_ROLES.includes(user.role)) {
      await drainRequest(req);
      return res.status(403).json({ error: 'Forbidden: staff access required' });
    }
    (req as any).user = user;
    next();
  } catch {
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

const requireRole = (...roles: string[]) => async (req: Request, res: Response, next: NextFunction) => {
  if (!roles.includes(who(req).role)) {
    await drainRequest(req);
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  }
  next();
};

router.use(authMiddleware, requireStaff);

// Comment moderation, polls, newsletter (D-043 Stage 4) — inherits the auth + staff check above
router.use(readerAdmin);

const slugify = (s: string) =>
  (s || '').toString().trim().toLowerCase().replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const makeSlug = (title: string, provided?: string) =>
  `${slugify(provided || title) || 'article'}-${Math.random().toString(36).slice(2, 8)}`;

/** ISO string → Date; null when empty; undefined when unparseable. */
const parseWhen = (v: unknown): Date | null | undefined => {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d;
};

/* ───────────────────────────── audit helpers (D-064) ───────────────────────────── */

// Summaries say «من … إلى …» with Arabic names: an arrow between two Latin words (house ← demo) forms one
// left-to-right run inside the RTL page and reads backwards.
const STATUS_AR: Record<string, string> = { DRAFT: 'مسودة', PUBLISHED: 'منشور', SCHEDULED: 'مجدول', ARCHIVED: 'مؤرشف' };
const ROLE_AR: Record<string, string> = { ADMIN: 'مدير', EDITOR: 'محرر', JOURNALIST: 'صحفي', VIEWER: 'قارئ' };
const MODE_AR: Record<string, string> = { off: 'متوقف', demo: 'تجريبي', house: 'بانرات مباشرة', adsense: 'AdSense' };
const BACKDATE_SLACK_MS = 5 * 60_000;
/** Which audit action a status transition is. */
function articleAction(from: string | null, to: string | null): { action: string; verb: string } {
  if (!to || to === from) return { action: 'article.edit', verb: 'عدّل' };
  if (to === 'PUBLISHED') return { action: 'article.publish', verb: 'نشر' };
  if (to === 'SCHEDULED') return { action: 'article.schedule', verb: 'جدول' };
  if (to === 'ARCHIVED') return { action: 'article.archive', verb: 'أرشف' };
  if (from === 'PUBLISHED') return { action: 'article.unpublish', verb: 'ألغى نشر' };
  if (from === 'SCHEDULED') return { action: 'article.unschedule', verb: 'ألغى جدولة' };
  return { action: 'article.edit', verb: 'عدّل' };
}
const fmtWhen = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');

/* ───────────────────────────── articles ───────────────────────────── */

// GET /api/admin/articles — every status, newest edits first. Journalists see their own.
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const u = who(req);
    const articles = await prisma.article.findMany({
      where: isEditor(u) ? {} : { authorId: u.id },
      include: { author: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: articles });
  } catch (e) { sendError(res, e); }
});

// GET one (incl. drafts) for the editor and the preview
router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const u = who(req);
    const a = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: { category: true, author: { select: { id: true, name: true } } },
    });
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (!isEditor(u) && a.authorId !== u.id) return res.status(403).json({ error: 'ليس لديك صلاحية على هذا المقال' });
    res.json({ success: true, data: a });
  } catch (e) { sendError(res, e); }
});

// POST create
router.post('/articles', async (req: Request, res: Response) => {
  try {
    const u = who(req);
    const { title, summary, content, categoryId, featuredImageUrl, coverCredit, coverCaption, kind, sponsorName, status, seoKeywords, slug, scheduledPublishAt } = req.body || {};
    if (!title || !content || !categoryId) {
      return res.status(400).json({ error: 'title, content and categoryId are required' });
    }
    const st = STATUSES.includes(status) ? status : 'DRAFT';
    if (!isEditor(u) && st !== 'DRAFT') return res.status(403).json({ error: 'النشر والجدولة يتطلبان صلاحية محرر' });
    const when = parseWhen(scheduledPublishAt);
    if (when === undefined) return res.status(400).json({ error: 'scheduledPublishAt is not a valid date' });
    if (st === 'SCHEDULED' && !when) return res.status(400).json({ error: 'حدّد موعد النشر للمقال المجدول' });
    const article = await prisma.article.create({
      data: {
        title,
        summary: summary || null,
        content: sanitizeArticleHtml(String(content)),
        slug: makeSlug(title, slug),
        featuredImageUrl: featuredImageUrl || null,
        coverCredit: String(coverCredit || '').trim().slice(0, 120) || null,
        coverCaption: String(coverCaption || '').trim().slice(0, 300) || null,
        kind: KINDS.includes(kind) ? kind : 'NEWS',
        sponsorName: kind === 'SPONSORED' ? String(sponsorName || '').trim().slice(0, 120) || null : null,
        categoryId,
        authorId: u.id,
        status: st,
        publishedAt: st === 'PUBLISHED' ? new Date() : null,
        scheduledPublishAt: st === 'SCHEDULED' ? when : null,
        seoKeywords: Array.isArray(seoKeywords) ? seoKeywords : [],
      },
    });
    await reindexArticle(prisma, article.id); // search text (D-071)
    const { action, verb } = st === 'DRAFT' ? { action: 'article.create', verb: 'أنشأ' } : articleAction(null, st);
    const backdated = st === 'SCHEDULED' && !!when && when.getTime() < Date.now() - BACKDATE_SLACK_MS;
    await audit(prisma, u, req, {
      action, targetType: 'article', targetId: article.id,
      summary: `${verb} ${q(article.title)}${st === 'SCHEDULED' ? ` لموعد ${fmtWhen(when)}${backdated ? ' — في الماضي (تأريخ رجعي)' : ''}` : ''}`,
      meta: { created: true, status: st, kind: article.kind, ...(st === 'SCHEDULED' ? { scheduledPublishAt: when, backdated } : {}) },
    });
    res.status(201).json({ success: true, data: article });
  } catch (e) { sendError(res, e); }
});

// PUT update
router.put('/articles/:id', async (req: Request, res: Response) => {
  try {
    const u = who(req);
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!isEditor(u)) {
      if (existing.authorId !== u.id) return res.status(403).json({ error: 'ليس لديك صلاحية على هذا المقال' });
      if (existing.status !== 'DRAFT') return res.status(403).json({ error: 'المقال غير المسوّد لا يعدّله إلا محرر' });
    }
    const { title, summary, content, categoryId, featuredImageUrl, coverCredit, coverCaption, kind, sponsorName, status, seoKeywords, scheduledPublishAt } = req.body || {};
    const data: any = {};
    if (kind !== undefined) {
      if (!KINDS.includes(kind)) return res.status(400).json({ error: 'نوع المادة غير معروف' });
      data.kind = kind;
      data.sponsorName = kind === 'SPONSORED' ? String(sponsorName || '').trim().slice(0, 120) || null : null;
    } else if (sponsorName !== undefined && existing.kind === 'SPONSORED') data.sponsorName = String(sponsorName || '').trim().slice(0, 120) || null;
    if (title !== undefined) data.title = title;
    if (summary !== undefined) data.summary = summary || null;
    if (content !== undefined) data.content = sanitizeArticleHtml(String(content));
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (featuredImageUrl !== undefined) data.featuredImageUrl = featuredImageUrl || null;
    if (coverCredit !== undefined) data.coverCredit = String(coverCredit || '').trim().slice(0, 120) || null;
    if (coverCaption !== undefined) data.coverCaption = String(coverCaption || '').trim().slice(0, 300) || null;
    if (Array.isArray(seoKeywords)) data.seoKeywords = seoKeywords;
    const when = parseWhen(scheduledPublishAt);
    if (when === undefined) return res.status(400).json({ error: 'scheduledPublishAt is not a valid date' });
    if (status !== undefined && STATUSES.includes(status)) {
      if (!isEditor(u) && status !== 'DRAFT') return res.status(403).json({ error: 'النشر والجدولة يتطلبان صلاحية محرر' });
      data.status = status;
      if (status === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date();
      if (status === 'SCHEDULED') {
        const at = when ?? existing.scheduledPublishAt;
        if (!at) return res.status(400).json({ error: 'حدّد موعد النشر للمقال المجدول' });
        data.scheduledPublishAt = at;
      } else {
        data.scheduledPublishAt = null;
      }
    } else if (scheduledPublishAt !== undefined && existing.status === 'SCHEDULED') {
      data.scheduledPublishAt = when;
    }
    const article = await prisma.article.update({ where: { id: req.params.id }, data });
    if (['title', 'summary', 'content', 'seoKeywords'].some((k) => k in data)) await reindexArticle(prisma, article.id); // D-071
    const changed = Object.keys(data).filter((k) => k !== 'publishedAt' && JSON.stringify((existing as any)[k]) !== JSON.stringify((article as any)[k]));
    if (changed.length) {
      const { action, verb } = articleAction(existing.status, data.status ?? null);
      const at = article.scheduledPublishAt;
      const backdated = article.status === 'SCHEDULED' && !!at && at.getTime() < Date.now() - BACKDATE_SLACK_MS && changed.includes('scheduledPublishAt');
      const statusNote = existing.status !== article.status ? ` (من ${STATUS_AR[existing.status]} إلى ${STATUS_AR[article.status]})` : '';
      await audit(prisma, u, req, {
        action, targetType: 'article', targetId: article.id,
        summary: `${verb} ${q(article.title)}${statusNote}${article.status === 'SCHEDULED' && changed.includes('scheduledPublishAt') ? ` لموعد ${fmtWhen(at)}${backdated ? ' — في الماضي (تأريخ رجعي)' : ''}` : ''}`,
        meta: {
          changed, from: existing.status, to: article.status,
          ...(changed.includes('title') ? { oldTitle: existing.title } : {}),
          ...(changed.includes('kind') ? { kindFrom: existing.kind, kindTo: article.kind } : {}),
          ...(changed.includes('scheduledPublishAt') ? { scheduledFrom: existing.scheduledPublishAt, scheduledTo: at, backdated } : {}),
        },
      });
    }
    res.json({ success: true, data: article });
  } catch (e) { sendError(res, e); }
});

// DELETE — editors anything; journalists their own drafts
router.delete('/articles/:id', async (req: Request, res: Response) => {
  try {
    const u = who(req);
    const existing = await prisma.article.findUnique({ where: { id: req.params.id }, select: { authorId: true, status: true, title: true, slug: true, publishedAt: true } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!isEditor(u) && (existing.authorId !== u.id || existing.status !== 'DRAFT')) {
      return res.status(403).json({ error: 'الحذف هنا يتطلب صلاحية محرر' });
    }
    await prisma.article.delete({ where: { id: req.params.id } });
    await audit(prisma, u, req, {
      action: 'article.delete', targetType: 'article', targetId: req.params.id,
      summary: `حذف ${q(existing.title)} (${STATUS_AR[existing.status]})`,
      meta: { title: existing.title, slug: existing.slug, status: existing.status, publishedAt: existing.publishedAt },
    });
    res.json({ success: true });
  } catch (e) { sendError(res, e); }
});

/* ───────────────────────────── live blog (D-068) ───────────────────────────── */

// Same rule as editing the article: editors on any LIVE article, a journalist only on their own draft
// (so nothing a journalist writes reaches readers without an editor publishing it).
async function liveArticle(req: Request, res: Response) {
  const u = who(req);
  const a = await prisma.article.findUnique({ where: { id: req.params.id }, select: { id: true, title: true, kind: true, status: true, authorId: true, liveEndedAt: true } });
  if (!a) { res.status(404).json({ error: 'Not found' }); return null; }
  if (!isEditor(u) && (a.authorId !== u.id || a.status !== 'DRAFT')) { res.status(403).json({ error: 'التحديثات المباشرة على مادة منشورة يضيفها محرر' }); return null; }
  if (a.kind !== 'LIVE') { res.status(400).json({ error: 'غيّر نوع المادة إلى «تغطية مباشرة» واحفظها أولاً' }); return null; }
  return a;
}
const parseEntry = (b: any, partial = false): { ok: true; data: any } | { ok: false; error: string } => {
  const data: any = {};
  if (b?.text !== undefined || !partial) {
    const text = plainText(b?.text, LIVE_TEXT_MAX);
    if (text.length < 2) return { ok: false, error: 'نص التحديث مطلوب' };
    data.text = text;
  }
  if (b?.title !== undefined) data.title = plainText(b.title, LIVE_TITLE_MAX) || null;
  if (b?.key !== undefined) data.key = !!b.key;
  if (b?.at !== undefined && b.at !== '' && b.at !== null) {
    const at = parseWhen(b.at);
    if (!at) return { ok: false, error: 'وقت التحديث غير صالح' };
    if (at.getTime() > Date.now() + 5 * 60_000) return { ok: false, error: 'وقت التحديث لا يكون في المستقبل' };
    data.at = at;
  }
  return { ok: true, data };
};
const ENTRY_SELECT = { id: true, at: true, title: true, text: true, key: true, authorId: true, createdAt: true } as const;

router.get('/articles/:id/live', async (req: Request, res: Response) => {
  try {
    const a = await liveArticle(req, res); if (!a) return;
    const entries = await prisma.liveEntry.findMany({ where: { articleId: a.id }, orderBy: { at: 'desc' }, select: ENTRY_SELECT });
    res.json({ success: true, data: { open: !a.liveEndedAt, endedAt: a.liveEndedAt, entries } });
  } catch (e) { sendError(res, e); }
});

router.post('/articles/:id/live', async (req: Request, res: Response) => {
  try {
    const a = await liveArticle(req, res); if (!a) return;
    const p = parseEntry(req.body);
    if (!p.ok) return res.status(400).json({ error: p.error });
    const row = await prisma.liveEntry.create({ data: { ...p.data, articleId: a.id, authorId: who(req).id }, select: ENTRY_SELECT });
    await audit(prisma, who(req), req, { action: 'live.add', targetType: 'article', targetId: a.id, summary: `أضاف تحديثاً مباشراً إلى ${q(a.title)}${row.key ? ' (لحظة مهمة)' : ''}` });
    res.status(201).json({ success: true, data: row });
  } catch (e) { sendError(res, e); }
});

router.put('/articles/:id/live/:entryId', async (req: Request, res: Response) => {
  try {
    const a = await liveArticle(req, res); if (!a) return;
    const p = parseEntry(req.body, true);
    if (!p.ok) return res.status(400).json({ error: p.error });
    const found = await prisma.liveEntry.findFirst({ where: { id: req.params.entryId, articleId: a.id }, select: { id: true } });
    if (!found) return res.status(404).json({ error: 'Not found' });
    const row = await prisma.liveEntry.update({ where: { id: found.id }, data: p.data, select: ENTRY_SELECT });
    await audit(prisma, who(req), req, { action: 'live.edit', targetType: 'article', targetId: a.id, summary: `عدّل تحديثاً مباشراً في ${q(a.title)}`, meta: { entry: row.id, fields: Object.keys(p.data) } });
    res.json({ success: true, data: row });
  } catch (e) { sendError(res, e); }
});

router.delete('/articles/:id/live/:entryId', async (req: Request, res: Response) => {
  try {
    const a = await liveArticle(req, res); if (!a) return;
    const gone = await prisma.liveEntry.deleteMany({ where: { id: req.params.entryId, articleId: a.id } });
    if (!gone.count) return res.status(404).json({ error: 'Not found' });
    await audit(prisma, who(req), req, { action: 'live.delete', targetType: 'article', targetId: a.id, summary: `حذف تحديثاً مباشراً من ${q(a.title)}`, meta: { entry: req.params.entryId } });
    res.json({ success: true });
  } catch (e) { sendError(res, e); }
});

// PUT /api/admin/articles/:id/live-state { open: boolean } — end the coverage or reopen it
router.put('/articles/:id/live-state', async (req: Request, res: Response) => {
  try {
    const a = await liveArticle(req, res); if (!a) return;
    const open = req.body?.open !== false;
    const row = await prisma.article.update({ where: { id: a.id }, data: { liveEndedAt: open ? null : new Date() }, select: { liveEndedAt: true } });
    if (!!a.liveEndedAt !== !open) {
      await audit(prisma, who(req), req, { action: open ? 'live.reopen' : 'live.end', targetType: 'article', targetId: a.id, summary: `${open ? 'استأنف' : 'أنهى'} التغطية المباشرة ${q(a.title)}` });
    }
    res.json({ success: true, data: { open: !row.liveEndedAt, endedAt: row.liveEndedAt } });
  } catch (e) { sendError(res, e); }
});

/* ───────────────────────────── media ───────────────────────────── */

// POST /api/admin/upload — multipart field "file" (image) → { url } under /api/uploads/…
router.post('/upload', (req: Request, res: Response) => {
  imageUpload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: `الملف أكبر من ${Math.round(MAX_UPLOAD_BYTES / 1048576)}MB`, code: 'FILE_TOO_LARGE' });
      return sendError(res, err, { status: 400, code: 'UPLOAD_INVALID', message: 'تعذّر استلام الملف' });
    }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: 'لم يصل أي ملف', code: 'NO_FILE' });
    // D-045/D-065: the bytes decide the format (jpeg/png/webp/gif); stored only as a WebP master
    storeUpload(file)
      .then((s) => res.status(201).json({
        success: true, url: s.url, name: file.originalname, size: s.size, originalSize: file.size,
        format: s.mime, converted: s.converted, width: s.width, height: s.height,
      }))
      .catch((e) => e instanceof RejectedImage
        ? res.status(400).json({ success: false, error: e.message, code: 'UNSUPPORTED_IMAGE' })
        : sendError(res, e, { code: 'UPLOAD_STORE_FAILED', message: 'تعذّر حفظ الصورة' }));
  });
});

// GET /api/admin/media — newest uploads first, for the editor's picker
router.get('/media', (_req: Request, res: Response) => {
  try { res.json({ success: true, data: listMedia() }); }
  catch (e) { sendError(res, e); }
});

// Everything in the DB that still points at an upload: article covers and bodies,
// category images and house ad banners. Matching on the bare `YYYY/MM/name.ext`
// also catches absolute `http://host/api/uploads/…` and `/api/img/<w>/…` forms.
async function mediaReferences(rel: string) {
  const [articles, categories, ads] = await Promise.all([
    prisma.article.findMany({
      where: { OR: [{ featuredImageUrl: { contains: rel } }, { content: { contains: rel } }] },
      select: { id: true, title: true, status: true }, orderBy: { updatedAt: 'desc' }, take: 50,
    }),
    prisma.category.findMany({ where: { imageUrl: { contains: rel } }, select: { id: true, name: true, slug: true } }),
    readAds(prisma),
  ]);
  const banners: { zone: string; index: number; alt: string }[] = [];
  for (const zone of Object.keys(ads.zones) as (keyof typeof ads.zones)[]) {
    ads.zones[zone].banners.forEach((b, index) => {
      if ((b.image || '').includes(rel) || (b.mobileImage || '').includes(rel)) banners.push({ zone, index, alt: b.alt });
    });
  }
  return { articles, categories, ads: banners };
}

// DELETE /api/admin/media/YYYY/MM/name.ext  (or  DELETE /api/admin/media?url=/api/uploads/YYYY/MM/name.ext)
// Editors and admins. Unlinks the master and every cached derivative. While an article,
// category or ad banner still uses the file it answers 409 with those references;
// `?force=1` (admins only) deletes anyway and the pages show a broken image.
async function deleteMedia(req: Request, res: Response, input: string) {
  const rel = uploadRel(input);
  if (!rel) return res.status(404).json({ error: 'الملف غير موجود' });
  const force = ['1', 'true', 'yes'].includes(String(req.query.force || '').toLowerCase());
  if (force && who(req).role !== 'ADMIN') return res.status(403).json({ error: 'الحذف رغم الاستخدام للمدير فقط' });
  if (!uploadExists(rel)) return res.status(404).json({ error: 'الملف غير موجود' });
  try {
    const refs = await mediaReferences(rel);
    const used = refs.articles.length + refs.categories.length + refs.ads.length;
    if (used && !force) {
      return res.status(409).json({
        error: 'الصورة ما زالت مستخدمة — أزلها من المقالات أولاً',
        articleIds: refs.articles.map((a) => a.id),
        ...refs,
      });
    }
    const r = deleteUpload(rel);
    if (!r) return res.status(404).json({ error: 'الملف غير موجود' });
    console.log(`[media] ${who(req).id} deleted ${rel} (${r.removed} files${used ? `, forced over ${used} references` : ''})`);
    await audit(prisma, who(req), req, {
      action: 'media.delete', targetType: 'media', targetId: rel,
      summary: `حذف الصورة ${rel}${used ? ` رغم استخدامها في ${used} موضع` : ''}`,
      meta: { removed: r.removed, forced: used > 0 && force, references: used ? { articles: refs.articles.map((a) => a.id), categories: refs.categories.map((c) => c.id), ads: refs.ads.length } : undefined },
    });
    res.json({ success: true, url: `${UPLOAD_URL}/${rel}`, removed: r.removed, forced: used > 0 && force, ...(used ? { references: refs } : {}) });
  } catch (e) { sendError(res, e); }
}
router.delete('/media', requireRole(...EDITOR_ROLES), (req: Request, res: Response) => deleteMedia(req, res, String(req.query.url || '')));
router.delete('/media/:year/:month/:name', requireRole(...EDITOR_ROLES), (req: Request, res: Response) =>
  deleteMedia(req, res, `${req.params.year}/${req.params.month}/${req.params.name}`));

/* ───────────────────────────── categories (editors) ───────────────────────────── */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORY_SELECT = { id: true, name: true, slug: true, description: true, displayOrder: true, showInNav: true, _count: { select: { articles: true } } } as const;

router.get('/categories', requireRole(...EDITOR_ROLES), async (_req: Request, res: Response) => {
  try {
    const data = await prisma.category.findMany({ select: CATEGORY_SELECT, orderBy: { displayOrder: 'asc' } });
    res.json({ success: true, data });
  } catch (e) { sendError(res, e); }
});

router.post('/categories', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const { name, slug, description, showInNav } = req.body || {};
    const n = String(name || '').trim(), s = String(slug || '').trim().toLowerCase();
    if (!n || !s) return res.status(400).json({ error: 'الاسم والمعرّف (slug) مطلوبان' });
    if (!SLUG_RE.test(s)) return res.status(400).json({ error: 'المعرّف يقبل حروفاً لاتينية صغيرة وأرقاماً وشرطات فقط' });
    const last = await prisma.category.aggregate({ _max: { displayOrder: true } });
    const data = await prisma.category.create({
      data: { name: n, slug: s, description: description ? String(description).trim() : null, showInNav: showInNav !== false, displayOrder: (last._max.displayOrder || 0) + 1 },
      select: CATEGORY_SELECT,
    });
    await audit(prisma, who(req), req, { action: 'category.create', targetType: 'category', targetId: data.id, summary: `أنشأ قسم ${q(n)} (/${s})` });
    res.status(201).json({ success: true, data });
  } catch (e) {
    if (isUniqueError(e)) return res.status(409).json({ error: 'الاسم أو المعرّف مستخدم لقسم آخر' });
    sendError(res, e);
  }
});

// PUT /api/admin/categories/order { ids: [...] } — declared before /:id so "order" is never read as an id
router.put('/categories/order', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const ids: unknown = req.body?.ids;
    if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) return res.status(400).json({ error: 'ids[] required' });
    await prisma.$transaction((ids as string[]).map((id, i) => prisma.category.update({ where: { id }, data: { displayOrder: i + 1 } })));
    const data = await prisma.category.findMany({ select: CATEGORY_SELECT, orderBy: { displayOrder: 'asc' } });
    await audit(prisma, who(req), req, { action: 'category.reorder', targetType: 'category', summary: 'أعاد ترتيب الأقسام', meta: { order: data.map((c) => c.slug) } });
    res.json({ success: true, data });
  } catch (e) { sendError(res, e); }
});

router.put('/categories/:id', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const { name, slug, description, showInNav, displayOrder } = req.body || {};
    const data: any = {};
    if (name !== undefined) { const n = String(name).trim(); if (!n) return res.status(400).json({ error: 'الاسم مطلوب' }); data.name = n; }
    if (slug !== undefined) { const s = String(slug).trim().toLowerCase(); if (!SLUG_RE.test(s)) return res.status(400).json({ error: 'معرّف غير صالح' }); data.slug = s; }
    if (description !== undefined) data.description = description ? String(description).trim() : null;
    if (showInNav !== undefined) data.showInNav = !!showInNav;
    if (displayOrder !== undefined && Number.isFinite(Number(displayOrder))) data.displayOrder = Number(displayOrder);
    const before = await prisma.category.findUnique({ where: { id: req.params.id }, select: { name: true, slug: true, description: true, showInNav: true, displayOrder: true } });
    const row = await prisma.category.update({ where: { id: req.params.id }, data, select: CATEGORY_SELECT });
    const changed = Object.keys(data).filter((k) => before && JSON.stringify((before as any)[k]) !== JSON.stringify((row as any)[k]));
    if (changed.length) {
      await audit(prisma, who(req), req, {
        action: 'category.update', targetType: 'category', targetId: row.id,
        summary: `عدّل قسم ${q(row.name)}${changed.includes('slug') ? ` (المعرّف من /${before?.slug} إلى /${row.slug})` : ''}${changed.includes('showInNav') ? (row.showInNav ? ' — أظهره في القائمة' : ' — أخفاه من القائمة') : ''}`,
        meta: { changed, ...(changed.includes('name') ? { oldName: before?.name } : {}), ...(changed.includes('slug') ? { oldSlug: before?.slug } : {}) },
      });
    }
    res.json({ success: true, data: row });
  } catch (e: any) {
    if (isUniqueError(e)) return res.status(409).json({ error: 'الاسم أو المعرّف مستخدم لقسم آخر' });
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    sendError(res, e);
  }
});

router.delete('/categories/:id', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const n = await prisma.article.count({ where: { categoryId: req.params.id } });
    if (n > 0) return res.status(409).json({ error: `لا يمكن حذف قسم يحتوي ${n} مقالاً — انقل مقالاته أولاً` });
    const gone = await prisma.category.delete({ where: { id: req.params.id }, select: { id: true, name: true, slug: true } });
    await audit(prisma, who(req), req, { action: 'category.delete', targetType: 'category', targetId: gone.id, summary: `حذف قسم ${q(gone.name)} (/${gone.slug})` });
    res.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    sendError(res, e);
  }
});

/* ───────────────────────────── users (admin) ───────────────────────────── */

const USER_SELECT = { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true, slug: true, jobTitle: true, bio: true, photoUrl: true, _count: { select: { articles: true } } } as const;
const PROFILE_AR: Record<string, string> = { jobTitle: 'الصفة', bio: 'النبذة', photoUrl: 'الصورة', slug: 'رابط الصفحة' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/users', requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const data = await prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data });
  } catch (e) { sendError(res, e); }
});

// POST /api/admin/users { name, email, role, password } — created verified, ready to log in
router.post('/users', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, email, role, password } = req.body || {};
    const n = String(name || '').trim(), em = String(email || '').trim().toLowerCase(), pw = String(password || '');
    if (!n || !em || !pw) return res.status(400).json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' });
    if (!EMAIL_RE.test(em)) return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
    if (pw.length < 8) return res.status(400).json({ error: 'كلمة المرور 8 أحرف على الأقل' });
    const r = ROLES.includes(role) ? role : 'JOURNALIST';
    const data = await prisma.user.create({
      data: { name: n, email: em, role: r as any, password: await hashPassword(pw), emailVerified: true, slug: await freeSlug(prisma, n) },
      select: USER_SELECT,
    });
    await audit(prisma, who(req), req, { action: 'user.create', targetType: 'user', targetId: data.id, summary: `أنشأ حساب ${data.name} بدور ${ROLE_AR[r] || r}`, meta: { email: em, role: r } });
    res.status(201).json({ success: true, data });
  } catch (e) {
    if (isUniqueError(e)) return res.status(409).json({ error: 'هذا البريد مستخدم بالفعل' });
    sendError(res, e);
  }
});

// PUT /api/admin/users/:id { name?, role?, password? }. No DELETE: deleting a user
// cascades to their articles; set role VIEWER to revoke access instead.
router.put('/users/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const me = who(req);
    const { name, role, password } = req.body || {};
    const data: any = {};
    if (name !== undefined) { const n = String(name).trim(); if (!n) return res.status(400).json({ error: 'الاسم مطلوب' }); data.name = n; }
    if (role !== undefined) {
      if (!ROLES.includes(role)) return res.status(400).json({ error: 'دور غير صالح' });
      if (req.params.id === me.id && role !== 'ADMIN') return res.status(400).json({ error: 'لا يمكنك إزالة صلاحية المدير عن نفسك' });
      if (role !== 'ADMIN') {
        const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
        if (target?.role === 'ADMIN') {
          const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
          if (admins <= 1) return res.status(400).json({ error: 'يجب أن يبقى مدير واحد على الأقل' });
        }
      }
      data.role = role;
    }
    if (password !== undefined) { const pw = String(password); if (pw.length < 8) return res.status(400).json({ error: 'كلمة المرور 8 أحرف على الأقل' }); data.password = await hashPassword(pw); }
    const prof = await parseProfile(prisma, req.body, req.params.id);
    if (!prof.ok) return res.status(prof.status).json({ error: prof.error });
    Object.assign(data, prof.data);
    const before = await prisma.user.findUnique({ where: { id: req.params.id }, select: { name: true, role: true } });
    const row = await prisma.user.update({ where: { id: req.params.id }, data, select: USER_SELECT });
    const changedProfile = Object.keys(prof.data);
    if (before && changedProfile.length) {
      await audit(prisma, me, req, { action: 'user.profile', targetType: 'user', targetId: row.id, summary: `عدّل الملف العام لـ ${row.name} (${changedProfile.map((k) => PROFILE_AR[k] || k).join('، ')})`, meta: { fields: changedProfile } });
    }
    if (before && data.role !== undefined && before.role !== row.role) {
      await audit(prisma, me, req, { action: 'user.role', targetType: 'user', targetId: row.id, summary: `غيّر دور ${row.name} من ${ROLE_AR[before.role] || before.role} إلى ${ROLE_AR[row.role] || row.role}`, meta: { from: before.role, to: row.role } });
    }
    if (before && data.name !== undefined && before.name !== row.name) {
      await audit(prisma, me, req, { action: 'user.rename', targetType: 'user', targetId: row.id, summary: `غيّر اسم ${q(before.name)} إلى ${q(row.name)}`, meta: { from: before.name, to: row.name } });
    }
    if (data.password !== undefined) {
      await audit(prisma, me, req, { action: 'user.password', targetType: 'user', targetId: row.id, summary: `عيّن كلمة مرور جديدة لـ ${row.name}` });
    }
    res.json({ success: true, data: row });
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    sendError(res, e);
  }
});

/* ───────────────────────────── homepage data blocks (editors, D-076) ───────────────────────────── */

// GET /api/admin/data — every block's field definitions, stored rows and whether readers see it now
router.get('/data', requireRole(...EDITOR_ROLES), async (_req: Request, res: Response) => {
  try {
    const blocks = await Promise.all(DATA_SPECS.map(async (spec) => {
      const s = await readBlock(prisma, spec.type);
      return { spec, items: s?.items || [], updatedAt: s?.updatedAt || null, live: !!publicItems(spec, s) };
    }));
    res.json({ success: true, data: { blocks, fx: fxView(await readFx(prisma)) } });
  } catch (e) { sendError(res, e); }
});

// PUT /api/admin/data/:type { items } — replace a block's rows ([] clears it)
router.put('/data/:type', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const spec = DATA_SPECS.find((x) => x.type === req.params.type);
    if (!spec) return res.status(404).json({ error: 'Not found' });
    const p = parseBlock(spec.type, req.body);
    if (!p.ok) return res.status(400).json({ error: p.error });
    const saved = await writeBlock(prisma, spec.type, p.items, who(req).id);
    await audit(prisma, who(req), req, { action: p.items.length ? 'data.update' : 'data.clear', targetType: 'data', targetId: spec.type, summary: p.items.length ? `حدّث «${spec.label}» (${p.items.length} بنود)` : `أفرغ «${spec.label}»` });
    res.json({ success: true, data: { items: saved?.items || [], updatedAt: saved?.updatedAt || null, live: !!publicItems(spec, saved) } });
  } catch (e) { sendError(res, e); }
});

/* ───────────────────────────── web push for «عاجل» (D-072) ───────────────────────────── */

// GET /api/admin/push — switch state, subscriber count, the last 10 alerts (editors)
router.get('/push', requireRole(...EDITOR_ROLES), async (_req: Request, res: Response) => {
  try {
    const cfg = await readPush(prisma);
    const [subscribers, recent] = await Promise.all([
      prisma.pushSubscription.count(),
      prisma.pushSend.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    res.json({ success: true, data: { enabled: !!cfg?.enabled, subscribers, recent, gapMinutes: SEND_GAP_MS / 60_000 } });
  } catch (e) { sendError(res, e); }
});

// PUT /api/admin/push { enabled } — admins only; the first switch-on generates the key pair
router.put('/push', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be true or false' });
    const before = await readPush(prisma);
    const cfg = await setPushEnabled(prisma, req.body.enabled);
    if (!!before?.enabled !== cfg.enabled) {
      await audit(prisma, who(req), req, { action: cfg.enabled ? 'push.enable' : 'push.disable', targetType: 'push', summary: cfg.enabled ? 'شغّل تنبيهات المتصفح للعاجل' : 'أوقف تنبيهات المتصفح للعاجل' });
    }
    res.json({ success: true, data: { enabled: cfg.enabled } });
  } catch (e) { sendError(res, e); }
});

// POST /api/admin/push/send { title, url } — editors; one alert per 10 minutes
router.post('/push/send', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const title = String(req.body?.title || '').replace(/<[^>]*>/g, '').trim().slice(0, 140);
    if (title.length < 5) return res.status(400).json({ error: 'نص التنبيه قصير جداً' });
    const url = safeHref(String(req.body?.url || '/').trim().slice(0, 300));
    if (!url) return res.status(400).json({ error: 'الرابط يجب أن يبدأ بـ / أو https://' });
    const r = await sendAlert(prisma, { title, url }, who(req).id);
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    await audit(prisma, who(req), req, { action: 'push.send', targetType: 'push', targetId: r.send.id, summary: `أرسل تنبيه عاجل إلى ${r.send.total} متصفحاً: ${q(title, 120)}`, meta: { url, total: r.send.total } });
    res.status(202).json({ success: true, data: r.send });
  } catch (e) { sendError(res, e); }
});

/* ───────────────────────────── statistics (editors, D-069) ───────────────────────────── */

// GET /api/admin/stats?days=7|30|90 — reads, top articles, sections, authors, desk output, newsletter, comments, ads
router.get('/stats', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    res.json({ success: true, data: await siteStats(prisma, days) });
  } catch (e) { sendError(res, e); }
});

/* ───────────────────────────── own public profile (any staff, D-067) ───────────────────────────── */

// GET/PUT /api/admin/profile { jobTitle?, bio?, photoUrl?, slug? } — the signed-in staff member's /author page
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const u = await prisma.user.findUnique({ where: { id: who(req).id }, select: { id: true, name: true, slug: true, jobTitle: true, bio: true, photoUrl: true } });
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: u });
  } catch (e) { sendError(res, e); }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const me = who(req);
    const prof = await parseProfile(prisma, req.body, me.id);
    if (!prof.ok) return res.status(prof.status).json({ error: prof.error });
    const fields = Object.keys(prof.data);
    const u = await prisma.user.update({ where: { id: me.id }, data: prof.data, select: { id: true, name: true, slug: true, jobTitle: true, bio: true, photoUrl: true } });
    if (fields.length) await audit(prisma, me, req, { action: 'user.profile', targetType: 'user', targetId: u.id, summary: `عدّل ملفه العام (${fields.map((k) => PROFILE_AR[k] || k).join('، ')})`, meta: { fields } });
    res.json({ success: true, data: u });
  } catch (e) { sendError(res, e); }
});

/* ───────────────────────────── homepage curation (editors) ───────────────────────────── */

router.get('/homepage', requireRole(...EDITOR_ROLES), async (_req: Request, res: Response) => {
  try {
    const setting = await readHomepageSetting(prisma);
    const resolved = await resolveHomepage(prisma, setting);
    res.json({ success: true, data: { setting, resolved } });
  } catch (e) { sendError(res, e); }
});

// PUT /api/admin/homepage { heroId?, pickIds?, breaking?: { title, href } | null, demoBlocks?: boolean }
router.put('/homepage', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const { heroId, pickIds, breaking, demoBlocks } = req.body || {};
    const prev = await readHomepageSetting(prisma);
    const next: HomepageSetting = {};
    next.heroId = heroId ? String(heroId) : null;
    // demoBlocks (D-052): omitted → keep the stored value; otherwise must be a boolean
    if (demoBlocks === undefined) next.demoBlocks = prev.demoBlocks;
    else if (typeof demoBlocks === 'boolean') next.demoBlocks = demoBlocks;
    else return res.status(400).json({ error: 'demoBlocks must be true or false' });
    if (pickIds !== undefined) {
      if (!Array.isArray(pickIds) || !pickIds.every((x) => typeof x === 'string')) return res.status(400).json({ error: 'pickIds[] of ids' });
      if (pickIds.length > MAX_PICKS) return res.status(400).json({ error: `حتى ${MAX_PICKS} مختارات` });
      next.pickIds = Array.from(new Set(pickIds as string[]));
    } else next.pickIds = prev.pickIds;
    if (breaking && typeof breaking === 'object' && String(breaking.title || '').trim()) {
      const title = String(breaking.title).trim().slice(0, 200);
      // Same rule as banner links (D-064): an internal path, or https without credentials or a raw IP.
      const href = safeHref(String(breaking.href || '/').trim().slice(0, 300));
      if (!href) return res.status(400).json({ error: 'رابط العاجل يجب أن يبدأ بـ / أو https:// (لا عناوين IP ولا بيانات دخول)' });
      next.breaking = { title, href, at: breaking.at && !isNaN(new Date(breaking.at).getTime()) ? new Date(breaking.at).toISOString() : new Date().toISOString() };
    } else next.breaking = null;
    const setting = await writeHomepageSetting(prisma, next);
    const u = who(req);
    const pb = prev.breaking || null, nb = setting.breaking || null;
    if ((pb?.title || '') !== (nb?.title || '') || (pb?.href || '') !== (nb?.href || '')) {
      await audit(prisma, u, req, {
        action: 'homepage.breaking', targetType: 'homepage',
        summary: nb ? `وضع خبراً عاجلاً: ${q(nb.title, 120)}` : `أزال الخبر العاجل ${q(pb?.title || '', 120)}`,
        meta: { from: pb, to: nb },
      });
    }
    const parts: string[] = [];
    if ((prev.heroId || null) !== (setting.heroId || null)) parts.push('الخبر الرئيسي');
    if (JSON.stringify(prev.pickIds || []) !== JSON.stringify(setting.pickIds || [])) parts.push('المختارات');
    if (!!prev.demoBlocks !== !!setting.demoBlocks) parts.push(setting.demoBlocks ? 'أظهر الأقسام التوضيحية' : 'أخفى الأقسام التوضيحية');
    if (parts.length) {
      await audit(prisma, u, req, {
        action: 'homepage.update', targetType: 'homepage', summary: `عدّل الصفحة الرئيسية: ${parts.join('، ')}`,
        meta: { heroFrom: prev.heroId ?? null, heroTo: setting.heroId ?? null, picksFrom: prev.pickIds ?? [], picksTo: setting.pickIds ?? [], demoBlocks: setting.demoBlocks },
      });
    }
    res.json({ success: true, data: { setting, resolved: await resolveHomepage(prisma, setting) } });
  } catch (e) { sendError(res, e); }
});

/* ───────────────────────────── ads (admin) ───────────────────────────── */

// Ad zones, AdSense ids and ads.txt (D-043 Stage 5). Admin only: this is the site's revenue setup.
router.get('/ads', requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await readAds(prisma) }); // all banners, scheduled or not
  } catch (e) { sendError(res, e); }
});

// GET /api/admin/ads/stats?days=30 — delivery counts per banner (D-057); .csv for advertiser reports.
const statDays = (q: unknown) => Math.min(365, Math.max(1, parseInt(String(q || '30'), 10) || 30));
router.get('/ads/stats', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await adStats(prisma, statDays(req.query.days)) }); }
  catch (e) { sendError(res, e); }
});
router.get('/ads/stats.csv', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const s = await adStats(prisma, statDays(req.query.days));
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = ['day,zone,bannerId,label,impressions,clicks', ...s.daily.map((r) => [r.day, r.zone, r.bannerId, s.totals.find((t) => t.bannerId === r.bannerId)?.label || '', r.impressions, r.clicks].map(esc).join(','))];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mutabe3-ads-${s.since}-${s.days}d.csv"`);
    res.send('﻿' + lines.join('\r\n'));
  } catch (e) { sendError(res, e); }
});

// PUT /api/admin/ads { adsense: { client, auto }, zones: { header|inline|article|sidebar: { mode, unit, banners[] } }, adsTxt }
router.put('/ads', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const parsed = parseAds(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const prev = await readAds(prisma);
    const saved = await writeAds(prisma, parsed.value);
    const diff = adsDiff(prev, saved);
    if (diff.lines.length) {
      await audit(prisma, who(req), req, { action: 'ads.update', targetType: 'ads', summary: `عدّل الإعلانات: ${diff.lines.join(' · ')}`.slice(0, 300), meta: diff.meta });
    }
    res.json({ success: true, data: saved });
  } catch (e) { sendError(res, e); }
});

// What an ads save changed, for the audit log: zone modes, banners added/removed/rescheduled, AdSense id, ads.txt.
const ZONE_AR: Record<string, string> = { header: 'الترويسة', inline: 'بين الأقسام', article: 'داخل المقال', sidebar: 'العمود الجانبي' };
function adsDiff(a: AdsSetting, b: AdsSetting) {
  const lines: string[] = [];
  const zones: Record<string, unknown> = {};
  for (const z of ZONES) {
    const pa = a.zones[z], pb = b.zones[z];
    const ida = new Map(pa.banners.map((x) => [x.id, x])), idb = new Map(pb.banners.map((x) => [x.id, x]));
    const added = pb.banners.filter((x) => !ida.has(x.id)), removed = pa.banners.filter((x) => !idb.has(x.id));
    const changed = pb.banners.filter((x) => { const o = ida.get(x.id); return o && JSON.stringify(o) !== JSON.stringify(x); });
    const bits: string[] = [];
    if (pa.mode !== pb.mode) bits.push(`من ${MODE_AR[pa.mode] || pa.mode} إلى ${MODE_AR[pb.mode] || pb.mode}`);
    if (added.length) bits.push(`+${added.length} بانر (${added.map((x) => x.label || x.alt || x.id).join('، ')})`);
    if (removed.length) bits.push(`−${removed.length} بانر (${removed.map((x) => x.label || x.alt || x.id).join('، ')})`);
    if (changed.length) bits.push(`تعديل ${changed.length}`);
    if (pa.unit !== pb.unit) bits.push('وحدة AdSense');
    if (bits.length) {
      lines.push(`${ZONE_AR[z]}: ${bits.join('، ')}`);
      zones[z] = {
        modeFrom: pa.mode, modeTo: pb.mode,
        added: added.map((x) => ({ id: x.id, label: x.label, href: x.href, startAt: x.startAt, endAt: x.endAt })),
        removed: removed.map((x) => ({ id: x.id, label: x.label })),
        changed: changed.map((x) => ({ id: x.id, label: x.label, href: x.href, startAt: x.startAt, endAt: x.endAt })),
      };
    }
  }
  if (a.adsense.client !== b.adsense.client || a.adsense.auto !== b.adsense.auto) lines.push('إعدادات AdSense');
  if (a.adsTxt !== b.adsTxt) lines.push('ads.txt');
  return { lines, meta: { zones, adsense: b.adsense, adsTxtChanged: a.adsTxt !== b.adsTxt } };
}

/* ───────────────────────────── audit log (admin, read-only) ───────────────────────────── */

// GET /api/admin/audit?take=50&cursor=<id>&action=<prefix>&actor=<userId|system>&target=<id> — newest first (D-064).
// There is deliberately no write, update or delete route for this table.
router.get('/audit', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const s = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v.trim() : '');
    const action = s(req.query.action, 40);
    const r = await listAudit(prisma, {
      take: parseInt(String(req.query.take || '50'), 10) || 50,
      cursor: /^[a-z0-9]{10,40}$/.test(s(req.query.cursor, 40)) ? s(req.query.cursor, 40) : undefined,
      action: /^[a-z.]+$/.test(action) ? action : undefined,
      actorId: s(req.query.actor, 40) || undefined,
      targetId: s(req.query.target, 200) || undefined,
    });
    res.json({ success: true, ...r });
  } catch (e) { console.error('audit list:', e); res.status(500).json({ error: 'تعذّر تحميل السجل' }); }
});

export default router;
