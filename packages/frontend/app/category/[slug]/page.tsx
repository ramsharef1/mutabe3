'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Img, useArticles, Loading, SiteHeader, SiteFooter, Sidebar, CAT_LABELS, CAT_DESC, Crumbs, Chip, ago, Ico, AdBanner, catColor } from '../../components/site';

const PAGES = 5;

const Pager = ({ page, onPage }: { page: number; onPage: (p: number) => void }) => (
  <div className="pager">
    <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)} className="nav">السابق</button>
    {Array.from({ length: PAGES }, (_, i) => i + 1).map((p) => (
      <button type="button" key={p} className={p === page ? 'on' : ''} onClick={() => onPage(p)}>{p}</button>
    ))}
    <button type="button" disabled={page === PAGES} onClick={() => onPage(page + 1)} className="nav">التالي</button>
  </div>
);

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { articles, loading } = useArticles();
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [page, setPage] = useState(1);
  if (loading || articles.length === 0) return <Loading />;

  const label = CAT_LABELS[slug] || articles.find((a) => a.category?.slug === slug)?.category?.name || slug;
  let list = articles.filter((a) => a.category?.slug === slug);
  if (list.length < 6) list = articles;
  if (sort === 'top') list = [...list].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));

  const feat = list[0];
  const sub = list.slice(1, 3);
  const bullets = list.slice(3, 8);
  const grid = Array.from({ length: 12 }, (_, i) => list[(i + (page - 1) * 12) % list.length]);
  const link = (id: string) => `/article/${id}`;
  const total = list.length * PAGES;
  const go = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="am">
      <SiteHeader />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <Crumbs items={[{ label }]} />

            <div className="cathead" style={{ borderColor: catColor(slug) }}>
              <div>
                <h1>{label}</h1>
                <p>{CAT_DESC[slug] || `آخر أخبار ${label} على موقع المتابع الاخباري`}</p>
              </div>
              <div className="catnum"><b>{total}</b><small>خبر</small></div>
            </div>

            <div className="catfeat2">
              <a className="lead" href={link(feat.id)}>
                <div className="im"><Img src={feat.featuredImageUrl} /></div>
                <div className="cap"><Chip a={feat} /><h2>{feat.title}</h2><p>{feat.summary || feat.content}</p><span className="tm">{Ico.clock}{ago(feat.publishedAt)}</span></div>
              </a>
              <div className="subs">
                {sub.map((a) => (
                  <a key={a.id} className="card" href={link(a.id)}>
                    <div className="im"><Img src={a.featuredImageUrl} /></div>
                    <div className="t">{a.title}</div>
                    <span className="tm">{ago(a.publishedAt)}</span>
                  </a>
                ))}
              </div>
            </div>

            <ul className="arr cols2">{bullets.map((a, k) => <li key={`${a.id}-${k}`}><a href={link(a.id)}>{a.title}</a></li>)}</ul>

            <AdBanner variant={1} className="adrow ad90" />

            <div className="cathd">
              <b><i />المزيد في {label}</b>
              <div className="sort">
                <button type="button" className={sort === 'new' ? 'on' : ''} onClick={() => { setSort('new'); setPage(1); }}>الأحدث</button>
                <button type="button" className={sort === 'top' ? 'on' : ''} onClick={() => { setSort('top'); setPage(1); }}>الأكثر قراءة</button>
              </div>
            </div>

            <div className="catlist">
              {grid.map((a, i) => (
                <a key={`${a.id}-${i}`} className="ci" href={link(a.id)}>
                  <div className="th"><Img src={a.featuredImageUrl} /></div>
                  <div className="t">
                    <span className="ttl">{a.title}</span>
                    <span className="ex">{(a.summary || a.content).slice(0, 110)}…</span>
                    <span className="tm">{Ico.clock}{ago(a.publishedAt)}<em>·</em>{Ico.eye}{a.viewsCount ?? 0}</span>
                  </div>
                </a>
              ))}
            </div>

            <div className="cathd bottom"><span className="pginfo">صفحة {page} من {PAGES}</span><Pager page={page} onPage={go} /></div>
          </div>

          <Sidebar articles={articles} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
