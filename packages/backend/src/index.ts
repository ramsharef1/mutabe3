import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';

const app = express();
const port = process.env.PORT || 8080;
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  const allowedOrigins = ['https://mutabe3.news', 'https://www.mutabe3.news', 'http://localhost:9100', 'http://72.62.132.138:9100'];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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

// Articles endpoints
app.get('/api/articles', async (req: Request, res: Response) => {
  try {
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      include: { author: { select: { id: true, name: true } }, category: true },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: articles,
      count: articles.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
    });
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

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'mutabe3 API',
    version: '0.0.1',
    status: 'running',
    endpoints: {
      health: '/api/health',
      articles: '/api/articles',
      categories: '/api/categories',
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

// Error handling
app.use((err: any, req: Request, res: Response) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
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
