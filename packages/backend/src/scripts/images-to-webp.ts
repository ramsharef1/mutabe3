// One-off backfill (D-045): re-encode the JPEG/PNG masters already under UPLOAD_DIR to WebP
// and repoint every DB reference — Article.featuredImageUrl, <img src> inside Article.content,
// Category.imageUrl. New uploads never need this (storeUpload() writes WebP masters).
//
//   npx tsx packages/backend/src/scripts/images-to-webp.ts --dry               # preview only
//   npx tsx packages/backend/src/scripts/images-to-webp.ts                     # convert + repoint, keep originals
//   npx tsx packages/backend/src/scripts/images-to-webp.ts --delete-original   # …and remove the old jpg/png
//
// Needs DATABASE_URL and UPLOAD_DIR in the environment (on the VPS: `set -a; . /etc/mutabe3/backend.env; set +a`,
// which the deploy workflow's `images_backfill` input does for you). Idempotent: already-converted files are
// reused, rows already pointing at .webp are left alone. gif/svg/webp masters are never touched.
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { UPLOAD_DIR } from '../uploads';
import { MASTER_MAX_WIDTH, MASTER_QUALITY, toWebp } from '../images';

const argv = new Set(process.argv.slice(2));
const DRY = argv.has('--dry');
const DELETE_ORIGINAL = argv.has('--delete-original');
const CONVERTIBLE = /\.(jpe?g|png)$/i;
const mb = (n: number) => `${(n / 1048576).toFixed(2)} MB`;

interface Job { rel: string; abs: string; newRel: string; newAbs: string; size: number; newSize: number; state: 'pending' | 'converted' | 'reused' | 'failed' }

/** YYYY/MM/*.jpg|jpeg|png under UPLOAD_DIR (the .cache dir and other dot-dirs are skipped). */
function scan(): Job[] {
  const jobs: Job[] = [];
  if (!fs.existsSync(UPLOAD_DIR)) return jobs;
  for (const y of fs.readdirSync(UPLOAD_DIR, { withFileTypes: true })) {
    if (!y.isDirectory() || y.name.startsWith('.')) continue;
    for (const m of fs.readdirSync(path.join(UPLOAD_DIR, y.name), { withFileTypes: true })) {
      if (!m.isDirectory() || m.name.startsWith('.')) continue;
      const dir = path.join(UPLOAD_DIR, y.name, m.name);
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!f.isFile() || !CONVERTIBLE.test(f.name)) continue;
        const rel = `${y.name}/${m.name}/${f.name}`;
        const newRel = rel.replace(CONVERTIBLE, '.webp');
        const newAbs = path.join(UPLOAD_DIR, newRel);
        const newSize = fs.existsSync(newAbs) ? fs.statSync(newAbs).size : 0;
        jobs.push({ rel, abs: path.join(dir, f.name), newRel, newAbs, size: fs.statSync(path.join(dir, f.name)).size, newSize, state: newSize ? 'reused' : 'pending' });
      }
    }
  }
  return jobs;
}

async function convert(job: Job) {
  try {
    const { data } = await toWebp(job.abs, MASTER_MAX_WIDTH, MASTER_QUALITY);
    if (data.length < 100) throw new Error('empty output');
    const tmp = `${job.newAbs}.tmp`;
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, job.newAbs);
    job.newSize = data.length;
    job.state = 'converted';
  } catch (e) {
    job.state = 'failed';
    console.warn(`  ✗ ${job.rel}: ${(e as Error).message}`);
  }
}

