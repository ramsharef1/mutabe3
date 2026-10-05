import { PrismaClient, Prisma } from '@prisma/client';

// Homepage curation lives in SiteSetting["homepage"]. Editors pick the hero,
// an ordered list of picks and an optional breaking item; the public endpoint
// resolves ids to PUBLISHED articles only, so an unpublished pick simply drops out.
export const HOMEPAGE_KEY = 'homepage';
export const MAX_PICKS = 8;

export interface Breaking { title: string; href: string; at: string }
export interface HomepageSetting { heroId?: string | null; pickIds?: string[]; breaking?: Breaking | null }

const ARTICLE_INCLUDE = { author: { select: { id: true, name: true } }, category: true } as const;

export async function readHomepageSetting(prisma: PrismaClient): Promise<HomepageSetting> {
  const row = await prisma.siteSetting.findUnique({ where: { key: HOMEPAGE_KEY } });
  const v = (row?.value || {}) as HomepageSetting;
  return { heroId: v.heroId || null, pickIds: Array.isArray(v.pickIds) ? v.pickIds : [], breaking: v.breaking && v.breaking.title ? v.breaking : null };
}

export async function writeHomepageSetting(prisma: PrismaClient, s: HomepageSetting) {
  const value: HomepageSetting = { heroId: s.heroId || null, pickIds: (s.pickIds || []).slice(0, MAX_PICKS), breaking: s.breaking && s.breaking.title ? { ...s.breaking } : null };
  const json = value as unknown as Prisma.InputJsonObject; // plain JSON object; Prisma's Json input type wants an index signature
  await prisma.siteSetting.upsert({ where: { key: HOMEPAGE_KEY }, update: { value: json }, create: { key: HOMEPAGE_KEY, value: json } });
  return value;
}

export async function resolveHomepage(prisma: PrismaClient, setting?: HomepageSetting) {
  const s = setting ?? (await readHomepageSetting(prisma));
  const ids = [s.heroId, ...(s.pickIds || [])].filter(Boolean) as string[];
  const rows = ids.length
    ? await prisma.article.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, include: ARTICLE_INCLUDE })
    : [];
  const by = new Map(rows.map((a) => [a.id, a]));
  return {
    hero: s.heroId ? by.get(s.heroId) || null : null,
    picks: (s.pickIds || []).map((id) => by.get(id)).filter(Boolean),
    breaking: s.breaking || null,
  };
}
