// Arabic search (D-071). Every article carries `searchText`: its title, summary, body (HTML removed) and
// keywords folded by normalizeAr(). A query is folded the same way and each word reduced to a stem
// (prefixes و ف ب ك ل + ال / لل dropped), so «بالأردن», «الاردن» and «أردن» find the same stories and
// tashkeel, hamza forms, ى/ي and ة/ه never get in the way. Matches are ranked: title over summary over
// body, all words in the title or the exact phrase score extra, newer wins ties. With no match, a
// «هل تقصد…» suggestion is built from headline vocabulary (edit distance 1–2) and kept only if it finds something.
import { PrismaClient, Prisma } from './generated/prisma/client';

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

/** Fold Arabic (and Latin) text for matching. */
export function normalizeAr(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(TASHKEEL, '').replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[^\p{L}\p{N}%]+/gu, ' ')
    .trim();
}

const htmlText = (html: string) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, ' ');

export const searchTextFor = (a: { title: string; summary?: string | null; content: string; seoKeywords?: string[] }) =>
  normalizeAr([a.title, a.summary || '', htmlText(a.content), (a.seoKeywords || []).join(' ')].join(' ')).slice(0, 60000);

/** Reduce one folded word to the form we look for (substring match covers the prefixed forms). */
export function stem(w: string): string {
  // every cut must leave 3+ letters, so short words (الله، بالون، فلسطين) keep their own letters
  const cut = (t: string, n: number) => (t.length - n >= 3 ? t.slice(n) : t);
  let t = w;
  if (/^(و|ف)(ال|لل|بال)/.test(t)) t = cut(t, 1);   // والحكومه → الحكومه (never فلسطين → لسطين)
  if (/^لل/.test(t)) t = cut(t, 2);                  // للحكومه → حكومه
  else if (/^(بال|كال)/.test(t)) t = cut(t, 3);      // بالاردن → اردن
  else if (/^ال/.test(t)) t = cut(t, 2);             // الاردن → اردن
  return t;
}

/** The stems of a query (at most 6 words of 2+ letters). */
export const queryStems = (q: string) =>
  [...new Set(normalizeAr(q).split(' ').filter((w) => w.length >= 2).map(stem).filter((w) => w.length >= 2))].slice(0, 6);

/** Write `searchText` for one article without touching updatedAt. */
export async function reindexArticle(prisma: PrismaClient, id: string) {
  const a = await prisma.article.findUnique({ where: { id }, select: { title: true, summary: true, content: true, seoKeywords: true } });
  if (!a) return;
  await prisma.$executeRaw`UPDATE "Article" SET "searchText" = ${searchTextFor(a)} WHERE id = ${id}`;
}

/** Startup back-fill: articles never indexed (new column, or written by hand). */
export async function ensureSearchText(prisma: PrismaClient) {
  let n = 0;
  for (;;) {
    const rows = await prisma.article.findMany({ where: { searchText: null }, select: { id: true, title: true, summary: true, content: true, seoKeywords: true }, take: 200 });
    if (!rows.length) break;
    for (const a of rows) { await prisma.$executeRaw`UPDATE "Article" SET "searchText" = ${searchTextFor(a)} WHERE id = ${a.id}`; n++; }
  }
  if (n) console.log(`search: ${n} article(s) indexed`);
}

type Hit = Prisma.ArticleGetPayload<{ include: { author: { select: { id: true; name: true; slug: true; jobTitle: true; photoUrl: true } }; category: true; _count: { select: { comments: { where: { status: 'APPROVED' } } } } } }>;

function rank(rows: Hit[], stems: string[], phrase: string) {
  const scored = rows.map((a) => {
    const t = normalizeAr(a.title), s = normalizeAr(a.summary || '');
    let score = 0;
    for (const st of stems) score += t.includes(st) ? 5 : s.includes(st) ? 2 : 1;
    if (stems.length > 1 && stems.every((st) => t.includes(st))) score += 3;
    if (phrase.includes(' ') && t.includes(phrase)) score += 4;
    return { a, score };
  });
  scored.sort((x, y) => y.score - x.score || +new Date(y.a.publishedAt || 0) - +new Date(x.a.publishedAt || 0));
  return scored.map((x) => x.a);
}

/* ── «هل تقصد…» vocabulary: distinct headline/keyword words, refreshed every 10 minutes ── */
let vocab: { at: number; words: Map<string, string> } | null = null;
async function vocabulary(prisma: PrismaClient) {
  if (vocab && Date.now() - vocab.at < 10 * 60_000) return vocab.words;
  const rows = await prisma.article.findMany({ where: { status: 'PUBLISHED' }, select: { title: true, seoKeywords: true }, orderBy: { publishedAt: 'desc' }, take: 3000 });
  const words = new Map<string, string>();
  for (const r of rows) {
    for (const raw of `${r.title} ${(r.seoKeywords || []).join(' ')}`.split(/\s+/)) {
      const clean = raw.replace(/[^\p{L}\p{N}]+/gu, '');
      const n = normalizeAr(clean);
      if (n.length >= 3 && !words.has(n)) words.set(n, clean);
    }
  }
  vocab = { at: Date.now(), words };
  return words;
}

/** Levenshtein distance, stopping early above `max`. */
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

async function suggest(prisma: PrismaClient, q: string): Promise<string | null> {
  const words = await vocabulary(prisma);
  const parts = normalizeAr(q).split(' ').filter(Boolean);
  let changed = false;
  const out = parts.map((w) => {
    if (w.length < 4 || words.has(w)) return words.get(w) || w;
    const max = w.length >= 6 ? 2 : 1;
    let best: { d: number; word: string } | null = null;
    for (const [n, orig] of words) {
      const d = distance(w, n, max);
      if (d <= max && (!best || d < best.d)) best = { d, word: orig };
    }
    if (best) { changed = true; return best.word; }
    return w;
  });
  return changed ? out.join(' ') : null;
}

export interface SearchOpts { take: number; where: Prisma.ArticleWhereInput; include: Prisma.ArticleInclude }

/** Ranked search; `suggest` only when nothing matched and the suggestion itself finds articles. */
export async function searchArticles(prisma: PrismaClient, q: string, opts: SearchOpts): Promise<{ data: Hit[]; suggest?: string }> {
  const stems = queryStems(q);
  if (!stems.length) return { data: [] };
  const run = async (st: string[]) => (await prisma.article.findMany({
    where: { ...opts.where, AND: st.map((s) => ({ searchText: { contains: s } })) },
    include: opts.include,
    orderBy: { publishedAt: 'desc' },
    take: 300,
  })) as unknown as Hit[];
  const rows = await run(stems);
  if (rows.length) return { data: rank(rows, stems, normalizeAr(q)).slice(0, opts.take) };
  const alt = await suggest(prisma, q);
  if (alt) {
    const altStems = queryStems(alt);
    if (altStems.length && (await run(altStems)).length) return { data: [], suggest: alt };
  }
  return { data: [] };
}
