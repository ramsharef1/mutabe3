// First-party newsroom statistics (D-069, ANALYTICS-PLAN §1 "views per article 24h/7d/30d").
// Reads: every counted read (POST /api/articles/:id/view, after its bot/repeat/per-address checks) is
// queued here and written to ArticleViewDaily once a minute by the scheduler — one upsert per article per
// minute, not one write per read. Days are Amman calendar days. GA4 stays the audience-proof layer;
// these numbers are consent-independent and never identify a reader.
import { PrismaClient } from './generated/prisma/client';

const AMMAN = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit' });
/** YYYY-MM-DD in Amman. */
export const ammanDay = (d = new Date()) => AMMAN.format(d);
const asDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const addDays = (day: string, n: number) => { const d = asDate(day); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const pending = new Map<string, { day: string; articleId: string; views: number }>();

/** Queue one counted read. */
export function recordView(articleId: string) {
  const day = ammanDay();
  const k = `${day}|${articleId}`;
  const row = pending.get(k) || { day, articleId, views: 0 };
  row.views++;
  pending.set(k, row);
}

/** Write queued reads; called by the scheduler every minute and on shutdown. */
export async function flushViewStats(prisma: PrismaClient) {
  if (!pending.size) return 0;
  const rows = [...pending.values()];
  pending.clear();
  for (const r of rows) {
    const day = asDate(r.day);
    await prisma.articleViewDaily.upsert({
      where: { day_articleId: { day, articleId: r.articleId } },
      update: { views: { increment: r.views } },
      create: { day, articleId: r.articleId, views: r.views },
    });
  }
  return rows.length;
}

const ARTICLE_META = { id: true, slug: true, title: true, kind: true, status: true, publishedAt: true, category: { select: { name: true, slug: true } }, author: { select: { name: true } } } as const;

/**
 * Everything the «الإحصاءات» page shows for the last `days` Amman days (today included), with the
 * period before it for comparison. Deleted articles are skipped; reads of drafts cannot exist.
 */
export async function siteStats(prisma: PrismaClient, days = 30) {
  const today = ammanDay();
  const from = addDays(today, -(days - 1));
  const prevFrom = addDays(from, -days);
  const range = Array.from({ length: days }, (_, i) => addDays(from, i));

  // reads per day (this period + the one before)
  const byDay = await prisma.articleViewDaily.groupBy({ by: ['day'], where: { day: { gte: asDate(prevFrom) } }, _sum: { views: true } });
  const dayMap = new Map(byDay.map((r) => [r.day.toISOString().slice(0, 10), r._sum.views || 0]));
  const daily = range.map((d) => ({ day: d, views: dayMap.get(d) || 0 }));
  const total = daily.reduce((s, r) => s + r.views, 0);
  const prevTotal = [...dayMap].filter(([d]) => d >= prevFrom && d < from).reduce((s, [, v]) => s + v, 0);
  const first = await prisma.articleViewDaily.findFirst({ orderBy: { day: 'asc' }, select: { day: true } });

  // per-article sums for the three windows the desk asks about
  const sums = async (since: string) =>
    prisma.articleViewDaily.groupBy({ by: ['articleId'], where: { day: { gte: asDate(since) } }, _sum: { views: true }, orderBy: { _sum: { views: 'desc' } }, take: 500 });
  const [s1, s7, sN] = await Promise.all([sums(today), sums(addDays(today, -6)), sums(from)]);
  const ids = [...new Set([...s1, ...s7, ...sN].map((r) => r.articleId))];
  const meta = new Map((await prisma.article.findMany({ where: { id: { in: ids } }, select: ARTICLE_META })).map((a) => [a.id, a]));
  const top = (rows: typeof s1) => rows.filter((r) => meta.has(r.articleId)).slice(0, 10).map((r) => ({ ...meta.get(r.articleId)!, views: r._sum.views || 0 }));

  const byCategory = new Map<string, { name: string; slug: string; views: number }>();
  const byAuthor = new Map<string, { name: string; views: number; articles: number }>();
  for (const r of sN) {
    const a = meta.get(r.articleId); if (!a) continue;
    const v = r._sum.views || 0;
    const c = byCategory.get(a.category.slug) || { name: a.category.name, slug: a.category.slug, views: 0 };
    c.views += v; byCategory.set(a.category.slug, c);
    const au = byAuthor.get(a.author.name) || { name: a.author.name, views: 0, articles: 0 };
    au.views += v; au.articles++; byAuthor.set(a.author.name, au);
  }

  // desk output: published pieces per Amman day (target 10+/day, BIBLE F-13)
  const published = await prisma.article.findMany({ where: { status: 'PUBLISHED', publishedAt: { gte: asDate(addDays(from, -1)) } }, select: { publishedAt: true, kind: true } });
  const pubMap = new Map<string, { all: number; sponsored: number }>();
  for (const p of published) {
    const d = ammanDay(p.publishedAt!); if (d < from) continue;
    const row = pubMap.get(d) || { all: 0, sponsored: 0 };
    row.all++; if (p.kind === 'SPONSORED') row.sponsored++;
    pubMap.set(d, row);
  }
  const output = range.map((d) => ({ day: d, published: pubMap.get(d)?.all || 0, sponsored: pubMap.get(d)?.sponsored || 0 }));

  const since = asDate(from);
  const [subsActive, subsConfirmed, subsLeft, cPending, cApproved, cReceived, ads] = await Promise.all([
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.subscription.count({ where: { confirmedAt: { gte: since } } }),
    prisma.subscription.count({ where: { unsubscribedAt: { gte: since } } }),
    prisma.comment.count({ where: { status: 'PENDING' } }),
    prisma.comment.count({ where: { status: 'APPROVED', createdAt: { gte: since } } }),
    prisma.comment.count({ where: { createdAt: { gte: since } } }),
    prisma.adStatDaily.aggregate({ where: { day: { gte: since } }, _sum: { impressions: true, clicks: true } }),
  ]);

  return {
    days, from, to: today, dataSince: first ? first.day.toISOString().slice(0, 10) : null,
    reads: { total, prevTotal, today: dayMap.get(today) || 0, daily },
    top: { day: top(s1), week: top(s7), period: top(sN) },
    byCategory: [...byCategory.values()].sort((a, b) => b.views - a.views),
    byAuthor: [...byAuthor.values()].sort((a, b) => b.views - a.views).slice(0, 15),
    output: { daily: output, total: output.reduce((s, r) => s + r.published, 0) },
    newsletter: { active: subsActive, confirmed: subsConfirmed, unsubscribed: subsLeft },
    comments: { pending: cPending, approved: cApproved, received: cReceived },
    ads: { impressions: ads._sum.impressions || 0, clicks: ads._sum.clicks || 0 },
  };
}
