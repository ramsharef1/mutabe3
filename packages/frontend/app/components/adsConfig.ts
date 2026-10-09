// Ad settings shape shared by the server layout, the ad slots and the dashboard
// (D-043 Stage 5). Pure data, no 'use client'. Mirrors packages/backend/src/ads.ts.

export type AdZone = 'header' | 'inline' | 'article' | 'sidebar';
export type AdMode = 'off' | 'demo' | 'house' | 'adsense';
/** w/h (mw/mh for the mobile image): pixel size measured at upload, used to reserve space before the image loads.
 *  id/label/startAt/endAt (D-057): delivery counting id, advertiser or campaign name, optional schedule (ISO). */
export interface HouseBanner { id?: string; label?: string; startAt?: string; endAt?: string; image: string; mobileImage?: string; href: string; alt: string; w?: number; h?: number; mw?: number; mh?: number }
export interface ZoneSetting { mode: AdMode; unit: string; banners: HouseBanner[] }
export interface AdsConfig {
  adsense: { client: string; auto: boolean };
  zones: Record<AdZone, ZoneSetting>;
  adsTxt: string;
  updatedAt?: string;
}

export const AD_ZONES: AdZone[] = ['header', 'inline', 'article', 'sidebar'];

/** Dashboard copy for each zone: where it shows and the banner size that fits. */
export const ZONE_INFO: Record<AdZone, { label: string; where: string; size: string }> = {
  header: { label: 'إعلان الترويسة', where: 'بجانب الشعار أعلى كل صفحة (يختفي على الموبايل).', size: '728×90' },
  inline: { label: 'إعلانات بين الأقسام', where: 'الأشرطة الأفقية بين أقسام الصفحة الرئيسية وفي صفحات الأقسام.', size: '728×90 · موبايل 320×100' },
  article: { label: 'إعلان داخل المقال', where: 'بعد نص المقال وقبل «أخبار ذات صلة» — أكثر مكان يقرؤه الزوار القادمون من البحث.', size: '728×90 · موبايل 320×100' },
  sidebar: { label: 'إعلانات العمود الجانبي', where: 'المربعات في العمود الجانبي للصفحة الرئيسية والمقالات.', size: '300×250' },
};

export const MODE_LABEL: Record<AdMode, string> = {
  off: 'إيقاف — بدون إعلان',
  demo: '«أعلن معنا» — مساحة متاحة (رابط لصفحة الإعلان)',
  house: 'بانر خاص — إعلان مباع مباشرة',
  adsense: 'Google AdSense',
};

const zone = (): ZoneSetting => ({ mode: 'demo', unit: '', banners: [] });
export const DEFAULT_ADS: AdsConfig = {
  adsense: { client: '', auto: false },
  zones: { header: zone(), inline: zone(), article: zone(), sidebar: zone() },
  adsTxt: '',
};

/** True when the AdSense script should load on public pages. */
export const needsAdsense = (c: AdsConfig) =>
  !!c.adsense.client && (c.adsense.auto || AD_ZONES.some((z) => c.zones[z].mode === 'adsense' && !!c.zones[z].unit));
