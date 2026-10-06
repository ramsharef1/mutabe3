/* المتابع — service worker (D-043 Stage 5).
 *
 * Offline reading: every page a reader opens (articles, homepage, sections) is
 * kept on the device, together with the public JSON those pages load, so it
 * opens again without a connection. A page that was never opened falls back to
 * /offline, which lists what is saved. The network always wins when it answers:
 * cached copies are only used when the connection fails.
 *
 * Never touched: the dashboard, login, newsletter pages, admin/auth/newsletter APIs, any non-GET
 * request, other sites (AdSense, image hosts) and range requests (media).
 * Bump VERSION to drop every cache on the next visit.
 */
const VERSION = 'v1';
const SHELL = `m3-shell-${VERSION}`; // offline page + the assets it needs (never trimmed)
const STATIC = `m3-static-${VERSION}`; // hashed Next assets and fonts
const PAGES = `m3-pages-${VERSION}`; // HTML of pages the reader opened
const API = `m3-api-${VERSION}`; // public JSON (article lists, categories, homepage)
const IMAGES = `m3-img-${VERSION}`; // uploaded article photos
const KEEP = [SHELL, STATIC, PAGES, API, IMAGES];
const LIMIT = { [STATIC]: 300, [PAGES]: 60, [API]: 80, [IMAGES]: 150 };
const OFFLINE = '/offline';
const SKIP = /^\/(dashboard|auth|newsletter|api\/(admin|auth|newsletter))(\/|$)/; // newsletter: unsubscribe links carry a personal token

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const shell = await caches.open(SHELL);
      const res = await fetch(OFFLINE, { cache: 'reload' });
      if (res.ok) {
        const html = await res.clone().text();
        await shell.put(OFFLINE, res);
        // The offline page's own CSS/JS chunks, so it renders and lists saved articles with no network.
        const assets = new Set(html.match(/\/_next\/static\/[^"'\s)<>\\]+/g) || []);
        ['/logo.svg', '/brand/icon-192.png'].forEach((u) => assets.add(u));
        await Promise.all([...assets].map((u) => shell.add(u).catch(() => {})));
      }
    } catch {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('m3-') && !KEEP.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function put(name, key, res) {
  try {
    const c = await caches.open(name);
    await c.put(key, res);
    const max = LIMIT[name];
    if (max) {
      const keys = await c.keys();
      for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]); // oldest first
    }
  } catch {}
}

const fromCache = async (name, key) => (await caches.open(name)).match(key);

/** Pages: network first; keep a copy of every good answer; offline → saved copy → /offline. */
async function page(event, key) {
  try {
    const res = await fetch(event.request);
    if (res.ok && res.type === 'basic') event.waitUntil(put(PAGES, key, res.clone()));
    if (res.status >= 502) return (await fromCache(PAGES, key)) || res; // server restarting mid-deploy
    return res;
  } catch {
    return (await fromCache(PAGES, key)) || (await fromCache(SHELL, OFFLINE)) ||
      new Response('<h1 dir="rtl">لا يوجد اتصال بالإنترنت</h1>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

/** Public JSON: network first, saved copy when offline. */
async function networkFirst(event, name, key) {
  try {
    const res = await fetch(event.request);
    if (res.ok && res.type === 'basic') event.waitUntil(put(name, key, res.clone()));
    return res;
  } catch {
    const hit = await fromCache(name, key);
    if (hit) return hit;
    throw new Error('offline');
  }
}

/** Content-hashed files never change: answer from the device when we have them. */
async function cacheFirst(event, name, key) {
  const hit = (await fromCache(name, key)) || (await fromCache(SHELL, key));
  if (hit) return hit;
  const res = await fetch(event.request);
  if (res.ok && res.type === 'basic') event.waitUntil(put(name, key, res.clone()));
  return res;
}

/** Logo/icons may be replaced under the same name: answer fast, refresh in the background. */
async function staleWhileRevalidate(event, name, key) {
  const hit = (await fromCache(name, key)) || (await fromCache(SHELL, key));
  const net = fetch(event.request).then((res) => {
    if (res.ok && res.type === 'basic') return put(name, key, res.clone()).then(() => res);
    return res;
  });
  if (hit) { event.waitUntil(net.catch(() => {})); return hit; }
  return net;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || SKIP.test(url.pathname) || url.pathname === '/sw.js') return;
  const key = url.origin + url.pathname + url.search;

  if (url.pathname.startsWith('/_next/static/')) return event.respondWith(cacheFirst(event, STATIC, key));
  if (url.pathname.startsWith('/api/uploads/')) return event.respondWith(cacheFirst(event, IMAGES, key));
  if (url.pathname.startsWith('/api/')) return event.respondWith(networkFirst(event, API, key));
  if (req.mode === 'navigate') return event.respondWith(page(event, key));
  if (/\.(svg|png|ico|webp|jpg)$/.test(url.pathname)) return event.respondWith(staleWhileRevalidate(event, STATIC, key));
  // everything else (RSC payloads, feeds, manifest, sitemaps) goes straight to the network
});
