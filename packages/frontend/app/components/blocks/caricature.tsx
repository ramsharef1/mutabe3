// «كاريكاتير المتابع» (D-068): the newest CARICATURE article large, up to three earlier ones beside it.
// The drawing is the article's cover image, shown whole (object-fit: contain), never cropped.
import { Img } from '../site';
import type { Article } from '../util';

const href = (a: Article) => `/article/${encodeURIComponent(a.slug || a.id)}`;

export function CaricatureBand({ items }: { items: Article[] }) {
  const list = items.filter((a) => a.featuredImageUrl);
  if (!list.length) return null;
  const [main, ...rest] = list;
  return (
    <div className={`caric-band${rest.length ? '' : ' one'}`}>
      <a className="cb-main" href={href(main)}>
        <div className="im"><Img src={main.featuredImageUrl} alt={main.coverCaption || main.title} /></div>
        <b>{main.title}</b>
      </a>
      {rest.length > 0 && (
        <div className="cb-side">
          {rest.slice(0, 3).map((a) => (
            <a key={a.id} href={href(a)}>
              <div className="im"><Img src={a.featuredImageUrl} alt={a.coverCaption || a.title} /></div>
              <b>{a.title}</b>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
