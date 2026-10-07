import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import { UPLOAD_DIR, UPLOAD_URL, IMG_URL, serveDerivative } from './uploads';
import { ensureCategories } from './categories';
import { startScheduler } from './scheduler';
import { resolveHomepage } from './homepage';
import readerRoutes from './routes/readers';
import { ensurePolls } from './polls';
import { readAds, recordAdEvents, flushAdStats } from './ads';
import { allow, isLoopback } from './ratelimit';
import { sendError } from './errors';
import { authorRoutes, ensureAuthorSlugs, AUTHOR_PUBLIC } from './authors';
import { liveRoutes } from './live';
import { recordView, flushViewStats } from './stats';
import { searchArticles, ensureSearchText } from './search';
import { pushRoutes } from './push';

// Crawlers, link previews and monitors: never counted as reads or ad deliveries.
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor/i;
// Search runs ILIKE over title/summary/body, the most expensive public query. Per reader address,
// generous because Jordanian carriers put many readers behind one address (D-064, SECURITY S-06).
const SEARCH_LIMIT = { n: 90, ms: 60_000 };
// Counted reads per address (on top of once per article per 30 min): caps scripted inflation (S-13).
const VIEW_LIMIT = { n: 120, ms: 10 * 60_000 };

// Approved reader comments only (D-043 Stage 4) — pending/rejected rows and emails never leave the API
// Article kinds a public list may filter on (ArticleKind minus SPONSORED, which has its own placements).
const PUBLIC_KINDS = new Set(['NEWS', 'OPINION', 'EXPLAINER', 'LIVE', 'VIDEO', 'GALLERY', 'CARICATURE', 'NOTICE']);

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

// gzip for JSON/text answers (only compressible types; images are already compressed). The article list
// alone was 18 KB uncompressed on every page that fetched it (Lighthouse uses-text-compression, D-070).
app.use(compression({ threshold: 1024 }));

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
// Editor uploads (images). Filenames are random, so long immutable caching is safe.
app.use(UPLOAD_URL, express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, index: false, dotfiles: 'ignore' }));
// Resized WebP derivatives of those masters, e.g. /api/img/640/2026/10/abc.webp (D-045).
app.get(`${IMG_URL}/:w(\\d+)/*`, (req, res) => { serveDerivative(req, res).catch(() => res.status(500).end()); });
// Browser origins allowed to call the API (D-065, SECURITY S-17): CORS_ORIGINS (comma list) when set,
// otherwise the two production hosts; the local frontend only outside production.
const allowedOrigins = (process.env.CORS_ORIGINS || 'https://mutabe3.news,https://www.mutabe3.news')
  .split(',').map((o) => o.trim()).filter(Boolean)
  .concat(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:9100']);
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Vary', 'Origin');
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

// Articles endpoints — public list; `?q=` searches title/summary/content/keywords, `?take=` up to 100
app.get('/api/articles', async (req: Request, res: Response) => {
  try {
    const take = Math.min(100, Math.max(1, parseInt(String(req.query.take), 10) || 20));
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (q && !isLoopback(req.ip) && !allow(`sq:${req.ip || 'unknown'}`, SEARCH_LIMIT.n, SEARCH_LIMIT.ms)) {
      return res.status(429).json({ success: false, error: 'عمليات بحث كثيرة في وقت قصير — حاول بعد دقيقة' });
    }
    const category = String(req.query.category || '').trim().slice(0, 60);
    const where: any = { status: 'PUBLISHED' };
    if (category) where.category = { slug: category }; // `?category=<slug>` — category pages fetch their own list
    // `?kind=VIDEO|CARICATURE|LIVE|…` — homepage video, caricature and live blocks (D-068); unknown kinds are ignored
    const kind = String(req.query.kind || '');
    if (PUBLIC_KINDS.has(kind)) where.kind = kind;
    const include = { author: { select: AUTHOR_PUBLIC }, category: true, ...APPROVED_COMMENTS };
    // `?q=`: normalised Arabic search, ranked by relevance, with «هل تقصد…» when nothing matches (D-071)
    if (q) {
      const found = await searchArticles(prisma, q, { take, where, include });
      return res.json({ success: true, data: found.data, count: found.data.length, q, suggest: found.suggest });
    }
    const articles = await prisma.article.findMany({ where, include, orderBy: { publishedAt: 'desc' }, take });

    res.json({
      success: true,
      data: articles,
      count: articles.length,
    });
  } catch (error) {
    sendError(res, error);
  }
});

// POST /api/articles/:id/view — count a read. Same reader+article within 30 min counts once; bots never;
// at most VIEW_LIMIT counted reads per address (D-064). Over a limit the answer is still 200 `counted: false`.
const VIEW_WINDOW_MS = 30 * 60 * 1000;
const recentViews = new Map<string, number>();
app.post('/api/articles/:id/view', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!/^[\w-]{1,100}$/.test(id)) return res.status(404).json({ error: 'Article not found' });
    if (BOT_UA.test(String(req.headers['user-agent'] || ''))) return res.json({ success: true, counted: false });
    const key = `${req.ip}|${id}`;
    const now = Date.now();
    const last = recentViews.get(key);
    if (last && now - last < VIEW_WINDOW_MS) return res.json({ success: true, counted: false });
    if (!isLoopback(req.ip) && !allow(`vw:${req.ip || 'unknown'}`, VIEW_LIMIT.n, VIEW_LIMIT.ms)) return res.json({ success: true, counted: false });
    // Raw increment so Prisma's @updatedAt is NOT bumped: updatedAt feeds dateModified in the
    // article JSON-LD and must only move on editorial edits (BIBLE F-04, CONTENT-ARCHITECTURE §0).
    const rows = await prisma.$queryRaw<{ viewsCount: number }[]>`
      UPDATE "Article" SET "viewsCount" = "viewsCount" + 1 WHERE id = ${id} RETURNING "viewsCount"`;
    if (!rows.length) return res.status(404).json({ error: 'Article not found' });
    // Remember the read only once it counted, so unknown ids can't fill the map; sweep stale keys before clearing.
    if (recentViews.size > 50000) {
      for (const [k, t] of recentViews) if (now - t >= VIEW_WINDOW_MS) recentViews.delete(k);
      if (recentViews.size > 50000) recentViews.clear();
    }
    recentViews.set(key, now);
    recordView(id); // per-day count for the dashboard (D-069)
    res.json({ success: true, counted: true, viewsCount: rows[0].viewsCount });
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
      include: { author: { select: AUTHOR_PUBLIC }, category: true, ...APPROVED_COMMENTS },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    sendError(res, error);
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
    sendError(res, error);
  }
});

