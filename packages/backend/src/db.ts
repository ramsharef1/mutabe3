import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

// Prisma 7 (D-084) has no Rust query engine: every client talks to Postgres through the pg driver adapter.
// Each module still gets its own client (and so its own pool) exactly as before. Prisma 6 gave up waiting for
// a pooled connection after 10 s (pool_timeout); pg's pool would wait forever, so the same 10 s is set here.
export function newPrismaClient() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 }) });
}
