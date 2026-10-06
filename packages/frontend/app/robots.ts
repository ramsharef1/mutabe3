import type { MetadataRoute } from 'next';
import { SITE_URL } from './lib/api';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/auth', '/api/admin', '/newsletter/unsubscribe', '/offline'] }],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
    host: SITE_URL,
  };
}
