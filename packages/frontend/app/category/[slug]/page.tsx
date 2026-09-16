'use client';

import { useParams } from 'next/navigation';
import { Img, useArticles, Loading, SiteHeader, SiteFooter, Sidebar, CAT_LABELS } from '../../components/site';

const Pager = () => (
  <div className="pager">
    {['الأولى', '1', '2', '3', '4', '5', 'التالي', 'الأخيرة'].map((p) => <span key={p} className={p === '1' ? 'on' : ''}>{p}</span>)}
  </div>
);

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { articles, loading } = useArticles();
  if (loading || articles.length === 0) return <Loading />;

  const label = CAT_LABELS[slug] || articles.find((a) => a.category?.slug === slug)?.category?.name || slug;
  let list = articles.filter((a) => a.category?.slug === slug);
  if (list.length < 6) list = articles;

  const feat = list[0];
  const bullets = list.slice(1, 9);
  const grid = Array.from({ length: 20 }, (_, i) => list[i % list.length]);
  const link = (id: string) => `/article/${id}`;

  return (
    <div className="am">
      <SiteHeader />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <div className="catbar">{label}</div>

            <div className="catfeat">
              <div className="list">
                <a className="redhl" href={link(feat.id)}>{feat.title}</a>
                <ul className="arr">{bullets.map((a, k) => <li key={`${a.id}-${k}`}><a href={link(a.id)}>{a.title}</a></li>)}</ul>
              </div>
              <a className="img" href={link(feat.id)}><Img src={feat.featuredImageUrl} /></a>
            </div>

            <div className="cathd"><b><i />المزيد ايضا في {label}</b><Pager /></div>

            <div className="catlist">
              {grid.map((a, i) => (
                <a key={`${a.id}-${i}`} className="ci" href={link(a.id)}>
                  <div className="th"><Img src={a.featuredImageUrl} /></div>
                  <div className="t">{a.title}</div>
                </a>
              ))}
            </div>

            <div className="cathd bottom"><span /><Pager /></div>
          </div>

          <Sidebar articles={articles} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
