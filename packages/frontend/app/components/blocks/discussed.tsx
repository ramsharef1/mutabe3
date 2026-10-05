import { Article } from '../util';
import { Img, Chip } from '../site';
import { ago } from '../util';

// Ranked by approved reader comments (D-043 Stage 4); hidden until there is real discussion.
export function MostDiscussed({ items }: { items: Article[] }) {
  const ranked = items.filter((a) => (a._count?.comments || 0) > 0).sort((a, b) => (b._count?.comments || 0) - (a._count?.comments || 0));
  if (!ranked.length) return null;
  return (
    <div className="sec disc">
      <div className="hd">الأكثر نقاشاً</div>
      <div className="smalls">
        {ranked.slice(0, 6).map((a) => (
          <a key={a.id} className="sm" href={`/article/${a.id}#comments`}>
            <div className="th"><Img src={a.featuredImageUrl} /></div>
            <div className="t">
              {a.title}
              <span className="tm">{ago(a.publishedAt)}</span>
            </div>
            <div className="comm" aria-label={`${a._count?.comments} تعليقاً`}>💬 {a._count?.comments}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
