import type { MetadataRoute } from 'next';

// Web app manifest → /manifest.webmanifest (D-043 Stage 5). With public/sw.js this
// makes the site installable ("ثبّت تطبيق المتابع") on Android, desktop Chrome/Edge
// and iOS (Add to Home Screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'موقع المتابع الاخباري',
    short_name: 'المتابع',
    description: 'آخر أخبار الأردن والعالم — تُحفظ المقالات التي تفتحها لتقرأها بدون إنترنت.',
    id: '/',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#ffffff',
    theme_color: '#0B0B0F', // Ink & Signal (D-088)
    categories: ['news'],
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'اخبار الاردن', url: '/category/politics?source=app' },
      { name: 'اقتصاد', url: '/category/economy?source=app' },
      { name: 'بحث', url: '/search?source=app' },
    ],
  };
}
