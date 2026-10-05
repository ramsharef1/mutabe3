import type { MetadataRoute } from 'next';
import { fetchArticles, API_BASE, SITE_URL } from './lib/api';
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
  const [articles, cats] = await Promise.all([fetchArticles({ take: '100' }), categorySlugs()]);
  return [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    ...cats.map((slug) => ({ url: `${SITE_URL}/category/${slug}`, changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...articles.map((a) => ({
      url: `${SITE_URL}/article/${a.id}`,
      lastModified: a.updatedAt || a.publishedAt,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