// Homepage curation (hero / editor's picks / breaking) — PUBLISHED articles only (D-043 Stage 3)
app.get('/api/homepage', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await resolveHomepage(prisma) });
  } catch (error) {
    sendError(res, error);
  }
});

// Ad zones (off / demo / house banners / AdSense) — read by the Next layout and /ads.txt (D-043 Stage 5)
app.get('/api/ads', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await readAds(prisma, { activeOnly: true }) }); // scheduled banners only while active (D-057)
  } catch (error) {
    sendError(res, error);
  }
});

// POST /api/ads/ev — delivery beacons from the page: {"events":[{zone,bannerId,type:"view"|"click"}]} (D-057).
// sendBeacon posts text/plain, so parse the body here; bots and bursts are dropped; nothing identifies the reader.
app.post('/api/ads/ev', express.text({ type: '*/*', limit: '8kb' }), (req: Request, res: Response) => {
  try {
    if (BOT_UA.test(String(req.headers['user-agent'] || ''))) return res.status(204).end();
    if (!allow(`ae:${req.ip || 'unknown'}`, 120, 10 * 60_000)) return res.status(204).end();
    recordAdEvents(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  } catch { /* malformed beacon: ignore */ }
  res.status(204).end();
});

// POST /api/csp-report — browsers report Content-Security-Policy violations here (SECURITY S-02, D-064):
// `report-uri` posts {"csp-report":{…}} as application/csp-report, the Reporting API posts an array as
// application/reports+json. One compact warn line per report (rate-limited) so a page the policy breaks
// shows up in the backend log; nothing is stored. The page is logged as a path only — never the query.
const pathOnly = (u: unknown) => { try { return new URL(String(u)).pathname.slice(0, 120); } catch { return '-'; } };
app.post('/api/csp-report', express.text({ type: '*/*', limit: '16kb' }), (req: Request, res: Response) => {
  try {
    if (allow(`csp:${req.ip || 'unknown'}`, 20, 10 * 60_000) && allow('csp:all', 300, 60 * 60_000)) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const reports: any[] = Array.isArray(body) ? body.map((r) => r?.body || r) : [body?.['csp-report'] || body];
      for (const r of reports.slice(0, 5)) {
        const dir = r?.effectiveDirective || r?.['effective-directive'] || r?.violatedDirective || r?.['violated-directive'];
        const blocked = r?.blockedURL || r?.['blocked-uri'] || '';
        const src = r?.sourceFile || r?.['source-file'] || '';
        console.warn(`[csp] ${String(dir).slice(0, 40)} blocked=${String(blocked).slice(0, 120)} page=${pathOnly(r?.documentURL || r?.['document-uri'])} src=${String(src).slice(0, 120)} ${String(r?.disposition || '')}`);
      }
    }
  } catch { /* malformed report: ignore */ }
  res.status(204).end();
});

// Auth routes
app.use('/api/auth', authRoutes);

// Admin routes (protected: editor/admin only) — article CRUD
app.use('/api/admin', adminRoutes);

// Public reader routes: comments, polls, newsletter (D-043 Stage 4)
app.use('/api', readerRoutes);

// Public author profiles: /api/authors, /api/authors/:slug (D-067)
app.use('/api', authorRoutes(prisma));

// Live blogs: /api/articles/:id/live, /api/live/current (D-068)
app.use('/api', liveRoutes(prisma));

// Web push for «عاجل»: /api/push/key, /api/push/subscribe, /api/push/unsubscribe (D-072)
app.use('/api', pushRoutes(prisma));

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
  const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
  sendError(res, err, { status, code: status === 413 ? 'TOO_LARGE' : status < 500 ? 'BAD_REQUEST' : 'SERVER_ERROR' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 mutabe3 API running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  // One-time category seeding + the scheduled-publishing tick (D-043 Stage 3)
  ensureCategories(prisma).catch((e) => console.error('categories seed:', e));
  ensurePolls(prisma).catch((e) => console.error('polls seed:', e));
  ensureAuthorSlugs(prisma).catch((e) => console.error('author slugs:', e));
  ensureSearchText(prisma).catch((e) => console.error('search index:', e));
  startScheduler(prisma);
});

// Graceful shutdown (systemd sends SIGTERM on deploy; Ctrl-C sends SIGINT).
// Ad beacons and daily reads are counted in memory and written once a minute, so flush them before leaving.
let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n🛑 ${signal}: shutting down...`);
  try { await flushAdStats(prisma); } catch (e) { console.error('ad stats flush on shutdown:', e); }
  try { await flushViewStats(prisma); } catch (e) { console.error('view stats flush on shutdown:', e); }
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
