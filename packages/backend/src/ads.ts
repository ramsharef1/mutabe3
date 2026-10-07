import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { uploadRel, UPLOAD_URL } from './uploads';

// Ad placements live in SiteSetting["ads"] (D-043 Stage 5). The site has four
// zones; each one is off, the built-in demo creatives, the owner's own banners
// ("house" ads sold directly) or a Google AdSense unit. Nothing here is secret,
// so the public endpoint returns the whole object. Until an admin saves, every
// zone stays on "demo" so a deploy changes nothing on the page.
export const ADS_KEY = 'ads';
export const ZONES = ['header', 'inline', 'article', 'sidebar'] as const;
export const MODES = ['off', 'demo', 'house', 'adsense'] as const;
export const MAX_BANNERS = 6;

export type Zone = (typeof ZONES)[number];
export type Mode = (typeof MODES)[number];
// w/h (and mw/mh for the mobile image) are the pixel sizes measured at upload, so
// the page can reserve the banner's space before the image arrives.
// id/label/startAt/endAt (D-057): a stable id for delivery counts, the advertiser or campaign name,
// and an optional schedule — the public endpoint serves a banner only while it is active.
export interface HouseBanner {
  id: string; label?: string; startAt?: string; endAt?: string;
  image: string; mobileImage?: string; href: string; alt: string; w?: number; h?: number; mw?: number; mh?: number;
}
export interface ZoneSetting { mode: Mode; unit: string; banners: HouseBanner[] }
export interface AdsSetting {
  adsense: { client: string; auto: boolean };
  zones: Record<Zone, ZoneSetting>;
  adsTxt: string;
  updatedAt?: string;
}

const emptyZone = (): ZoneSetting => ({ mode: 'demo', unit: '', banners: [] });
export const defaultAds = (): AdsSetting => ({
  adsense: { client: '', auto: false },
  zones: { header: emptyZone(), inline: emptyZone(), article: emptyZone(), sidebar: emptyZone() },
  adsTxt: '',
});

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const px = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 && n <= 5000 ? n : undefined; };
const ID_RE = /^[A-Za-z0-9_-]{4,32}$/;
// RegExp.test() coerces undefined to the string "undefined" (which matches ID_RE), hence the type check.
const isId = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v) && v !== 'undefined' && v !== 'null';
export const newBannerId = () => crypto.randomBytes(6).toString('base64url');
const iso = (v: unknown): string | undefined => { const s = str(v, 40); if (!s) return undefined; const t = new Date(s).getTime(); return Number.isNaN(t) ? undefined : new Date(t).toISOString(); };
/** Active now = no schedule, or startAt ≤ now < endAt (either bound optional). */
export const isActiveNow = (b: { startAt?: string; endAt?: string }, now = new Date()) =>
  (!b.startAt || new Date(b.startAt) <= now) && (!b.endAt || now < new Date(b.endAt));
const withMeta = (b: any, base: Omit<HouseBanner, 'id'>): HouseBanner => ({
  id: isId(b?.id) ? b.id : newBannerId(),
  ...(str(b?.label, 80) ? { label: str(b?.label, 80) } : {}),
  ...(iso(b?.startAt) ? { startAt: iso(b?.startAt) } : {}),
  ...(iso(b?.endAt) ? { endAt: iso(b?.endAt) } : {}),
  ...base,
});
// SECURITY S-15 (D-064). Creatives must be files uploaded to this site: a remote image could track readers
// through a third-party pixel or be swapped after the campaign was approved. An absolute URL on our own
// origin is reduced to its path; anything else (other hosts, traversal, the cache dir) is refused.
const OWN_HOSTS = new Set(['mutabe3.news', 'www.mutabe3.news']);
export function localImage(v: unknown): string | null {
  let s = String(v ?? '').trim();
  if (!s || s.length > 500) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    let u: URL;
    try { u = new URL(s); } catch { return null; }
    if (u.protocol !== 'https:' || !OWN_HOSTS.has(u.hostname) || u.username || u.password || u.port) return null;
    s = u.pathname;
  }
  if (!s.startsWith(`${UPLOAD_URL}/`) || s.includes('?') || s.includes('#')) return null;
  const rel = uploadRel(s);
  return rel ? `${UPLOAD_URL}/${rel}` : null;
}

