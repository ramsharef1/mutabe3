'use client';

import { useState } from 'react';

// Placeholder playlist — replace ids/titles with the agency's own YouTube videos.
export const VIDEOS: { id: string; title: string }[] = [
  { id: 'LXb3EKWsInQ', title: 'جولة مصورة: معالم الأردن السياحية بتقنية 4K' },
  { id: 'aqz-KE-bpKQ', title: 'المتابع يرافق فرق الإنقاذ في تدريب ميداني' },
  { id: 'eRsGyueVLvQ', title: 'حوار خاص: مستقبل الإعلام الرقمي في المملكة' },
  { id: '1La4QzGeaaQ', title: 'تقرير: مشاريع الطاقة المتجددة في الجنوب' },
  { id: 'YE7VzlLtp-4', title: 'لقطات من افتتاح معرض عمّان الدولي للكتاب' },
  { id: 'M7lc1UVf-VE', title: 'ورشة تدريبية لصحفيي المتابع حول التحقق من الأخبار' },
  { id: 'ScMzIvxBSi4', title: 'المتابع في الميدان: يوم مع مزارعي الأغوار' },
];

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export function VideoSection() {
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
    <div className="video">
      {side([1, 2, 3])}
      <div className="big">
        <iframe
          key={`${cur.id}-${started ? 1 : 0}`}
          src={`https://www.youtube.com/embed/${cur.id}?rel=0&modestbranding=1&hl=ar${started ? '&autoplay=1' : ''}`}
          title={cur.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <div className="cap">{cur.title}</div>
      </div>
      {side([4, 5, 6])}
    </div>
  );
}
