# mutabe3 · connectors/production

**Vercel production deployment configuration.**

## Deployment Details

| Setting | Value | Status |
|---------|-------|--------|
| **Environment** | Production | — |
| **Branch** | main | ⏳ TBD |
| **Domain** | TBD (.jo or .com) | ⏳ TBD |
| **Project ID** | TBD | ⏳ TBD |
| **Team ID** | TBD | ⏳ TBD |

## Environment Variables

### Required (Production)
- `DATABASE_URL` → Vercel Postgres connection string
- `JWT_SECRET` → Secure auth key
- `SENTRY_DSN` → Error tracking

### Optional (Production)
- `VERCEL_ENV=production`

## Verification

- [ ] Domain configured in Vercel
- [ ] Environment variables set in Vercel dashboard
- [ ] Deployment successful
- [ ] Health check passes

---

**Last updated:** 2026-09-12 (template)
