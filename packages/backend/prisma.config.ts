// Prisma CLI config (Prisma 7, D-084). Prisma no longer reads DATABASE_URL from the schema or loads .env files:
// the shell provides it — deploys source /etc/mutabe3/backend.env, local work sources .env.local (`set -a; . ./.env.local; set +a`).
// Run from the repo root with `--config=packages/backend/prisma.config.ts`; paths below are relative to this file.
// process.env rather than prisma/config's env(): `prisma generate` needs no database and must work without it.
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
