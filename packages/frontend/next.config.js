// Security headers (D-051 / SECURITY S-02). The CSP ran in Report-Only from D-051; on 2026-10-07 seventeen
// production pages (public + dashboard, editor and media library exercised) produced no violation of it, so
// the same policy is now enforced (D-064), with `object-src 'none'` added and reports sent to /api/csp-report.
// 'unsafe-inline' for scripts stays: Next 14 inlines its flight data and a nonce would force every page to
// render per request. Adding GTM tags, AdSense or another embed means adding its hosts here first.
const DEV = process.env.NODE_ENV !== 'production'; // `next dev` needs eval (React Refresh) and its HMR websocket
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://www.youtube.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://googleads.g.doubleclick.net",
  `connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://api.open-meteo.com${DEV ? ' ws: wss:' : ''}`,
  "object-src 'none'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  'report-uri /api/csp-report',
  'report-to csp',
].join('; ');
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Reporting-Endpoints', value: 'csp="/api/csp-report"' },
  { key: 'Content-Security-Policy', value: CSP },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  poweredByHeader: false,
  images: { unoptimized: true }, // we serve our own WebP derivatives (/api/img); keeps /_next/image off the attack surface
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

module.exports = nextConfig;