// Click-through and breaking-news links: an internal path (one leading slash — `//host` and `/\host` are
// other origins to a browser), or https with a real host name — no credentials, no IP literal, no odd port.
export function safeHref(v: unknown): string | null {
  const s = String(v ?? '').trim();
  // eslint-disable-next-line no-control-regex -- control characters are exactly what must not pass
  if (!s || s.length > 500 || /[\s"'<>\\\u0000-\u001f\u007f]/.test(s)) return null;
  if (s.startsWith('/')) return s.startsWith('//') ? null : s;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
  const h = u.hostname; // already normalised by URL: 0x7f.1 → 127.0.0.1, [::1] → [::1]
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith('[') || h.includes(':') || !h.includes('.') || h.endsWith('.')) return null;
  return s;
}

const CLIENT = /^ca-pub-\d{10,20}$/;
const UNIT = /^\d{4,20}$/;

/** Stored value → complete setting (unknown keys dropped, missing ones defaulted). */
function normalize(v: any): AdsSetting {
  const d = defaultAds();
  if (!v || typeof v !== 'object') return d;
  d.adsense.client = CLIENT.test(v.adsense?.client) ? v.adsense.client : '';
  d.adsense.auto = !!v.adsense?.auto;
  for (const z of ZONES) {
    const s = v.zones?.[z];
    if (!s) continue;
    d.zones[z] = {
      mode: MODES.includes(s.mode) ? s.mode : 'demo',
      unit: UNIT.test(s.unit) ? s.unit : '',
      // Stored banners are re-checked on every read (D-064): one saved before the S-15 rules, or written to the
      // database by hand, is never served with a remote image or an unsafe link.
      banners: Array.isArray(s.banners)
        ? s.banners
            .filter((b: any) => b && localImage(b.image) && safeHref(b.href))
            .slice(0, MAX_BANNERS)
            .map((b: any) => {
              const mobileImage = localImage(b.mobileImage);
              const w = px(b.w), h = px(b.h), mw = px(b.mw), mh = px(b.mh);
              return withMeta(b, {
                image: localImage(b.image) as string, href: safeHref(b.href) as string, alt: str(b.alt, 120),
                ...(w && h ? { w, h } : {}),
                ...(mobileImage ? { mobileImage, ...(mw && mh ? { mw, mh } : {}) } : {}),
              });
            })
        : [],
    };
  }
  d.adsTxt = typeof v.adsTxt === 'string' ? v.adsTxt : '';
  if (v.updatedAt) d.updatedAt = String(v.updatedAt);
  return d;
}

/** Stored settings. `activeOnly` (public endpoint) drops banners outside their schedule; the dashboard sees all. */
export async function readAds(prisma: PrismaClient, opts: { activeOnly?: boolean } = {}): Promise<AdsSetting> {
  const row = await prisma.siteSetting.findUnique({ where: { key: ADS_KEY } });
  const s = normalize(row?.value);
  // Banners saved before D-057 have no id: persist the ids normalize() just generated so counts stay attached to one banner.
  const raw: any = row?.value;
  if (raw && ZONES.some((z) => (raw?.zones?.[z]?.banners || []).some((b: any) => !isId(b?.id)))) await writeAds(prisma, s);
  if (opts.activeOnly) {
    const now = new Date();
    for (const z of ZONES) s.zones[z].banners = s.zones[z].banners.filter((b) => isActiveNow(b, now));
  }
  return s;
}

/**
 * Validate a dashboard submission. Returns the clean setting or an Arabic error
 * naming the zone, so the editor knows which card to fix.
 */
export function parseAds(body: any): { ok: true; value: AdsSetting } | { ok: false; error: string } {
  const out = defaultAds();
  // A body without `zones` would silently reset every zone to demo; the dashboard always sends the full object.
  if (!body || typeof body !== 'object' || !body.zones || typeof body.zones !== 'object') return { ok: false, error: 'إعدادات الإعلانات غير مكتملة — أعد تحميل الصفحة وحاول مجدداً.' };
  const client = str(body?.adsense?.client, 40);
  if (client && !CLIENT.test(client)) return { ok: false, error: 'معرّف الناشر في AdSense يكون بالشكل ca-pub-1234567890123456' };
  out.adsense = { client, auto: !!body?.adsense?.auto };
  if (out.adsense.auto && !client) return { ok: false, error: 'أدخل معرّف الناشر قبل تفعيل الإعلانات التلقائية.' };

  const LABEL: Record<Zone, string> = { header: 'إعلان الترويسة', inline: 'إعلانات بين الأقسام', article: 'إعلان داخل المقال', sidebar: 'إعلانات العمود الجانبي' };
  for (const z of ZONES) {
    const s = body?.zones?.[z] || {};
    const mode = MODES.includes(s.mode) ? (s.mode as Mode) : 'demo';
    const unit = str(s.unit, 20);
    if (mode === 'adsense') {
      if (!client) return { ok: false, error: `${LABEL[z]}: أدخل معرّف الناشر في AdSense أولاً.` };
      if (!UNIT.test(unit)) return { ok: false, error: `${LABEL[z]}: رقم الوحدة الإعلانية (data-ad-slot) أرقام فقط.` };
    }
    const raw = Array.isArray(s.banners) ? s.banners : [];
    if (raw.length > MAX_BANNERS) return { ok: false, error: `${LABEL[z]}: حتى ${MAX_BANNERS} بانرات.` };
    const banners: HouseBanner[] = [];
    for (const b of raw) {
      const image = localImage(b?.image);
      const mobileRaw = str(b?.mobileImage, 500);
      const mobileImage = mobileRaw ? localImage(mobileRaw) : null;
      const href = safeHref(b?.href);
      if (!image) return { ok: false, error: `${LABEL[z]}: ارفع صورة البانر إلى الموقع — لا تُقبل صور من مواقع أخرى.` };
      if (mobileRaw && !mobileImage) return { ok: false, error: `${LABEL[z]}: صورة الموبايل يجب أن تُرفع إلى الموقع.` };
      if (!href) return { ok: false, error: `${LABEL[z]}: رابط البانر يجب أن يبدأ بـ https:// (اسم نطاق، بلا عنوان IP أو بيانات دخول) أو أن يكون مساراً داخلياً يبدأ بـ /` };
      const w = px(b?.w), h = px(b?.h), mw = px(b?.mw), mh = px(b?.mh);
      const startAt = iso(b?.startAt), endAt = iso(b?.endAt);
      if (startAt && endAt && new Date(endAt) <= new Date(startAt)) return { ok: false, error: `${LABEL[z]}: تاريخ انتهاء البانر قبل تاريخ بدايته.` };
      banners.push(withMeta(b, {
        image, href, alt: str(b?.alt, 120),
        ...(w && h ? { w, h } : {}),
        ...(mobileImage ? { mobileImage, ...(mw && mh ? { mw, mh } : {}) } : {}),
      }));
    }
    if (mode === 'house' && !banners.length) return { ok: false, error: `${LABEL[z]}: أضف بانراً واحداً على الأقل أو اختر وضعاً آخر.` };
    out.zones[z] = { mode, unit: mode === 'adsense' ? unit : UNIT.test(unit) ? unit : '', banners };
  }

  // ads.txt extras (other ad networks). Plain text, one record per line.
  // eslint-disable-next-line no-control-regex -- stripping control characters from pasted text is the point here
  const lines = String(body?.adsTxt ?? '').replace(/\r/g, '').split('\n').map((l) => l.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, 300));
  if (lines.length > 100) return { ok: false, error: 'ads.txt: حتى 100 سطر.' };
  out.adsTxt = lines.join('\n').trim();
  return { ok: true, value: out };
}

