import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

// Prisma 7 (D-084) has no Rust query engine: every client talks to Postgres through the pg driver adapter.
// Each module still gets its own client (and so its own pool) exactly as before. Prisma 6 gave up waiting for
// a pooled connection after 10 s (pool_timeout); pg's pool would wait forever, so the same 10 s is set here.
// Postgres on the VPS is shared by six databases with max_connections 100: pg's default pool of 10 per client
// would let mutabe3's eight clients reach 80, so each is capped at 3 (24 at most; ~15 in use under Prisma 6)
// and idle connections close after 30 s. Postgres is local, so no SSL (Prisma 6 used it only because it was offered).
export function newPrismaClient() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000, max: 3, idleTimeoutMillis: 30_000 }) });
}
