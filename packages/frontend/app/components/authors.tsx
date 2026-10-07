// Real authors (D-067): faces, the «كتاب المتابع» band from published opinion pieces, and links to
// /author/<slug>. Used by the homepage (server), the article byline (client) and the author page.
import { Img } from './site';
import { ago } from './util';
import type { AuthorCard } from '../lib/api';

export const authorHref = (slug: string) => `/author/${encodeURIComponent(slug)}`;

/** The uploaded photo, or the first letter of the name — never a stock portrait (CONTENT-ARCHITECTURE). */
export function AuthorFace({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  return photoUrl ? <Img src={photoUrl} alt={name} /> : <span className="au-init" aria-hidden>{name.trim()[0]}</span>;
}

/** Up to 8 writers, each with their newest opinion piece; renders nothing when the desk has none yet. */
export function WritersBand({ authors, className = 'writers desk' }: { authors: AuthorCard[]; className?: string }) {
  const list = authors.filter((a) => a.latest).slice(0, 8);
  if (!list.length) return null;
  return (
    <div className={`${className} real`}>
      {list.map((a) => (
        <a key={a.id} className="writer" href={`/article/${encodeURIComponent(a.latest!.slug || a.latest!.id)}`}>
          <div className="ph"><AuthorFace name={a.name} photoUrl={a.photoUrl} /></div>
          <div className="t">
            <span className="name">{a.name}</span>
            {a.latest!.title}
            <small className="tm">{ago(a.latest!.publishedAt)}</small>
          </div>
        </a>
      ))}
    </div>
  );
}
