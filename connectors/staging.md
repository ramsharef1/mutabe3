# mutabe3 · connectors/staging

**Vercel staging deployment configuration.**

## Deployment Details

| Setting | Value | Status |
|---------|-------|--------|
| **Environment** | Staging | — |
| **Branch** | develop (or main preview) | ⏳ TBD |
| **Domain** | mutabe3.vercel.app | ✅ Configured |
| **Project ID** | TBD | ⏳ TBD |
| **Team ID** | TBD | ⏳ TBD |

## Environment Variables

### Staging
- `DATABASE_URL` → Vercel Postgres (staging DB)
- `JWT_SECRET` → Staging key
- `SENTRY_DSN` → Error tracking (staging env)
- `NEXT_PUBLIC_ENV=staging`

---

**Last updated:** 2026-09-12 (template)
