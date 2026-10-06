// Server-side read of the ad settings for the root layout and /ads.txt (D-043 Stage 5).
// Cached for a minute; saving in /dashboard/ads revalidates the 'ads' tag at once.
// Any failure (API down, old backend during a deploy build) falls back to the
// defaults, which keep the current demo look.
import { API_BASE } from './api';
import { AdsConfig, DEFAULT_ADS, AD_ZONES } from '../components/adsConfig';

export async function fetchAds(): Promise<AdsConfig> {
  try {
    const r = await fetch(`${API_BASE}/api/ads`, { next: { revalidate: 60, tags: ['ads'] } });
    if (!r.ok) return DEFAULT_ADS;
    const d = (await r.json()).data;
    if (!d?.zones || !d?.adsense) return DEFAULT_ADS;
    const zones = { ...DEFAULT_ADS.zones };
    for (const z of AD_ZONES) if (d.zones[z]) zones[z] = d.zones[z];
    return { adsense: d.adsense, zones, adsTxt: d.adsTxt || '', updatedAt: d.updatedAt };
  } catch {
    return DEFAULT_ADS;
  }
}
