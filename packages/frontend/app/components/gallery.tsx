'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ico } from './site';

export interface Shot { src: string; thumb: string; cap: string }

export function Lightbox({ shots, index, onClose, onIndex }: { shots: Shot[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const n = shots.length;
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // RTL: the right arrow moves to the previous shot
      else if (e.key === 'ArrowRight') go(-1);
      else if (e.key === 'ArrowLeft') go(1);
    };
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [go, onClose]);
  const s = shots[index];
  return (
    <div className="lb" onClick={onClose} role="dialog" aria-modal aria-label="معرض الصور">
      <button type="button" className="lb-x" onClick={onClose} aria-label="إغلاق">×</button>
      <span className="lb-n">{index + 1} / {n}</span>
      <button type="button" className="lb-prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="السابق">{Ico.chev}</button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img key={s.src} src={s.src} alt={s.cap} />
        <figcaption>{s.cap}</figcaption>
      </figure>
      <button type="button" className="lb-next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="التالي">{Ico.chev}</button>
      <div className="lb-strip" onClick={(e) => e.stopPropagation()}>
        {shots.map((t, i) => (
          <button type="button" key={t.src} className={i === index ? 'on' : ''} onClick={() => onIndex(i)}><img src={t.thumb} alt="" /></button>
        ))}
      </div>
    </div>
  );
}

/** Thumbnail grid inside the article body; opens the lightbox. */
export function GalleryGrid({ shots, onOpen }: { shots: Shot[]; onOpen: (i: number) => void }) {
  return (
    <div className="gal">
      <div className="gal-hd"><b>صور من الخبر</b><span>{shots.length} صور</span></div>
      <div className="gal-grid">
        {shots.map((s, i) => (
          <button type="button" key={s.src} onClick={() => onOpen(i)} title={s.cap}>
            <img src={s.thumb} alt={s.cap} loading="lazy" />
            {i === shots.length - 1 && <span className="gal-all">عرض الكل</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useLightbox() {
  const [idx, setIdx] = useState<number | null>(null);
  return { idx, open: (i: number) => setIdx(i), close: () => setIdx(null), set: setIdx };
}
