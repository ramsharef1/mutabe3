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
  // A Person with a profile page links it (Google uses author.url to tell same-name writers apart, D-067).
  const author = isHtml(a.content) && a.author?.name
    ? { '@type': 'Person', name: a.author.name, ...(a.author.slug && a.author.jobTitle ? { url: authorUrl(a.author.slug) } : {}) }
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

/** Absolute URL of an author page; the Arabic slug is percent-encoded once. */
export const authorUrl = (slug: string) => `${SITE_URL}/author/${encodeURIComponent(slug)}`;

/** Author page: ProfilePage whose mainEntity is the Person (D-067, CONTENT-ARCHITECTURE "Columnist + author page"). */
export function profileLd(p: { name: string; slug: string; jobTitle?: string | null; bio?: string | null; photoUrl?: string | null }) {
  const url = authorUrl(p.slug);
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': url,
    url,
    inLanguage: 'ar',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'Person',
      '@id': `${url}#person`,
      name: p.name,
      url,
      ...(p.jobTitle ? { jobTitle: p.jobTitle } : {}),
      ...(p.bio ? { description: p.bio } : {}),
      ...(p.photoUrl ? { image: absUrl(p.photoUrl) } : {}),
      worksFor: { '@id': `${SITE_URL}/#publisher` },
    },
  };
}

/** Category, tag and other list pages (CONTENT-ARCHITECTURE: CollectionPage). `url` is site-relative. */
export function collectionLd(c: { name: string; description?: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}${c.url}`,
    url: `${SITE_URL}${c.url}`,
    name: c.name,
    ...(c.description ? { description: c.description } : {}),
    inLanguage: 'ar',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#publisher` },
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