export async function writeAds(prisma: PrismaClient, s: AdsSetting): Promise<AdsSetting> {
  const value = { ...s, updatedAt: new Date().toISOString() };
  const json = value as unknown as Prisma.InputJsonObject;
  await prisma.siteSetting.upsert({ where: { key: ADS_KEY }, update: { value: json }, create: { key: ADS_KEY, value: json } });
  return value;
}

/* ───────────────────────────── delivery counts (D-057) ─────────────────────────────
 * The page beacons one `view` per banner per page view (viewable: ≥50% for 1 s) and one `click`
 * per click. Events are aggregated in memory and flushed to AdStatDaily by the scheduler tick,
 * so a burst of readers costs one upsert per banner per minute, not one write per event. */
export type AdEventType = 'view' | 'click';
export interface AdEvent { zone: Zone; bannerId: string; type: AdEventType }
const pending = new Map<string, { day: string; zone: Zone; bannerId: string; impressions: number; clicks: number }>();
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** Validate and queue a batch of events from one request (at most 20; unknown zones/ids dropped). */
export function recordAdEvents(raw: unknown): number {
  const events = Array.isArray((raw as any)?.events) ? (raw as any).events.slice(0, 20) : [];
  let n = 0;
  for (const e of events) {
    const zone = e?.zone, bannerId = e?.bannerId, type = e?.type;
    if (!ZONES.includes(zone) || !isId(bannerId) || (type !== 'view' && type !== 'click')) continue;
    const day = dayKey();
    const k = `${day}|${zone}|${bannerId}`;
    const row = pending.get(k) || { day, zone, bannerId, impressions: 0, clicks: 0 };
    if (type === 'view') row.impressions++; else row.clicks++;
    pending.set(k, row);
    n++;
  }
  return n;
}

