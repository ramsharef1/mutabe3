'use client';

import { useParams } from 'next/navigation';
import { Img, useArticles, Loading, SiteHeader, SiteFooter, Sidebar, Crumbs, Chip, ago, Ico } from '../../components/site';
import { tagsFor } from '../../components/content';

export default function TagPage() {
  const params = useParams<{ tag: string }>();
  const tag = decodeURIComponent(params.tag || '');
  const { articles, loading } = useArticles();
  if (loading || articles.length === 0) return <Loading />;

  const list = articles.filter((a) => tagsFor(a).includes(tag));
  // Tags that co-occur with this one, for the "related tags" row.
  const near = new Map<string, number>();
  list.forEach((a) => tagsFor(a).forEach((t) => { if (t !== tag) near.set(t, (near.get(t) || 0) + 1); }));
  const nearTags = Array.from(near.entries()).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([t]) => t);

  return (
    <div className="am">
      <SiteHeader articles={articles} />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <Crumbs items={[{ label: 'كلمات مفتاحية' }, { label: tag }]} />
            <div className="cathead taghead">
              <div>
                <small>كلمة مفتاحية</small>
                <h1>#{tag}</h1>
                <p>كل ما نشره المتابع حول «{tag}»</p>
              </div>
              <div className="catnum"><b>{list.length}</b><small>خبر</small></div>
            </div>

            {nearTags.length > 0 && (
              <div className="tags" style={{ marginTop: 0 }}>
                <span>كلمات ذات صلة:</span>
                {nearTags.map((t) => <a key={t} href={`/tag/${encodeURIComponent(t)}`}>{t}</a>)}
              </div>
            )}

            {list.length === 0 ? (
              <div className="empty"><b>لا توجد أخبار تحمل هذه الكلمة المفتاحية</b><p><a href="/">العودة إلى الرئيسية</a></p></div>
            ) : (
              <div className="catlist">
                {list.map((a) => (
                  <a key={a.id} className="ci" href={`/article/${a.id}`}>
                    <div className="th"><Img src={a.featuredImageUrl} /><Chip a={a} /></div>
                    <div className="t">
                      <span className="ttl">{a.title}</span>
                      <span className="ex">{(a.summary || a.content).slice(0, 110)}…</span>
                      <span className="tm">{Ico.clock}{ago(a.publishedAt)}<em>·</em>{Ico.eye}{a.viewsCount ?? 0}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
          <Sidebar articles={articles} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
