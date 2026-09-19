import { Article } from '../util';
import { tagsFor } from '../content';

// Al Jazeera-style curated topic carousel: the most-covered subjects across the
// whole corpus, surfaced as a scannable row. Editorial discovery, not per-article
// trending — each topic links to its /tag page so readers can go deep on a story.
export function TrendingTopics({ articles }: { articles: Article[] }) {
  const counts = new Map<string, number>();
  articles.forEach((a) => tagsFor(a).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const topics = Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .sort((p, q) => q[1] - p[1])
    .slice(0, 12);
  if (topics.length < 3) return null;

  return (
    <nav className="topics" aria-label="المواضيع الأكثر تداولاً">
      <div className="label"><span className="pulse" />الأكثر تداولاً</div>
      <div className="strip">
        {topics.map(([t, n], i) => (
          <a key={t} className="topic" href={`/tag/${encodeURIComponent(t)}`}>
            <span className="rank">{i + 1}</span>
            <span className="name">{t}</span>
            <span className="count">{n}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
