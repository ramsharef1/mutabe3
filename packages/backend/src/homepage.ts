import { PrismaClient, Prisma } from '@prisma/client';
import { AUTHOR_PUBLIC } from './authors';

// Homepage curation lives in SiteSetting["homepage"]. Editors pick the hero,
// an ordered list of picks and an optional breaking item; the public endpoint
// resolves ids to PUBLISHED articles only, so an unpublished pick simply drops out.
export const HOMEPAGE_KEY = 'homepage';
export const MAX_PICKS = 8;

export interface Breaking { title: string; href: string; at: string }
// demoBlocks: the homepage's illustrative data blocks (markets, roads, parliament votes, jobs,
// video ids, columnist portraits…) stay visible until the desk has real content, then an editor
// switches them off from /dashboard/homepage (BIBLE F-02 / D-052). Default ON = today's behaviour.
export interface HomepageSetting { heroId?: string | null; pickIds?: string[]; breaking?: Breaking | null; demoBlocks?: boolean }

const ARTICLE_INCLUDE = { author: { select: AUTHOR_PUBLIC }, category: true } as const;

export async function readHomepageSetting(prisma: PrismaClient): Promise<HomepageSetting> {
  const row = await prisma.siteSetting.findUnique({ where: { key: HOMEPAGE_KEY } });
  const v = (row?.value || {}) as HomepageSetting;
  return { heroId: v.heroId || null, pickIds: Array.isArray(v.pickIds) ? v.pickIds : [], breaking: v.breaking && v.breaking.title ? v.breaking : null, demoBlocks: v.demoBlocks !== false };
}

export async function writeHomepageSetting(prisma: PrismaClient, s: HomepageSetting) {
  const value: HomepageSetting = { heroId: s.heroId || null, demoBlocks: s.demoBlocks !== false, pickIds: (s.pickIds || []).slice(0, MAX_PICKS), breaking: s.breaking && s.breaking.title ? { ...s.breaking } : null };
  const json = value as unknown as Prisma.InputJsonObject; // plain JSON object; Prisma's Json input type wants an index signature
  await prisma.siteSetting.upsert({ where: { key: HOMEPAGE_KEY }, update: { value: json }, create: { key: HOMEPAGE_KEY, value: json } });
  return value;
}

export async function resolveHomepage(prisma: PrismaClient, setting?: HomepageSetting) {
  const s = setting ?? (await readHomepageSetting(prisma));
  const ids = [s.heroId, ...(s.pickIds || [])].filter(Boolean) as string[];
  // Paid material never becomes the lead story or an editor's pick (REVENUE-MAP §3, D-057).
  const rows = ids.length
    ? await prisma.article.findMany({ where: { id: { in: ids }, status: 'PUBLISHED', kind: { not: 'SPONSORED' } }, include: ARTICLE_INCLUDE })
    : [];
  const by = new Map(rows.map((a) => [a.id, a]));
  return {
    hero: s.heroId ? by.get(s.heroId) || null : null,
    picks: (s.pickIds || []).map((id) => by.get(id)).filter(Boolean),
    breaking: s.breaking || null,
    demoBlocks: s.demoBlocks !== false,
  };
}
