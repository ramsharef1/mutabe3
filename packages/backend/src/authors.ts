// Public author profiles (D-067): /api/authors and /api/authors/:slug for the «كتاب المتابع» band and
// /author/<slug>. A profile is public only when its owner opted in by filling the job title (الصفة) and has
// at least one published article — shared desk accounts (e.g. «مسؤول») never get a page by accident;
// email, role and password never leave this module. Photos must be uploads on this site (localImage).
import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from './generated/prisma/client';
import { localImage } from './ads';
import { sendError } from './errors';

const STAFF = ['ADMIN', 'EDITOR', 'JOURNALIST'] as const;

/** What an article response may say about its author. */
export const AUTHOR_PUBLIC = { id: true, name: true, slug: true, jobTitle: true, photoUrl: true } as const;

/** Same rule as article slugs: letters (Arabic included), digits and dashes. */
export const slugifyName = (s: string) =>
  (s || '').toString().trim().toLowerCase().replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** A free slug for `name` ("خالد-الرواشدة", then "خالد-الرواشدة-2" …), ignoring the user's own row. */
export async function freeSlug(prisma: PrismaClient, name: string, selfId?: string): Promise<string> {
  const base = slugifyName(name) || 'author';
  for (let n = 1; n < 50; n++) {
    const s = n === 1 ? base : `${base}-${n}`;
    const taken = await prisma.user.findFirst({ where: { slug: s, ...(selfId ? { NOT: { id: selfId } } : {}) }, select: { id: true } });
    if (!taken) return s;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Startup backfill: every staff account gets a slug once (kept stable afterwards, also across renames). */
export async function ensureAuthorSlugs(prisma: PrismaClient) {
  const rows = await prisma.user.findMany({ where: { slug: null, role: { in: [...STAFF] } }, select: { id: true, name: true } });
  for (const u of rows) await prisma.user.update({ where: { id: u.id }, data: { slug: await freeSlug(prisma, u.name, u.id) } });
  if (rows.length) console.log(`authors: ${rows.length} profile slug(s) created`);
}

/**
 * Validate the editable profile fields; absent keys are left alone, '' clears a field.
 * Returns the Prisma data or an Arabic error. `slug` is taken as typed (slugified) and must be free.
 */
export async function parseProfile(prisma: PrismaClient, body: any, selfId: string):
  Promise<{ ok: true; data: Prisma.UserUpdateInput } | { ok: false; status: number; error: string }> {
  const data: Prisma.UserUpdateInput = {};
  const text = (v: unknown, max: number) => String(v ?? '').replace(/\r/g, '').replace(/<[^>]*>/g, '').trim().slice(0, max);
  if (body?.jobTitle !== undefined) data.jobTitle = text(body.jobTitle, 80) || null;
  if (body?.bio !== undefined) data.bio = text(body.bio, 800) || null;
  if (body?.photoUrl !== undefined) {
    const raw = String(body.photoUrl ?? '').trim();
    if (!raw) data.photoUrl = null;
    else {
      const img = localImage(raw);
      if (!img) return { ok: false, status: 400, error: 'الصورة يجب أن تكون مرفوعة على الموقع من مكتبة الوسائط' };
      data.photoUrl = img;
    }
  }
  if (body?.slug !== undefined) {
    const s = slugifyName(String(body.slug ?? ''));
    if (s.length < 2) return { ok: false, status: 400, error: 'رابط الصفحة حرفان على الأقل (حروف وأرقام وشرطات)' };
    const taken = await prisma.user.findFirst({ where: { slug: s, NOT: { id: selfId } }, select: { id: true } });
    if (taken) return { ok: false, status: 409, error: 'هذا الرابط مستخدم لكاتب آخر' };
    data.slug = s;
  }
  return { ok: true, data };
}

const PUBLISHED = { status: 'PUBLISHED' as const };
/** Opt-in: staff, with a page address and a job title. */
const PUBLIC_PROFILE = { role: { in: [...STAFF] }, slug: { not: null }, jobTitle: { not: null } } satisfies Prisma.UserWhereInput;
const LIST_ARTICLE = { id: true, slug: true, title: true, summary: true, featuredImageUrl: true, publishedAt: true, kind: true, category: { select: { name: true, slug: true } } } as const;

export function authorRoutes(prisma: PrismaClient) {
  const router = Router();

  // GET /api/authors?kind=OPINION&take=12 — public authors, the one with the newest piece first,
  // each with that newest piece (of `kind` when given). Sponsored pieces never count.
  router.get('/authors', async (req: Request, res: Response) => {
    try {
      const kind = req.query.kind === 'OPINION' ? 'OPINION' as const : undefined;
      const take = Math.min(Math.max(Number(req.query.take) || 12, 1), 30);
      const where: Prisma.ArticleWhereInput = { ...PUBLISHED, kind: kind ?? { not: 'SPONSORED' } };
      const users = await prisma.user.findMany({
        where: { ...PUBLIC_PROFILE, articles: { some: where } },
        select: {
          ...AUTHOR_PUBLIC, bio: true,
          articles: { where, orderBy: { publishedAt: 'desc' }, take: 1, select: LIST_ARTICLE },
          _count: { select: { articles: { where: { ...PUBLISHED, kind: { not: 'SPONSORED' } } } } },
        },
      });
      const data = users
        .map(({ articles, _count, ...u }) => ({ ...u, latest: articles[0] || null, count: _count.articles }))
        .sort((a, b) => +new Date(b.latest?.publishedAt || 0) - +new Date(a.latest?.publishedAt || 0))
        .slice(0, take);
      res.json({ success: true, data });
    } catch (e) { sendError(res, e); }
  });

  // GET /api/authors/:slug?page=N — profile + published articles, 24 per page; 404 for unknown,
  // non-staff or never-published accounts.
  router.get('/authors/:slug', async (req: Request, res: Response) => {
    try {
      let slug = String(req.params.slug || '');
      try { slug = decodeURIComponent(slug); } catch { /* already decoded */ }
      if (!slug || slug.length > 80) return res.status(404).json({ error: 'غير موجود', code: 'NOT_FOUND' });
      const where: Prisma.ArticleWhereInput = { ...PUBLISHED, kind: { not: 'SPONSORED' } };
      const u = await prisma.user.findFirst({
        where: { ...PUBLIC_PROFILE, slug, articles: { some: where } },
        select: { ...AUTHOR_PUBLIC, bio: true, _count: { select: { articles: { where } } } },
      });
      if (!u) return res.status(404).json({ error: 'غير موجود', code: 'NOT_FOUND' });
      const page = Math.min(Math.max(Number(req.query.page) || 1, 1), 500);
      const articles = await prisma.article.findMany({
        where: { ...where, authorId: u.id }, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * 24, take: 24, select: LIST_ARTICLE,
      });
      const { _count, ...profile } = u;
      res.json({ success: true, data: { ...profile, count: _count.articles, page, pages: Math.max(1, Math.ceil(_count.articles / 24)), articles } });
    } catch (e) { sendError(res, e); }
  });

  return router;
}
