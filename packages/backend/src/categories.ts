import { PrismaClient } from '@prisma/client';

// The site's navigation as built in D-034 (measured from ammonnews.net). The DB
// held only politics/economy/sports until Stage 3; this seeds the rest ONCE and
// records a flag so admins' later renames/reorders are never overwritten.
export const DEFAULT_CATEGORIES: { slug: string; name: string; showInNav?: boolean }[] = [
  { slug: 'politics', name: 'اخبار الاردن' },
  { slug: 'east-west', name: 'شرق وغرب' },
  { slug: 'economy', name: 'اقتصاد' },
  { slug: 'education', name: 'تعليم و جامعات' },
  { slug: 'world', name: 'العالم' },
  { slug: 'palestine', name: 'فلسطين' },
  { slug: 'parliament', name: 'البرلمان' },
  { slug: 'panorama', name: 'بانوراما' },
  { slug: 'writers', name: 'كتاب المتابع' },
  { slug: 'nights', name: 'ليالي المتابع' },
  { slug: 'health', name: 'صحة وبيئة' },
  { slug: 'caricature', name: 'كاريكاتير' },
  { slug: 'video', name: 'فيديو' },
  { slug: 'sports', name: 'رياضة', showInNav: false }, // exists in the DB; the homepage links it but the measured nav has 13 items
];

const SEED_KEY = 'categories.seeded';

export async function ensureCategories(prisma: PrismaClient) {
  const flag = await prisma.siteSetting.findUnique({ where: { key: SEED_KEY } });
  if (flag) return { seeded: false };
  let created = 0;
  for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (existing) {
      // Legacy rows keep their id (articles point at it); align label/order/nav with the live header.
      await prisma.category.update({
        where: { id: existing.id },
        data: { name: c.name, displayOrder: i + 1, showInNav: c.showInNav ?? true },
      });
    } else {
      await prisma.category.create({ data: { slug: c.slug, name: c.name, displayOrder: i + 1, showInNav: c.showInNav ?? true } });
      created++;
    }
  }
  await prisma.siteSetting.create({ data: { key: SEED_KEY, value: { version: 1, at: new Date().toISOString(), created } } });
  console.log(`📂 categories seeded (${created} created, ${DEFAULT_CATEGORIES.length - created} aligned)`);
  return { seeded: true, created };
}
