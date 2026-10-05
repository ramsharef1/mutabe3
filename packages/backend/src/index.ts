import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import { UPLOAD_DIR, UPLOAD_URL } from './uploads';

const app = express();
const port = process.env.PORT || 8080;
const prisma = new PrismaClient();

// nginx sits in front on the same host; honour X-Forwarded-For so req.ip is the reader's IP.
app.set('trust proxy', 'loopback');

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
// Editor uploads (images). Filenames are random, so long immutable caching is safe.
app.use(UPLOAD_URL, express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, index: false }));
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
// forms collapsed, ة/ه interchangeable. Postgres `contains` can't normalise, so
// we OR the spellings instead.
const termVariants = (t: string): string[] => {
  const s = new Set<string>([t]);
  s.add(t.replace(/[أإآ]/g, 'ا'));
  if (/^ال./.test(t)) s.add(t.replace(/^ال/, '')); else if (t.length >= 3) s.add(`ال${t}`);
  if (/ة$/.test(t)) s.add(t.replace(/ة$/, 'ه'));
  if (/ه$/.test(t)) s.add(t.replace(/ه$/, 'ة'));
  return Array.from(s).filter((v) => v.length >= 2);
};

// Articles endpoints — public list; `?q=` searches title/summary/content/keywords, `?take=` up to 100
app.get('/api/articles', async (req: Request, res: Response) => {
  try {
    const take = Math.min(100, Math.max(1, parseInt(String(req.query.take), 10) || 20));
    const q = String(req.query.q || '').trim().slice(0, 100);
    const where: any = { status: 'PUBLISHED' };
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
      include: { author: { select: { id: true, name: true } }, category: true },
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
    const article = await prisma.article.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true } }, category: true, comments: true },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Categories endpoint
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
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

// Auth routes
app.use('/api/auth', authRoutes);

// Admin routes (protected: editor/admin only) — article CRUD
app.use('/api/admin', adminRoutes);

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
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
