// schema.org structured data for Google (Top stories, article rich results,
// breadcrumbs, publisher knowledge panel) — D-043 Stage 5. Server-only helpers.
import type { Article } from '../components/util';
import { isHtml, plain } from '../components/util';
import { SITE_URL, absUrl } from './api';

export const SITE_NAME = 'موقع المتابع الاخباري';
const LOGO = { '@type': 'ImageObject', url: `${SITE_URL}/brand/logo@2x.png`, width: 1320, height: 523 };
const DEFAULT_IMAGE = `${SITE_URL}/opengraph-image.png`;

export const publisher = {
  '@type': 'NewsMediaOrganization',
  '@id': `${SITE_URL}/#publisher`,
  name: SITE_NAME,
  alternateName: 'المتابع',
  url: SITE_URL,
  logo: LOGO,
};

/** Seeded demo photos are 500×350 picsum crops; the article page already shows the 1200×800 version. */
export const articleImage = (a: Article) => absUrl(a.featuredImageUrl?.replace('/500/350', '/1200/800')) || DEFAULT_IMAGE;

export function newsArticleLd(a: Article) {
  const url = `${SITE_URL}/article/${a.id}`;
  // CMS articles carry their real author; the seeded demo set is credited to the newsroom.
  const author = isHtml(a.content) && a.author?.name
    ? { '@type': 'Person', name: a.author.name }
    : { '@type': 'Organization', name: SITE_NAME, url: SITE_URL };
  const body = plain(a.content);
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: a.title.length > 110 ? `${a.title.slice(0, 109)}…` : a.title,
    description: a.summary || (body.length > 160 ? `${body.slice(0, 159)}…` : body),
    // ImageObject carries the credit/caption when the desk set them (Google image-licensing metadata); plain URL otherwise.
    image: a.coverCredit || a.coverCaption
      ? [{ '@type': 'ImageObject', url: articleImage(a), ...(a.coverCredit ? { creditText: a.coverCredit } : {}), ...(a.coverCaption ? { caption: a.coverCaption } : {}) }]
      : [articleImage(a)],
    datePublished: a.publishedAt,
    dateModified: a.updatedAt || a.publishedAt,
    author: [author],
    publisher,
    ...(a.category ? { articleSection: a.category.name } : {}),
    ...(a.seoKeywords?.length ? { keywords: a.seoKeywords.join('، ') } : {}),
    wordCount: body ? body.split(/\s+/).length : undefined,
    inLanguage: 'ar',
    isAccessibleForFree: true,
  };
}

export function breadcrumbLd(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, ...(it.url ? { item: it.url } : {}) })),
  };
}

export const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    { ...publisher },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, alternateName: 'المتابع', url: SITE_URL, inLanguage: 'ar', publisher: { '@id': `${SITE_URL}/#publisher` } },
  ],
});

/** Text for XML elements and attributes (sitemaps). */
export const xmlEsc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));

/** JSON for a <script type="application/ld+json">. `<` is escaped so a headline can never close the tag. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
