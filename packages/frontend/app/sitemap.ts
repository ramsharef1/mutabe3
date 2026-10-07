import type { MetadataRoute } from 'next';
import { fetchArticles, fetchAuthors, API_BASE, SITE_URL } from './lib/api';
import { authorUrl } from './lib/seo';
import { NAV } from './components/util';

// Built per request from the published list and the DB categories (D-043 Stages 2–3).
export const dynamic = 'force-dynamic';

async function categorySlugs(): Promise<string[]> {
  try {
    const r = await fetch(`${API_BASE}/api/categories`, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const slugs = ((await r.json()).data || []).map((c: { slug: string }) => c.slug);
    return slugs.length ? slugs : NAV.map((n) => n.slug);
  } catch {
    return NAV.map((n) => n.slug);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, cats, authors] = await Promise.all([fetchArticles({ take: '100' }), categorySlugs(), fetchAuthors(undefined, 30)]);
  // Informational and legal pages (D-053) — stable URLs, low churn.
  const statics = ['about', 'contact', 'advertise', 'privacy', 'terms', 'corrections', 'editorial-policy'];
  return [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    ...cats.map((slug) => ({ url: `${SITE_URL}/category/${slug}`, changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...statics.map((p) => ({ url: `${SITE_URL}/${p}`, changeFrequency: 'monthly' as const, priority: 0.3 })),
    // author pages (D-067): only staff with a published piece are listed by the API
    ...authors.map((a) => ({ url: authorUrl(a.slug), lastModified: a.latest?.publishedAt, changeFrequency: 'weekly' as const, priority: 0.4 })),
    ...articles.map((a) => ({
      url: `${SITE_URL}/article/${a.id}`,
      lastModified: a.updatedAt || a.publishedAt,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
