import { Article } from '../util';
import { Img, Chip } from '../site';
import { ago } from '../util';

export function PremiumSpotlight({ items }: { items: Article[] }) {
  if (!items.length) return null;
  return (
    <div className="sec prem">
      <div className="label">اختيارات المحرر</div>
      <div className="cards">
        {items.slice(0, 3).map((a, i) => (
          <a key={a.id} className="card" href={`/article/${a.id}`}>
            {/* the first card is the largest image above the fold on phones: load it eagerly, high priority (D-070) */}
            <div className="im"><Img src={a.featuredImageUrl} priority={i === 0} /><Chip a={a} /></div>
            <div className="t">{a.title}</div>
            <span className="tm">{ago(a.publishedAt)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
