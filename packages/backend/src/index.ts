import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import { UPLOAD_DIR, UPLOAD_URL, IMG_URL, serveDerivative } from './uploads';
import { ensureCategories } from './categories';
import { startScheduler } from './scheduler';
import { resolveHomepage } from './homepage';
import readerRoutes from './routes/readers';
import { ensurePolls } from './polls';
import { readAds } from './ads';

// Approved reader comments only (D-043 Stage 4) — pending/rejected rows and emails never leave the API
const APPROVED_COMMENTS = { _count: { select: { comments: { where: { status: 'APPROVED' as const } } } } };

const app = express();
const port = process.env.PORT || 8080;
const prisma = new PrismaClient();

// nginx sits in front on the same host; honour X-Forwarded-For so req.ip is the reader's IP.
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');
// Baseline security headers on every API response (D-051 / SECURITY S-02). nginx adds HSTS for the whole host.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
// Editor uploads (images). Filenames are random, so long immutable caching is safe.
app.use(UPLOAD_URL, express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, index: false, dotfiles: 'ignore' }));
// Resized WebP derivatives of those masters, e.g. /api/img/640/2026/10/abc.webp (D-045).
app.get(`${IMG_URL}/:w(\\d+)/*`, (req, res) => { serveDerivative(req, res).catch(() => res.status(500).end()); });
app.use((req, res, next) => {
  const allowedOrigins = ['https://mutabe3.news', 'https://www.mutabe3.news', 'http://localhost:9100', 'http://72.62.132.138:9100'];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '0.0.1',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// Arabic search terms match loosely: with/without the definite article, hamza
// forms interchangeable, ة/ه interchangeable. Postgres `contains` compares code
// points literally, so we OR the spellings instead. Hamza is stripped from the
// query AND re-added in its common forms — otherwise "اردن" never finds "الأردن"
// (D-041 Found 1).
const termVariants = (t: string): string[] => {
  const bare = t.replace(/[أإآ]/g, 'ا');
  const stem = /^ال./.test(bare) ? bare.slice(2) : bare; // no ال, no hamza
  const stems = new Set<string>([stem]);
  if (stem.startsWith('ا')) for (const h of ['أ', 'إ', 'آ']) stems.add(h + stem.slice(1));
  const out = new Set<string>([t]);
  for (const s of stems) {
    for (const f of s.length >= 3 ? [s, `ال${s}`] : [s]) {
      out.add(f);
      if (f.endsWith('ة')) out.add(`${f.slice(0, -1)}ه`);
      if (f.endsWith('ه')) out.add(`${f.slice(0, -1)}ة`);
    }
  }
  return Array.from(out).filter((v) => v.length >= 2);
};

// Articles endpoints — public list; `?q=` searches title/summary/content/keywords, `?take=` up to 100
app.get('/api/articles', async (req: Request, res: Response) => {
  try {
    const take = Math.min(100, Math.max(1, parseInt(String(req.query.take), 10) || 20));
    const q = String(req.query.q || '').trim().slice(0, 100);
    const category = String(req.query.category || '').trim().slice(0, 60);
    const where: any = { status: 'PUBLISHED' };
    if (category) where.category = { slug: category }; // `?category=<slug>` — category pages fetch their own list
    if (q) {
      const terms = q.split(/\s+/).filter((t) => t.length >= 2).slice(0, 6);
      if (terms.length) {
        where.AND = terms.map((t) => ({
          OR: [
            ...termVariants(t).flatMap((v) => [
              { title: { contains: v, mode: 'insensitive' } },
              { summary: { contains: v, mode: 'insensitive' } },
              { content: { contains: v, mode: 'insensitive' } },
            ]),
            { seoKeywords: { has: t } },
          ],
        }));
      }
    }
    const articles = await prisma.article.findMany({
      where,
      include: { author: { select: { id: true, name: true } }, category: true, ...APPROVED_COMMENTS },
      orderBy: { publishedAt: 'desc' },
      take,
    });

    res.json({
      success: true,
      data: articles,
      count: articles.length,
      q: q || undefined,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
    });
  }
});

// POST /api/articles/:id/view — count a read. Same reader+article within 30 min counts once.
const recentViews = new Map<string, number>();
app.post('/api/articles/:id/view', async (req: Request, res: Response) => {
  try {
    const key = `${req.ip}|${req.params.id}`;
    const now = Date.now();
    const last = recentViews.get(key);
    if (last && now - last < 30 * 60 * 1000) return res.json({ success: true, counted: false });
    if (recentViews.size > 50000) recentViews.clear();
    recentViews.set(key, now);
    const a = await prisma.article.update({
      where: { id: req.params.id },
      data: { viewsCount: { increment: 1 } },
      select: { viewsCount: true },
    });
    res.json({ success: true, counted: true, viewsCount: a.viewsCount });
  } catch {
    res.status(404).json({ error: 'Article not found' });
  }
});

app.get('/api/articles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Public read by id OR slug, published only. Drafts/scheduled/archived stay
    // behind /api/admin/articles/:id, which needs an editor token (D-041 Found 4).
    const article = await prisma.article.findFirst({
      where: { OR: [{ id }, { slug: id }], status: 'PUBLISHED' },
      // was `comments: true`, which returned every comment row incl. pending/rejected and emails
      include: { author: { select: { id: true, name: true } }, category: true, ...APPROVED_COMMENTS },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Categories endpoint — drives the header/footer nav (showInNav) and the editor's category select
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, description: true, displayOrder: true, showInNav: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Homepage curation (hero / editor's picks / breaking) — PUBLISHED articles only (D-043 Stage 3)
app.get('/api/homepage', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await resolveHomepage(prisma) });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Ad zones (off / demo / house banners / AdSense) — read by the Next layout and /ads.txt (D-043 Stage 5)
app.get('/api/ads', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await readAds(prisma) });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// Admin routes (protected: editor/admin only) — article CRUD
app.use('/api/admin', adminRoutes);

// Public reader routes: comments, polls, newsletter (D-043 Stage 4)
app.use('/api', readerRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'mutabe3 API',
    version: '0.0.1',
    status: 'running',
    endpoints: {
      health: '/api/health',
      articles: '/api/articles?q=&take=',
      article: '/api/articles/:id',
      view: 'POST /api/articles/:id/view',
      categories: '/api/categories',
      ads: '/api/ads',
      uploads: '/api/uploads/*',
      admin: '/api/admin/* (editor token)',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        verify: 'POST /api/auth/verify',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
      },
    },
  });
});

// 404 for anything unmatched (JSON, not Express's HTML page)
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handling (Express only treats 4-arg functions as error handlers)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.status === 404 ? 'Not found' : 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 mutabe3 API running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  // One-time category seeding + the scheduled-publishing tick (D-043 Stage 3)
  ensureCategories(prisma).catch((e) => console.error('categories seed:', e));
  ensurePolls(prisma).catch((e) => console.error('polls seed:', e));
  startScheduler(prisma);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
