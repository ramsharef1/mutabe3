import type { Metadata } from 'next';
import { fetchArticles, SITE_URL } from '../../lib/api';
import { tagsFor } from '../../components/content';
import { collectionLd, breadcrumbLd, SITE_NAME } from '../../lib/seo';
import JsonLd from '../../components/JsonLd';
import TagView from './TagView';

// Server shell for a keyword page (F-05b): own <title>/description/canonical and CollectionPage
// JSON-LD; thin topics (fewer than 3 articles) carry noindex (CONTENT-ARCHITECTURE). The list
// stays in the client TagView.
export const dynamic = 'force-dynamic';

type Props = { params: { tag: string } };

/** Route params for Arabic tags may arrive still percent-encoded; normalise whitespace and bound the length. */
function tagOf(raw: string) {
  let t = raw || '';
  try { t = decodeURIComponent(t); } catch {}
  return t.replace(/\s+/g, ' ').trim().slice(0, 60);
}

async function countFor(tag: string) {
  const list = await fetchArticles({ take: '100' }, 60);
  return list.filter((a) => tagsFor(a).includes(tag)).length;
}

const describe = (tag: string) => `كل ما نشره المتابع حول «${tag}»`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tag = tagOf(params.tag);
  if (!tag) return { title: 'كلمة مفتاحية غير موجودة | المتابع', robots: { index: false } };
  const n = await countFor(tag);
  const url = `/tag/${encodeURIComponent(tag)}`;
  return {
    title: `#${tag} | المتابع`,
    description: describe(tag),
    alternates: { canonical: url },
    ...(n >= 3 ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', url, title: `#${tag}`, description: describe(tag), siteName: SITE_NAME, locale: 'ar_JO' },
    twitter: { card: 'summary_large_image', title: `#${tag}`, description: describe(tag) },
  };
}

export default function TagPage({ params }: Props) {
  const tag = tagOf(params.tag);
  const url = `/tag/${encodeURIComponent(tag)}`;
  return (
    <>
      {tag && <JsonLd data={[collectionLd({ name: `#${tag}`, description: describe(tag), url }), breadcrumbLd([{ name: 'الرئيسية', url: SITE_URL }, { name: 'كلمات مفتاحية' }, { name: tag }])]} />}
      <TagView />
    </>
  );
}
