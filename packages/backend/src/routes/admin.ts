import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, drainRequest } from '../middleware';
import { sanitizeArticleHtml } from '../sanitize';
import { imageUpload, storeUpload, listMedia, MAX_UPLOAD_BYTES, UPLOAD_URL, uploadRel, uploadExists, deleteUpload } from '../uploads';
import { hashPassword } from '../auth';
import { readHomepageSetting, writeHomepageSetting, resolveHomepage, MAX_PICKS, HomepageSetting } from '../homepage';
import readerAdmin from './adminReaders';
import { readAds, parseAds, writeAds } from '../ads';

const router = Router();
const prisma = new PrismaClient();

// Roles (D-043 Stage 3): ADMIN everything · EDITOR all content + categories +
// homepage · JOURNALIST own drafts only, no publishing · VIEWER no dashboard.
const STAFF_ROLES = ['ADMIN', 'EDITOR', 'JOURNALIST'];
const EDITOR_ROLES = ['ADMIN', 'EDITOR'];
const ROLES = ['ADMIN', 'EDITOR', 'JOURNALIST', 'VIEWER'];
const STATUSES = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'];

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
  } catch (e) { res.status(500).json({ error: String(e) }); }
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
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST create
router.post('/articles', async (req: Request, res: Response) => {
  try {
    const u = who(req);
    const { title, summary, content, categoryId, featuredImageUrl, status, seoKeywords, slug, scheduledPublishAt } = req.body || {};
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
        categoryId,
        authorId: u.id,
        status: st,
        publishedAt: st === 'PUBLISHED' ? new Date() : null,
        scheduledPublishAt: st === 'SCHEDULED' ? when : null,
        seoKeywords: Array.isArray(seoKeywords) ? seoKeywords : [],
      },
    });
    res.status(201).json({ success: true, data: article });
  } catch (e) { res.status(500).json({ error: String(e) }); }
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
    const { title, summary, content, categoryId, featuredImageUrl, status, seoKeywords, scheduledPublishAt } = req.body || {};
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (summary !== undefined) data.summary = summary || null;
    if (content !== undefined) data.content = sanitizeArticleHtml(String(content));
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (featuredImageUrl !== undefined) data.featuredImageUrl = featuredImageUrl || null;
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
    res.json({ success: true, data: article });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// DELETE — editors anything; journalists their own drafts
router.delete('/articles/:id', async (req: Request, res: Response) => {
  try {
    const u = who(req);
    const existing = await prisma.article.findUnique({ where: { id: req.params.id }, select: { authorId: true, status: true } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!isEditor(u) && (existing.authorId !== u.id || existing.status !== 'DRAFT')) {
      return res.status(403).json({ error: 'الحذف هنا يتطلب صلاحية محرر' });
    }
    await prisma.article.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

/* ───────────────────────────── media ───────────────────────────── */

// POST /api/admin/upload — multipart field "file" (image) → { url } under /api/uploads/…
router.post('/upload', (req: Request, res: Response) => {
  imageUpload.single('file')(req, res, (err: any) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `الملف أكبر من ${Math.round(MAX_UPLOAD_BYTES / 1048576)}MB` : err.message || 'Upload failed';
      return res.status(400).json({ error: msg });
    }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file received' });
    // D-045: stored as a WebP master (q82, ≤2048px) unless the ingest kept the original (gif/animated/failure)
    storeUpload(file)
      .then((s) => res.status(201).json({
        success: true, url: s.url, name: file.originalname, size: s.size, originalSize: file.size,
        format: s.mime, converted: s.converted, width: s.width, height: s.height,
      }))
      .catch((e) => { console.error('[upload] store failed:', e); res.status(500).json({ error: 'تعذّر حفظ الصورة' }); });
  });
});

// GET /api/admin/media — newest uploads first, for the editor's picker
router.get('/media', (_req: Request, res: Response) => {
  try { res.json({ success: true, data: listMedia() }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
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
    res.json({ success: true, url: `${UPLOAD_URL}/${rel}`, removed: r.removed, forced: used > 0 && force, ...(used ? { references: refs } : {}) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
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
  } catch (e) { res.status(500).json({ error: String(e) }); }
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
    res.status(201).json({ success: true, data });
  } catch (e) {
    if (isUniqueError(e)) return res.status(409).json({ error: 'الاسم أو المعرّف مستخدم لقسم آخر' });
    res.status(500).json({ error: String(e) });
  }
});

// PUT /api/admin/categories/order { ids: [...] } — declared before /:id so "order" is never read as an id
router.put('/categories/order', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const ids: unknown = req.body?.ids;
    if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) return res.status(400).json({ error: 'ids[] required' });
    await prisma.$transaction((ids as string[]).map((id, i) => prisma.category.update({ where: { id }, data: { displayOrder: i + 1 } })));
    const data = await prisma.category.findMany({ select: CATEGORY_SELECT, orderBy: { displayOrder: 'asc' } });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
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
    const row = await prisma.category.update({ where: { id: req.params.id }, data, select: CATEGORY_SELECT });
    res.json({ success: true, data: row });
  } catch (e: any) {
    if (isUniqueError(e)) return res.status(409).json({ error: 'الاسم أو المعرّف مستخدم لقسم آخر' });
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: String(e) });
  }
});

