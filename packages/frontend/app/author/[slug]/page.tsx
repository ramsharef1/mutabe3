import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchAuthor, fetchArticles, absUrl, SITE_URL, type AuthorPage } from '../../lib/api';
import { profileLd, breadcrumbLd, SITE_NAME } from '../../lib/seo';
import JsonLd from '../../components/JsonLd';
import { Img, SiteHeader, SiteFooter, Sidebar, Crumbs, Chip } from '../../components/site';
// plain helpers from util: functions re-exported through the 'use client' site module can't be called on the server
import { ago, excerpt } from '../../components/util';
import { AuthorFace, authorHref } from '../../components/authors';

// Author / columnist page (D-067, CONTENT-ARCHITECTURE "Columnist + author page"): profile from the
// staff account (photo or monogram, job title, bio) and every published piece, 24 per page.
// Server-rendered so the title, canonical and ProfilePage + Person JSON-LD are in the HTML.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ page?: string }> };
const pageOf = (sp?: { page?: string }) => Math.min(Math.max(Number(sp?.page) || 1, 1), 500);

async function load(slug: string, page: number): Promise<AuthorPage | null | 'down'> {
  try { return await fetchAuthor(slug, page); } catch { return 'down'; }
}

const describe = (a: AuthorPage) =>
  (a.bio && a.bio.replace(/\s+/g, ' ').slice(0, 155)) || `مقالات ${a.name}${a.jobTitle ? `، ${a.jobTitle}` : ''} على ${SITE_NAME}`;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const a = await load(params.slug, pageOf(searchParams));
  if (a === 'down') return { title: 'المتابع' };
  if (!a) return { title: 'الكاتب غير موجود | المتابع', robots: { index: false } };
  const url = authorHref(a.slug) + (a.page > 1 ? `?page=${a.page}` : '');
  const title = `${a.name}${a.page > 1 ? ` — صفحة ${a.page}` : ''} | المتابع`;
  return {
    title,
    description: describe(a),
    alternates: { canonical: url },
    openGraph: { type: 'profile', url, title: a.name, description: describe(a), siteName: SITE_NAME, locale: 'ar_JO', ...(a.photoUrl ? { images: [absUrl(a.photoUrl)] } : {}) },
    twitter: { card: 'summary', title: a.name, description: describe(a) },
  };
}

export default async function AuthorPageView(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const page = pageOf(searchParams);
  const [a, side] = await Promise.all([load(params.slug, page), fetchArticles({}, 60)]);
  if (a === 'down') {
    return <div className="am"><SiteHeader /><div className="wrap loading">تعذّر تحميل صفحة الكاتب — حاول بعد قليل.</div><SiteFooter /></div>;
  }
  if (!a || (page > 1 && !a.articles.length)) notFound();
  const href = authorHref(a.slug);
  return (
    <div className="am">
      <JsonLd data={[profileLd(a), breadcrumbLd([{ name: 'الرئيسية', url: SITE_URL }, { name: 'كتاب المتابع', url: `${SITE_URL}/category/writers` }, { name: a.name }])]} />
      <SiteHeader articles={side} />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <Crumbs items={[{ label: 'كتاب المتابع', href: '/category/writers' }, { label: a.name }]} />

            <header className="authorhead">
              <div className="face"><AuthorFace name={a.name} photoUrl={a.photoUrl} /></div>
              <div className="who">
                <h1>{a.name}</h1>
                {a.jobTitle && <p className="role">{a.jobTitle}</p>}
                {a.bio && <p className="bio">{a.bio}</p>}
              </div>
              <div className="catnum"><b>{a.count}</b><small>{a.count === 1 ? 'مقال' : 'مقالاً'}</small></div>
            </header>

            <div className="cathd"><b><i />مقالات {a.name}</b></div>
            <div className="catlist">
              {a.articles.map((x) => (
                <a key={x.id} className="ci" href={`/article/${encodeURIComponent(x.slug || x.id)}`}>
                  <div className="th"><Img src={x.featuredImageUrl} alt="" />{x.category && <Chip a={x} />}</div>
                  <div className="t">
                    <span className="ttl">{x.title}</span>
                    <span className="ex">{excerpt({ summary: x.summary, content: '' })}</span>
                    <span className="tm">{ago(x.publishedAt)}</span>
                  </div>
                </a>
              ))}
            </div>

            {a.pages > 1 && (
              <nav className="pager" aria-label="صفحات مقالات الكاتب">
                {Array.from({ length: a.pages }, (_, i) => i + 1).map((p) =>
                  p === a.page
                    ? <span key={p} className="on" aria-current="page">{p}</span>
                    : <a key={p} href={p === 1 ? href : `${href}?page=${p}`}>{p}</a>)}
              </nav>
            )}
          </div>
          <Sidebar articles={side} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
