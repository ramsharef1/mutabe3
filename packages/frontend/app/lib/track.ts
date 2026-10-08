import { GA_ID } from './ga';
// Tiny analytics bridge (D-055 / ANALYTICS-PLAN). With GA4 loaded directly (D-074) events go through
// gtag('event', …), queued in the dataLayer until the reader consents (and never sent if they refuse);
// with a GTM container they are pushed to the dataLayer as before. Components call track() unconditionally.
// Event names follow brain/ANALYTICS-PLAN.md §2 (GA4 reserves ad_impression/ad_click → we use ad_view/ad_clickout).
export type TrackEvent =
  | 'article_view' | 'read_complete' | 'share' | 'save_article' | 'comment_submit' | 'poll_vote'
  | 'newsletter_signup' | 'newsletter_confirm' | 'search_no_results' | 'select_content'
  | 'ad_view' | 'ad_clickout' | 'advertise_cta_click' | 'advertiser_contact_click'
  | 'submit_tip_click' | 'social_follow_click' | 'pwa_install' | 'consent_update';

declare global {
  interface Window { dataLayer?: Record<string, unknown>[]; gtag?: (...args: unknown[]) => void }
}

export function track(event: TrackEvent, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  if (GA_ID && window.gtag) { window.gtag('event', event, params); return; }
  const dl = (window.dataLayer ||= []);
  dl.push({ event, ...params });
}
