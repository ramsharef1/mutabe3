'use client';

import { useState } from 'react';

export interface VideoItem { id: string; title: string; href?: string }

// Placeholder playlist, shown only while the demo switch is on and the desk has no VIDEO articles (D-068).
export const DEMO_VIDEOS: VideoItem[] = [
  { id: 'LXb3EKWsInQ', title: 'جولة مصورة: معالم الأردن السياحية بتقنية 4K' },
  { id: 'aqz-KE-bpKQ', title: 'المتابع يرافق فرق الإنقاذ في تدريب ميداني' },
  { id: 'eRsGyueVLvQ', title: 'حوار خاص: مستقبل الإعلام الرقمي في المملكة' },
  { id: '1La4QzGeaaQ', title: 'تقرير: مشاريع الطاقة المتجددة في الجنوب' },
  { id: 'YE7VzlLtp-4', title: 'لقطات من افتتاح معرض عمّان الدولي للكتاب' },
  { id: 'M7lc1UVf-VE', title: 'ورشة تدريبية لصحفيي المتابع حول التحقق من الأخبار' },
  { id: 'ScMzIvxBSi4', title: 'المتابع في الميدان: يوم مع مزارعي الأغوار' },
];

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const poster = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** Big player + up to three thumbnails on each side; works with 1–7 items (real VIDEO articles or the demo list). */
export function VideoSection({ items = DEMO_VIDEOS }: { items?: VideoItem[] }) {
  const VIDEOS = items.slice(0, 7);
  const rest = VIDEOS.map((_, i) => i).slice(1);
  const left = rest.slice(0, Math.ceil(rest.length / 2)), right = rest.slice(Math.ceil(rest.length / 2));
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  const cur = VIDEOS[active];
  const pick = (i: number) => {
    setActive(i);
    setStarted(true);
  };
  const side = (idx: number[]) => (
    <div className="col">
      {idx.map((i) => (
        <button key={VIDEOS[i].id} type="button" className={`th ${i === active ? 'on' : ''}`} onClick={() => pick(i)} title={VIDEOS[i].title}>
          <img src={thumb(VIDEOS[i].id)} alt="" loading="lazy" />
          {i === active ? <span className="now"><i />يعرض الآن</span> : <span className="pl">▶</span>}
          <span className="vt">{VIDEOS[i].title}</span>
        </button>
      ))}
    </div>
  );
  return (
    <div className={`video n${VIDEOS.length}`}>
      {left.length > 0 && side(left)}
      <div className="big">
        {started ? (
          <iframe
            key={cur.id}
            src={`https://www.youtube-nocookie.com/embed/${cur.id}?rel=0&modestbranding=1&hl=ar&autoplay=1`}
            title={cur.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          /* B10: click-to-load facade — the YouTube player (~500KB) is only fetched on demand */
          <button type="button" className="facade" onClick={() => setStarted(true)} aria-label={`تشغيل: ${cur.title}`}>
            <img src={poster(cur.id)} alt="" loading="lazy" />
            <span className="pl2">▶</span>
          </button>
        )}
        <div className="cap">{cur.href ? <a href={cur.href}>{cur.title}</a> : cur.title}</div>
      </div>
      {right.length > 0 && side(right)}
    </div>
  );
}