// Matches /api/uploads/YYYY/MM/name.jpg in a URL field or inside HTML, relative or with any origin.
const REF_RE = /(https?:\/\/[^\s"'<>]+?)?\/api\/uploads\/(\d{4}\/\d{2}\/[A-Za-z0-9_-]+\.(?:jpe?g|png))\b/gi;

function repoint(text: string, ready: Map<string, string>): string {
  return text.replace(REF_RE, (whole, origin: string | undefined, rel: string) => {
    const next = ready.get(rel);
    return next ? `${origin || ''}/api/uploads/${next}` : whole;
  });
}

async function main() {
  console.log(`images-to-webp · ${DRY ? 'DRY RUN' : DELETE_ORIGINAL ? 'APPLY + DELETE ORIGINALS' : 'APPLY (originals kept)'} · ${UPLOAD_DIR}`);
  const jobs = scan();
  if (!jobs.length) console.log('no jpg/png masters found — nothing to convert');

  for (const j of jobs) {
    if (j.state === 'reused') { console.log(`  = ${j.rel} → ${path.basename(j.newRel)} already exists (${mb(j.size)} → ${mb(j.newSize)})`); continue; }
    if (DRY) { console.log(`  would convert ${j.rel} (${mb(j.size)})`); continue; }
    await convert(j);
    if (j.state === 'converted') console.log(`  ✓ ${j.rel} → ${path.basename(j.newRel)} (${mb(j.size)} → ${mb(j.newSize)})`);
  }

  // Only files whose WebP really exists may be repointed (never in a dry run for pending ones — but
  // the dry run still reports what WOULD be repointed, assuming every pending conversion succeeds).
  const ready = new Map<string, string>();
  for (const j of jobs) if (DRY ? j.state !== 'failed' : j.state === 'converted' || j.state === 'reused') ready.set(j.rel, j.newRel);

  const prisma = new PrismaClient();
  let articles = 0, featured = 0, inline = 0, categories = 0;
  try {
    const arts = await prisma.article.findMany({
      where: { OR: [{ featuredImageUrl: { contains: '/api/uploads/' } }, { content: { contains: '/api/uploads/' } }] },
      select: { id: true, featuredImageUrl: true, content: true },
    });
    for (const a of arts) {
      const f = a.featuredImageUrl ? repoint(a.featuredImageUrl, ready) : a.featuredImageUrl;
      const c = repoint(a.content, ready);
      const changed = f !== a.featuredImageUrl || c !== a.content;
      if (!changed) continue;
      articles++; if (f !== a.featuredImageUrl) featured++; if (c !== a.content) inline++;
      if (DRY) { console.log(`  would repoint article ${a.id}${f !== a.featuredImageUrl ? ' (featured)' : ''}${c !== a.content ? ' (inline)' : ''}`); continue; }
      await prisma.article.update({ where: { id: a.id }, data: { featuredImageUrl: f, content: c } });
    }
    const cats = await prisma.category.findMany({ where: { imageUrl: { contains: '/api/uploads/' } }, select: { id: true, imageUrl: true } });
    for (const cat of cats) {
      const u = repoint(cat.imageUrl!, ready);
      if (u === cat.imageUrl) continue;
      categories++;
      if (DRY) { console.log(`  would repoint category ${cat.id}`); continue; }
      await prisma.category.update({ where: { id: cat.id }, data: { imageUrl: u } });
    }
  } finally {
    await prisma.$disconnect();
  }

  let deleted = 0, reclaimed = 0;
  if (DELETE_ORIGINAL && !DRY) {
    for (const j of jobs) {
      if (!ready.has(j.rel) || !fs.existsSync(j.newAbs)) continue;
      fs.unlinkSync(j.abs); deleted++; reclaimed += j.size;
    }
  }

  const before = jobs.reduce((s, j) => s + j.size, 0);
  const after = jobs.reduce((s, j) => s + (ready.has(j.rel) ? j.newSize : j.size), 0);
  const failed = jobs.filter((j) => j.state === 'failed').length;
  console.log('—');
  console.log(`files: ${jobs.length} jpg/png · converted now: ${jobs.filter((j) => j.state === 'converted').length} · reused: ${jobs.filter((j) => j.state === 'reused').length} · failed: ${failed}`);
  console.log(`masters: ${mb(before)} → ${DRY ? '(dry) ' : ''}${after ? mb(after) : 'n/a'}${DRY && jobs.some((j) => j.state === 'pending') ? ' (after-size known once converted)' : ''}`);
  console.log(`db: ${articles} articles (${featured} featured, ${inline} inline body images) · ${categories} categories${DRY ? ' would be' : ''} repointed`);
  if (DELETE_ORIGINAL) console.log(DRY ? 'originals: would be deleted after repoint' : `originals deleted: ${deleted} (${mb(reclaimed)} reclaimed)`);
  else if (!DRY && jobs.length) console.log('originals kept — rerun with --delete-original to reclaim the disk');
  if (failed) console.log(`⚠️  ${failed} file(s) failed; their rows were left pointing at the original`);
}

main().catch((e) => { console.error(e); process.exit(1); });
