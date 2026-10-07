// Server-side access to the backend API (used by server components, metadata,
// sitemap and feeds). In production the Next server and the Express API share a
// host, so we talk to the API directly instead of going through nginx. The same
// env var drives the dev-only /api proxy.
import type { Article } from '../components/util';

export const API_BASE = process.env.VPS_API || 'http://127.0.0.1:9080';
export const SITE_URL = 'https://mutabe3.news';

/** Absolute URL for a stored image path (uploads are served relative: /api/uploads/…). */
export const absUrl = (u?: string | null) => (!u ? '' : /^https?:\/\//.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`);

/** One published article by id or slug, or null (unpublished / missing / API down). */
export async function fetchArticle(idOrSlug: string): Promise<Article | null> {
  // Route params for Arabic slugs may arrive still percent-encoded; normalise before re-encoding once.
  let key = idOrSlug;
  try { key = decodeURIComponent(idOrSlug); } catch {}
  try {
    const r = await fetch(`${API_BASE}/api/articles/${encodeURIComponent(key)}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as Article;
  } catch {
    return null;
  }
}

/** Published list; `params` are passed straight to GET /api/articles (q, take, category).
 *  `revalidate` (seconds) opts into the Next data cache for metadata lookups; default is uncached. */
export async function fetchArticles(params: Record<string, string> = {}, revalidate?: number): Promise<Article[]> {
  try {
    const u = new URL(`${API_BASE}/api/articles`);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u, revalidate ? { next: { revalidate } } : { cache: 'no-store' });
    if (!r.ok) return [];
    return ((await r.json()).data || []) as Article[];
  } catch {
    return [];
  }
}

export interface Category { id: string; name: string; slug: string; description?: string | null; showInNav?: boolean }

/** Categories as managed in /dashboard/categories (name, description, nav flag); [] when the API is down. Cached one minute. */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const r = await fetch(`${API_BASE}/api/categories`, { next: { revalidate: 60 } });
    if (!r.ok) return [];
    return ((await r.json()).data || []) as Category[];
  } catch {
    return [];
  }
}

/** A public author (D-067): staff with at least one published article. */
export interface AuthorCard {
  id: string; name: string; slug: string; jobTitle?: string | null; photoUrl?: string | null; bio?: string | null; count: number;
  latest: (Pick<Article, 'id' | 'slug' | 'title' | 'summary' | 'featuredImageUrl' | 'publishedAt' | 'kind' | 'category'>) | null;
}
export interface AuthorPage extends Omit<AuthorCard, 'latest'> { page: number; pages: number; articles: Article[] }

/** Authors with a published piece, newest piece first (`kind=OPINION` for the «كتاب المتابع» band); [] when none or the API is down. */
export async function fetchAuthors(kind?: 'OPINION', take = 8): Promise<AuthorCard[]> {
  try {
    const u = new URL(`${API_BASE}/api/authors`);
    if (kind) u.searchParams.set('kind', kind);
    u.searchParams.set('take', String(take));
    const r = await fetch(u, { next: { revalidate: 60 } });
    if (!r.ok) return [];
    return ((await r.json()).data || []) as AuthorCard[];
  } catch {
    return [];
  }
}

/** One author page by slug (Arabic slugs may arrive percent-encoded), or null → 404. Throws when the API is down. */
export async function fetchAuthor(slug: string, page = 1): Promise<AuthorPage | null> {
  let key = slug;
  try { key = decodeURIComponent(slug); } catch {}
  const r = await fetch(`${API_BASE}/api/authors/${encodeURIComponent(key)}?page=${page}`, { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`authors ${r.status}`);
  return ((await r.json()).data || null) as AuthorPage | null;
}
