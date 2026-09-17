'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Article, Img, useArticles, Loading, SiteHeader, SiteFooter, Sidebar, CAT_LABELS, CAT_DESC, Crumbs, Chip, ago, Ico, AdBanner, catColor } from '../../components/site';
import { tagsFor, topTags } from '../../components/content';

const PAGES = 5;
const PER = 12;

const Pager = ({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) => (
  <div className="pager">
    <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)} className="nav">السابق</button>
    {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
      <button type="button" key={p} className={p === page ? 'on' : ''} onClick={() => onPage(p)}>{p}</button>
    ))}
    <button type="button" disabled={page === pages} onClick={() => onPage(page + 1)} className="nav">التالي</button>
  </div>
);

/** One page of list items. Unfiltered placeholder lists cycle to simulate volume; filtered lists show real items only. */
const Rows = ({ list, page, cycle }: { list: Article[]; page: number; cycle: boolean }) => (
  <>
    {(cycle
      ? Array.from({ length: PER }, (_, i) => list[(i + (page - 1) * PER) % list.length])
      : list.slice((page - 1) * PER, page * PER)
    ).map((a, i) => (
      <a key={`${page}-${a.id}-${i}`} className="ci" href={`/article/${a.id}`}>
        <div className="th"><Img src={a.featuredImageUrl} /></div>
        <div className="t">
          <span className="ttl">{a.title}</span>
          <span className="ex">{(a.summary || a.content).slice(0, 110)}…</span>
          <span className="tm">{Ico.clock}{ago(a.publishedAt)}<em>·</em>{Ico.eye}{a.viewsCount ?? 0}</span>
        </div>
      </a>
    ))}
  </>
);

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { articles, loading } = useArticles();
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [sub, setSub] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'pager' | 'scroll'>('pager');
  const [loaded, setLoaded] = useState(1);
  const [busy, setBusy] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => { try { if (localStorage.getItem('catmode') === 'scroll') setMode('scroll'); } catch {} }, []);

  // Infinite mode: append the next page when the sentinel scrolls into view (with a short delay so the spinner is visible).
  useEffect(() => {
    if (mode !== 'scroll' || loaded >= PAGES || !sentinel.current) return;
    // (upper bound PAGES; the filtered `pages` value is enforced by the button handler)
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting && !busy) {
        setBusy(true);
        setTimeout(() => { setLoaded((l) => Math.min(pages, l + 1)); setBusy(false); }, 500);
      }
    }, { rootMargin: '300px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [mode, loaded, busy]);

  if (loading || articles.length === 0) return <Loading />;

  const label = CAT_LABELS[slug] || articles.find((a) => a.category?.slug === slug)?.category?.name || slug;
  let base = articles.filter((a) => a.category?.slug === slug);
  if (base.length < 6) base = articles;
  const subs = topTags(base, 6);
  let list = sub ? base.filter((a) => tagsFor(a).includes(sub)) : base;
  if (sort === 'top') list = [...list].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));

  const feat = list[0];
  const subCards = list.slice(1, 3);
  const bullets = list.slice(3, 8);
  const cycle = !sub;
  const rest = cycle ? list : list.slice(8);
  const pages = cycle ? PAGES : Math.max(1, Math.ceil(rest.length / PER));
  const link = (id: string) => `/article/${id}`;
  const total = cycle ? list.length * PAGES : list.length;
  const go = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const setModeP = (m: 'pager' | 'scroll') => { setMode(m); setLoaded(1); try { localStorage.setItem('catmode', m); } catch {} };
  const pickSub = (t: string | null) => { setSub(t); setPage(1); setLoaded(1); };

  return (
    <div className="am">
      <SiteHeader articles={articles} />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <Crumbs items={sub ? [{ label, href: `/category/${slug}` }, { label: sub }] : [{ label }]} />

            <div className="cathead" style={{ borderColor: catColor(slug) }}>
              <div>
                <h1>{label}</h1>
                <p>{CAT_DESC[slug] || `آخر أخبار ${label} على موقع المتابع الاخباري`}</p>
              </div>
              <div className="catnum"><b>{total}</b><small>خبر</small></div>
            </div>

            {subs.length > 0 && (
              <div className="subcats">
                <button type="button" className={sub ? '' : 'on'} onClick={() => pickSub(null)}>الكل</button>
                {subs.map((t) => <button type="button" key={t} className={sub === t ? 'on' : ''} onClick={() => pickSub(t)}>{t}</button>)}
              </div>
            )}

            {list.length === 0 ? (
              <div className="empty">
                <b>لا توجد أخبار ضمن «{sub}» حالياً</b>
                <p>جرّب تصنيفاً آخر أو <button type="button" onClick={() => pickSub(null)}>اعرض كل أخبار {label}</button></p>
              </div>
            ) : (
              <>
                <div className="catfeat2">
                  <a className="lead" href={link(feat.id)}>
                    <div className="im"><Img src={feat.featuredImageUrl} /></div>
                    <div className="cap"><Chip a={feat} /><h2>{feat.title}</h2><p>{feat.summary || feat.content}</p><span className="tm">{Ico.clock}{ago(feat.publishedAt)}</span></div>
                  </a>
                  {subCards.length > 0 && (
                    <div className="subs">
                      {subCards.map((a) => (
                        <a key={a.id} className="card" href={link(a.id)}>
                          <div className="im"><Img src={a.featuredImageUrl} /></div>
                          <div className="t">{a.title}</div>
                          <span className="tm">{ago(a.publishedAt)}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {bullets.length > 0 && <ul className="arr cols2">{bullets.map((a, k) => <li key={`${a.id}-${k}`}><a href={link(a.id)}>{a.title}</a></li>)}</ul>}

                <AdBanner variant={1} className="adrow ad90" />

                {rest.length > 0 && <>
                <div className="cathd">
                  <b><i />المزيد في {sub || label}</b>
                  <div className="sort">
                    <button type="button" className={sort === 'new' ? 'on' : ''} onClick={() => { setSort('new'); setPage(1); }}>الأحدث</button>
                    <button type="button" className={sort === 'top' ? 'on' : ''} onClick={() => { setSort('top'); setPage(1); }}>الأكثر قراءة</button>
                  </div>
                </div>

                <div className="catlist">
                  {mode === 'pager'
                    ? <Rows list={rest} page={page} cycle={cycle} />
                    : Array.from({ length: loaded }, (_, i) => <Rows key={i} list={rest} page={i + 1} cycle={cycle} />)}
                </div>

                {mode === 'scroll' && (
                  <div className="loadmore" ref={sentinel}>
                    {loaded < pages
                      ? <button type="button" className={busy ? 'busy' : ''} onClick={() => setLoaded((l) => Math.min(pages, l + 1))}>{busy ? <><i />جاري التحميل…</> : 'عرض المزيد'}</button>
                      : <span className="end">وصلت إلى نهاية أخبار {sub || label}</span>}
                  </div>
                )}

                <div className="cathd bottom">
                  <div className="modes">
                    <span className="pginfo">{mode === 'pager' ? `صفحة ${page} من ${pages}` : `${loaded} من ${pages} صفحات`}</span>
                    <span className="sw">
                      <button type="button" className={mode === 'pager' ? 'on' : ''} onClick={() => setModeP('pager')}>ترقيم الصفحات</button>
                      <button type="button" className={mode === 'scroll' ? 'on' : ''} onClick={() => setModeP('scroll')}>تحميل تلقائي</button>
                    </span>
                  </div>
                  {mode === 'pager' && pages > 1 && <Pager page={page} pages={pages} onPage={go} />}
                </div>
                </>}
              </>
            )}
          </div>

          <Sidebar articles={articles} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
