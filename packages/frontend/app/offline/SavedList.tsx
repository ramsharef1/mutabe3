'use client';

import { useEffect, useState } from 'react';

interface Saved { href: string; title: string }

// Lists the pages the service worker kept (cache "m3-pages-*"): articles first,
// then the homepage and sections. Titles come from each saved page's <title>.
export default function SavedList() {
  const [items, setItems] = useState<Saved[] | null>(null);

  useEffect(() => {
    (async () => {
      const out: Saved[] = [];
      try {
        const names = (await caches.keys()).filter((k) => k.startsWith('m3-pages-'));
        const seen = new Set<string>();
        for (const n of names) {
          const c = await caches.open(n);
          for (const req of [...(await c.keys())].reverse()) { // newest first
            const u = new URL(req.url);
            if (u.origin !== location.origin || seen.has(u.pathname) || u.pathname === '/offline') continue;
            seen.add(u.pathname);
            const html = (await (await c.match(req))?.text()) || '';
            const raw = /<title>([^<]*)<\/title>/.exec(html)?.[1] || '';
            const title = new DOMParser().parseFromString(raw, 'text/html').documentElement.textContent?.replace(/\s*\|\s*المتابع\s*$/, '').trim();
            out.push({ href: u.pathname + u.search, title: u.pathname === '/' ? 'الصفحة الرئيسية' : title || u.pathname });
          }
        }
      } catch {}
      const art = (s: Saved) => (s.href.startsWith('/article/') ? 0 : 1);
      setItems(out.sort((a, b) => art(a) - art(b)));
    })();
  }, []);

  if (items === null) return <p className="muted">جاري البحث عن المقالات المحفوظة…</p>;
  return (
    <>
      {items.length ? (
        <ul className="saved">{items.map((s) => <li key={s.href}><a href={s.href}>{s.title}</a></li>)}</ul>
      ) : (
        <p className="muted">لا توجد مقالات محفوظة بعد. كل مقال تفتحه وأنت متصل يُحفظ تلقائياً لتقرأه لاحقاً بدون إنترنت.</p>
      )}
      <button type="button" className="retry" onClick={() => location.reload()}>إعادة المحاولة</button>
    </>
  );
}
