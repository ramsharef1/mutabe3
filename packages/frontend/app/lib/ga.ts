// Google Analytics 4 measurement id (D-074). Public by design — it appears in every page's HTML — so it lives
// in code; NEXT_PUBLIC_GA_ID overrides it for another newsroom's instance. GA4 loads only after the reader
// accepts the consent bar, only on the production hosts below, never on staff pages.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-YH1LGW1B1D';
export const GA_HOSTS = ['mutabe3.news', 'www.mutabe3.news'];
