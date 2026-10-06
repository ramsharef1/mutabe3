import { PrismaClient, Prisma } from '@prisma/client';

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
export interface HouseBanner { image: string; mobileImage?: string; href: string; alt: string; w?: number; h?: number; mw?: number; mh?: number }
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
const IMAGE = /^(\/api\/uploads\/[\w./-]+|https:\/\/[^\s"'<>]+)$/;
const HREF = /^(https?:\/\/|\/)[^\s"'<>]*$/;
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
      banners: Array.isArray(s.banners) ? s.banners.filter((b: any) => b && IMAGE.test(b.image) && HREF.test(b.href)).slice(0, MAX_BANNERS) : [],
    };
  }
  d.adsTxt = typeof v.adsTxt === 'string' ? v.adsTxt : '';
  if (v.updatedAt) d.updatedAt = String(v.updatedAt);
  return d;
}

export async function readAds(prisma: PrismaClient): Promise<AdsSetting> {
  const row = await prisma.siteSetting.findUnique({ where: { key: ADS_KEY } });
  return normalize(row?.value);
}

/**
 * Validate a dashboard submission. Returns the clean setting or an Arabic error
 * naming the zone, so the editor knows which card to fix.
 */
export function parseAds(body: any): { ok: true; value: AdsSetting } | { ok: false; error: string } {
  const out = defaultAds();
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
      const image = str(b?.image, 500);
      const mobileImage = str(b?.mobileImage, 500);
      const href = str(b?.href, 500);
      if (!IMAGE.test(image)) return { ok: false, error: `${LABEL[z]}: ارفع صورة البانر.` };
      if (mobileImage && !IMAGE.test(mobileImage)) return { ok: false, error: `${LABEL[z]}: صورة الموبايل غير صالحة.` };
      if (!HREF.test(href)) return { ok: false, error: `${LABEL[z]}: رابط البانر يجب أن يبدأ بـ https:// أو /` };
      const w = px(b?.w), h = px(b?.h), mw = px(b?.mw), mh = px(b?.mh);
      banners.push({
        image, href, alt: str(b?.alt, 120),
        ...(w && h ? { w, h } : {}),
        ...(mobileImage ? { mobileImage, ...(mw && mh ? { mw, mh } : {}) } : {}),
      });
    }
    if (mode === 'house' && !banners.length) return { ok: false, error: `${LABEL[z]}: أضف بانراً واحداً على الأقل أو اختر وضعاً آخر.` };
    out.zones[z] = { mode, unit: mode === 'adsense' ? unit : UNIT.test(unit) ? unit : '', banners };
  }

  // ads.txt extras (other ad networks). Plain text, one record per line.
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
