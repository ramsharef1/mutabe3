import { Article } from '../util';
import { Img } from '../site';
import { ago } from '../util';

export function TrendingNow({ items }: { items: Article[] }) {
  if (!items.length) return null;
  return (
    <div className="sec trend">
      <div className="label">الآن الساخن</div>
      <div className="strip">
        {items.slice(0, 5).map((a, i) => (
          <a key={a.id} className="item" href={`/article/${a.id}`}>
            <div className="rank">#{i + 1}</div>
            <div className="th"><Img src={a.featuredImageUrl} /></div>
            <div className="content">
              <div className="t">{a.title}</div>
              <div className="meta">
                <span className="time">{ago(a.publishedAt)}</span>
                <span className="views">👁 {Math.floor(Math.random() * 5000) + 500}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