router.delete('/categories/:id', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const n = await prisma.article.count({ where: { categoryId: req.params.id } });
    if (n > 0) return res.status(409).json({ error: `لا يمكن حذف قسم يحتوي ${n} مقالاً — انقل مقالاته أولاً` });
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: String(e) });
  }
});

/* ───────────────────────────── users (admin) ───────────────────────────── */

const USER_SELECT = { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true, _count: { select: { articles: true } } } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/users', requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const data = await prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
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
      data: { name: n, email: em, role: r as any, password: await hashPassword(pw), emailVerified: true },
      select: USER_SELECT,
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    if (isUniqueError(e)) return res.status(409).json({ error: 'هذا البريد مستخدم بالفعل' });
    res.status(500).json({ error: String(e) });
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
    const row = await prisma.user.update({ where: { id: req.params.id }, data, select: USER_SELECT });
    res.json({ success: true, data: row });
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: String(e) });
  }
});

/* ───────────────────────────── homepage curation (editors) ───────────────────────────── */

router.get('/homepage', requireRole(...EDITOR_ROLES), async (_req: Request, res: Response) => {
  try {
    const setting = await readHomepageSetting(prisma);
    const resolved = await resolveHomepage(prisma, setting);
    res.json({ success: true, data: { setting, resolved } });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// PUT /api/admin/homepage { heroId?, pickIds?, breaking?: { title, href } | null, demoBlocks?: boolean }
router.put('/homepage', requireRole(...EDITOR_ROLES), async (req: Request, res: Response) => {
  try {
    const { heroId, pickIds, breaking, demoBlocks } = req.body || {};
    const next: HomepageSetting = {};
    next.heroId = heroId ? String(heroId) : null;
    // demoBlocks (D-052): omitted → keep the stored value; otherwise must be a boolean
    if (demoBlocks === undefined) next.demoBlocks = (await readHomepageSetting(prisma)).demoBlocks;
    else if (typeof demoBlocks === 'boolean') next.demoBlocks = demoBlocks;
    else return res.status(400).json({ error: 'demoBlocks must be true or false' });
    if (pickIds !== undefined) {
      if (!Array.isArray(pickIds) || !pickIds.every((x) => typeof x === 'string')) return res.status(400).json({ error: 'pickIds[] of ids' });
      if (pickIds.length > MAX_PICKS) return res.status(400).json({ error: `حتى ${MAX_PICKS} مختارات` });
      next.pickIds = Array.from(new Set(pickIds as string[]));
    } else next.pickIds = (await readHomepageSetting(prisma)).pickIds;
    if (breaking && typeof breaking === 'object' && String(breaking.title || '').trim()) {
      const title = String(breaking.title).trim().slice(0, 200);
      const href = String(breaking.href || '/').trim().slice(0, 300);
      if (!/^(\/|https?:\/\/)/.test(href)) return res.status(400).json({ error: 'رابط العاجل يجب أن يبدأ بـ / أو https://' });
      next.breaking = { title, href, at: breaking.at && !isNaN(new Date(breaking.at).getTime()) ? new Date(breaking.at).toISOString() : new Date().toISOString() };
    } else next.breaking = null;
    const setting = await writeHomepageSetting(prisma, next);
    res.json({ success: true, data: { setting, resolved: await resolveHomepage(prisma, setting) } });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

/* ───────────────────────────── ads (admin) ───────────────────────────── */

// Ad zones, AdSense ids and ads.txt (D-043 Stage 5). Admin only: this is the site's revenue setup.
router.get('/ads', requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await readAds(prisma) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// PUT /api/admin/ads { adsense: { client, auto }, zones: { header|inline|article|sidebar: { mode, unit, banners[] } }, adsTxt }
router.put('/ads', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const parsed = parseAds(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    res.json({ success: true, data: await writeAds(prisma, parsed.value) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
