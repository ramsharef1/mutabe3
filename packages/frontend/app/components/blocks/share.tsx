import { Article } from '../util';

// Pure server component (no 'use client'): WhatsApp/X/Facebook share are plain
// URL links, so cards stay zero-JS. Shares the article's own canonical prod URL
// so a shared link resolves for the recipient — not the current (maybe local) page.
const ICON = {
  wa: 'M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.7.5-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.7-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3z',
  x: 'M17.5 3h3.2l-7 8 8.3 10h-6.5l-5-6.6L4.6 21H1.4l7.5-8.6L1 3h6.6l4.6 6.1L17.5 3zm-1.1 16.1h1.8L6.7 4.8H4.8l11.6 14.3z',
  fb: 'M14 8h3V4h-3c-2.8 0-4.5 1.7-4.5 4.5V11H7v4h2.5v7h4v-7H17l.5-4h-4V9c0-.6.3-1 .5-1z',
};
const Svg = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d={d} /></svg>
);

export function CardShare({ a }: { a: Article }) {
  const url = `https://mutabe3.news/article/${a.id}`;
  const e = encodeURIComponent;
  const t = a.title;
  return (
    <div className="cardshare">
      <a className="wa" href={`https://wa.me/?text=${e(`${t} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="مشاركة عبر واتساب"><Svg d={ICON.wa} /></a>
      <a className="x" href={`https://twitter.com/intent/tweet?url=${e(url)}&text=${e(t)}`} target="_blank" rel="noopener noreferrer" aria-label="مشاركة عبر X"><Svg d={ICON.x} /></a>
      <a className="fb" href={`https://www.facebook.com/sharer/sharer.php?u=${e(url)}`} target="_blank" rel="noopener noreferrer" aria-label="مشاركة عبر فيسبوك"><Svg d={ICON.fb} /></a>
    </div>
  );
}
