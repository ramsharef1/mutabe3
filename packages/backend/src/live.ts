// Live blogs (D-068): public reads of a LIVE article's updates and of the coverage running now.
// Writing happens in routes/admin.ts (editors, or a journalist on their own draft).
import { Router, Request, Response } from 'express';
import { PrismaClient } from './generated/prisma/client';
import { sendError } from './errors';

export const LIVE_TEXT_MAX = 3000;
export const LIVE_TITLE_MAX = 140;
/** The homepage strip only advertises coverage that moved in the last 12 hours. */
const CURRENT_WINDOW_MS = 12 * 60 * 60 * 1000;
const ENTRY_PUBLIC = { id: true, at: true, title: true, text: true, key: true } as const;

/** Plain text only: tags removed, line breaks kept, trimmed to `max`. */
export const plainText = (v: unknown, max: number) =>
  String(v ?? '').replace(/\r/g, '').replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

export function liveRoutes(prisma: PrismaClient) {
  const router = Router();

  // GET /api/articles/:id/live — updates of a published LIVE article (id or slug), newest first.
  router.get('/articles/:id/live', async (req: Request, res: Response) => {
    try {
      const key = String(req.params.id || '');
      if (!key || key.length > 200) return res.status(404).json({ error: 'غير موجود', code: 'NOT_FOUND' });
      const a = await prisma.article.findFirst({
        where: { OR: [{ id: key }, { slug: key }], status: 'PUBLISHED', kind: 'LIVE' },
        select: { id: true, liveEndedAt: true, publishedAt: true },
      });
      if (!a) return res.status(404).json({ error: 'غير موجود', code: 'NOT_FOUND' });
      const entries = await prisma.liveEntry.findMany({ where: { articleId: a.id, at: { lte: new Date() } }, orderBy: { at: 'desc' }, take: 300, select: ENTRY_PUBLIC });
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, data: { id: a.id, open: !a.liveEndedAt, endedAt: a.liveEndedAt, startedAt: a.publishedAt, entries } });
    } catch (e) { sendError(res, e); }
  });

  // GET /api/live/current — the open coverage with the most recent update (≤ 12 h old), or null.
  router.get('/live/current', async (_req: Request, res: Response) => {
    try {
      const since = new Date(Date.now() - CURRENT_WINDOW_MS);
      const latest = await prisma.liveEntry.findFirst({
        where: { at: { gte: since, lte: new Date() }, article: { status: 'PUBLISHED', kind: 'LIVE', liveEndedAt: null } },
        orderBy: { at: 'desc' },
        select: { ...ENTRY_PUBLIC, article: { select: { id: true, slug: true, title: true, _count: { select: { liveEntries: true } } } } },
      });
      if (!latest) return res.json({ success: true, data: null });
      const { article, ...entry } = latest;
      res.json({ success: true, data: { id: article.id, slug: article.slug, title: article.title, count: article._count.liveEntries, latest: entry } });
    } catch (e) { sendError(res, e); }
  });

  return router;
}
