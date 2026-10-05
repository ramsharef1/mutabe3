import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware';

const router = Router();
const prisma = new PrismaClient();

const EDITOR_ROLES = ['ADMIN', 'EDITOR'];
const STATUSES = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'];

// Every admin route needs a valid token AND an editor/admin role.
async function requireEditor(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    if (!user || !EDITOR_ROLES.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: editor access required' });
    }
    (req as any).user = user;
    next();
  } catch {
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

router.use(authMiddleware, requireEditor);

const slugify = (s: string) =>
  (s || '').toString().trim().toLowerCase().replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const makeSlug = (title: string, provided?: string) =>
  `${slugify(provided || title) || 'article'}-${Math.random().toString(36).slice(2, 8)}`;

// GET /api/admin/articles — every status, newest edits first (dashboard list)
router.get('/articles', async (_req: Request, res: Response) => {
  try {
    const articles = await prisma.article.findMany({
      include: { author: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: articles });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET one (incl. drafts) for the editor
router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const a = await prisma.article.findUnique({ where: { id: req.params.id }, include: { category: true } });
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: a });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST create
router.post('/articles', async (req: Request, res: Response) => {
  try {
    const { title, summary, content, categoryId, featuredImageUrl, status, seoKeywords, slug } = req.body || {};
    if (!title || !content || !categoryId) {
      return res.status(400).json({ error: 'title, content and categoryId are required' });
    }
    const st = STATUSES.includes(status) ? status : 'DRAFT';
    const article = await prisma.article.create({
      data: {
        title,
        summary: summary || null,
        content,
        slug: makeSlug(title, slug),
        featuredImageUrl: featuredImageUrl || null,
        categoryId,
        authorId: (req as any).user.id,
        status: st,
        publishedAt: st === 'PUBLISHED' ? new Date() : null,
        seoKeywords: Array.isArray(seoKeywords) ? seoKeywords : [],
      },
    });
    res.status(201).json({ success: true, data: article });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// PUT update
router.put('/articles/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { title, summary, content, categoryId, featuredImageUrl, status, seoKeywords } = req.body || {};
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (summary !== undefined) data.summary = summary || null;
    if (content !== undefined) data.content = content;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (featuredImageUrl !== undefined) data.featuredImageUrl = featuredImageUrl || null;
    if (Array.isArray(seoKeywords)) data.seoKeywords = seoKeywords;
    if (status !== undefined && STATUSES.includes(status)) {
      data.status = status;
      if (status === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date();
    }
    const article = await prisma.article.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: article });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// DELETE
router.delete('/articles/:id', async (req: Request, res: Response) => {
  try {
    await prisma.article.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
