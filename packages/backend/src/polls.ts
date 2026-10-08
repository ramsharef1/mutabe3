import { PrismaClient } from './generated/prisma/client';

// Reader polls (D-043 Stage 4). The two widgets that existed as client-only demos
// (the community poll and the "وجهان" debate) are seeded once as real polls so
// the homepage keeps its look; their invented starting percentages are NOT
// carried over — real counts start at zero. Editors replace them from the dashboard.
const SEED_KEY = 'polls.seeded';

export async function ensurePolls(prisma: PrismaClient) {
  if (await prisma.siteSetting.findUnique({ where: { key: SEED_KEY } })) return;
  await prisma.poll.create({
    data: {
      slot: 'home', active: true, question: 'هل تؤيد قرار رفع سعر الفائدة؟',
      options: { create: ['نعم', 'لا', 'لا أعرف'].map((label, order) => ({ label, order })) },
    },
  });
  await prisma.poll.create({
    data: {
      slot: 'debate', active: true, question: 'هل يخدم رفع سعر الفائدة الاقتصاد الأردني؟',
      options: {
        create: [
          { order: 0, label: 'نعم، يحمي الدينار', byline: 'م. ليلى العبادي', note: 'الربط بالدولار يفرض علينا مجاراة الفيدرالي، والبديل هروب الودائع وضغط على الاحتياطي.' },
          { order: 1, label: 'لا، يخنق الاستثمار', byline: 'خالد الرواشدة', note: 'كلفة الاقتراض على الشركات الصغيرة تجاوزت 11%، وهذا يجمّد التوسع والتوظيف.' },
        ],
      },
    },
  });
  await prisma.siteSetting.create({ data: { key: SEED_KEY, value: { version: 1, at: new Date().toISOString() } } });
  console.log('🗳️  polls seeded (home + debate, zero votes)');
}

type PollWithOptions = { id: string; slot: string; question: string; active: boolean; createdAt: Date; options: { id: string; label: string; byline: string | null; note: string | null; order: number; votes: number }[] };

export const pollDto = (p: PollWithOptions) => {
  const options = [...p.options].sort((a, b) => a.order - b.order).map(({ id, label, byline, note, votes }) => ({ id, label, byline, note, votes }));
  return { id: p.id, slot: p.slot, question: p.question, active: p.active, createdAt: p.createdAt, total: options.reduce((n, o) => n + o.votes, 0), options };
};

export async function activePolls(prisma: PrismaClient) {
  const rows = await prisma.poll.findMany({ where: { active: true }, include: { options: true }, orderBy: { updatedAt: 'desc' } });
  const pick = (slot: string) => { const p = rows.find((r) => r.slot === slot); return p ? pollDto(p) : null; };
  return { home: pick('home'), debate: pick('debate') };
}
