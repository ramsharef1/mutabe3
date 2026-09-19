'use client';

import { useEffect, useState } from 'react';
import { Article, ago, readMins } from '../util';
import { relatedByTag } from '../content';
import { Img, Chip, SecHd } from '../site';
import { CardShare } from './share';

// Client-only, no backend: reads the reader's local view history and ranks
// related articles by how often they relate to recently-read ones. Renders
// nothing for first-time visitors (empty history) so there's no dead section.
export function ForYou({ articles }: { articles: Article[] }) {
  const [recs, setRecs] = useState<Article[]>([]);

  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem('seen') || '[]') as string[];
      if (!seen.length) return;
      const seenSet = new Set(seen);
      const byId = new Map(articles.map((a) => [a.id, a] as const));
      const score = new Map<string, number>();
      seen.slice(0, 5).forEach((sid) => {
        const src = byId.get(sid);
        if (!src) return;
        relatedByTag(src, articles).slice(0, 8).forEach((r, i) => {
          if (seenSet.has(r.id)) return; // don't re-recommend what they've read
          score.set(r.id, (score.get(r.id) || 0) + (8 - i));
        });
      });
      const ranked = Array.from(score.entries())
        .sort((p, q) => q[1] - p[1])
        .map(([rid]) => byId.get(rid))
        .filter((x): x is Article => !!x);
      setRecs(ranked.slice(0, 4));
    } catch {}
  }, [articles]);

  if (!recs.length) return null;
  return (
    <div className="sec foryou">
      <SecHd t="مختارة لك" meta="بناءً على ما تصفّحت" />
      <div className="cards">
        {recs.map((a) => (
          <div key={a.id} className="cardwrap">
            <a className="card" href={`/article/${a.id}`}>
              <div className="im"><Img src={a.featuredImageUrl} /><Chip a={a} /></div>
              <div className="t">{a.title}</div>
              <span className="tm">{ago(a.publishedAt)} · <span className="readtime">⏱ {readMins(a.content)} دقايق</span></span>
            </a>
            <CardShare a={a} />
          </div>
        ))}
      </div>
    </div>
  );
}
