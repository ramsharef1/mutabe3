import { Article } from '../util';
import { Img, Chip } from '../site';
import { ago } from '../util';

export function MostDiscussed({ items }: { items: Article[] }) {
  if (!items.length) return null;
  return (
    <div className="sec disc">
      <div className="hd">الأكثر نقاشاً</div>
      <div className="smalls">
        {items.slice(0, 6).map((a) => (
          <a key={a.id} className="sm" href={`/article/${a.id}`}>
            <div className="th"><Img src={a.featuredImageUrl} /></div>
            <div className="t">
              {a.title}
              <span className="tm">{ago(a.publishedAt)}</span>
            </div>
            <div className="comm">💬 {Math.floor(Math.random() * 50) + 5}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