/** Write queued counts to the daily table. Called by the scheduler every minute. */
export async function flushAdStats(prisma: PrismaClient) {
  if (!pending.size) return 0;
  const rows = [...pending.values()];
  pending.clear();
  for (const r of rows) {
    const day = new Date(`${r.day}T00:00:00.000Z`);
    await prisma.adStatDaily.upsert({
      where: { day_zone_bannerId: { day, zone: r.zone, bannerId: r.bannerId } },
      update: { impressions: { increment: r.impressions }, clicks: { increment: r.clicks } },
      create: { day, zone: r.zone, bannerId: r.bannerId, impressions: r.impressions, clicks: r.clicks },
    });
  }
  return rows.length;
}

/** Last `days` days of counts per banner, joined with the banner's current label/zone for the dashboard and the CSV. */
export async function adStats(prisma: PrismaClient, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60_000); since.setUTCHours(0, 0, 0, 0);
  const rows = await prisma.adStatDaily.findMany({ where: { day: { gte: since } }, orderBy: [{ day: 'asc' }] });
  const settings = await readAds(prisma);
  const meta = new Map<string, { zone: Zone; label: string; alt: string; startAt?: string; endAt?: string; active: boolean }>();
  for (const z of ZONES) for (const b of settings.zones[z].banners) meta.set(b.id, { zone: z, label: b.label || '', alt: b.alt, startAt: b.startAt, endAt: b.endAt, active: isActiveNow(b) });
  const totals = new Map<string, { bannerId: string; zone: string; label: string; impressions: number; clicks: number; days: number }>();
  for (const r of rows) {
    const t = totals.get(r.bannerId) || { bannerId: r.bannerId, zone: r.zone, label: meta.get(r.bannerId)?.label || meta.get(r.bannerId)?.alt || '', impressions: 0, clicks: 0, days: 0 };
    t.impressions += r.impressions; t.clicks += r.clicks; t.days++;
    totals.set(r.bannerId, t);
  }
  return {
    since: since.toISOString().slice(0, 10), days,
    daily: rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), zone: r.zone, bannerId: r.bannerId, impressions: r.impressions, clicks: r.clicks })),
    totals: [...totals.values()].map((t) => ({ ...t, ctr: t.impressions ? +(100 * t.clicks / t.impressions).toFixed(2) : 0, ...(meta.get(t.bannerId) || {}) })),
  };
}
