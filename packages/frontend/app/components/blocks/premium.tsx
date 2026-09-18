import { Article } from '../util';
import { Img, Chip } from '../site';
import { ago } from '../util';

export function PremiumSpotlight({ items }: { items: Article[] }) {
  if (!items.length) return null;
  return (
    <div className="sec prem">
      <div className="label">المحررون يختارون</div>
      <div className="cards">
        {items.slice(0, 3).map((a) => (
          <a key={a.id} className="card" href={`/article/${a.id}`}>
            <div className="im"><Img src={a.featuredImageUrl} /><Chip a={a} /></div>
            <div className="t">{a.title}</div>
            <span className="tm">{ago(a.publishedAt)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
