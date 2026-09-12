# mutabe3 — COMMANDS

**Registry of operational procedures for mutabe3.** Run from `~/Projects/forge/projects/mutabe3`.

---

## VPS Access

```bash
# SSH into VPS (as root)
ssh -i ~/.ssh/id_ed25519 root@72.62.132.138

# Or use the hostname
ssh -i ~/.ssh/id_ed25519 root@srv1772644.hstgr.cloud

# Check mutabe3 container status
docker ps | grep mutabe3

# View logs
docker logs -f mutabe3-frontend
docker logs -f mutabe3-backend
docker logs -f mutabe3-postgres
```

---

## Deployment

### Push to Deploy
```bash
# Commit and push to main branch
git add -A
git commit -m "feat: <description>"
git push origin main

# GitHub Actions will automatically:
# 1. Build Docker images
# 2. SSH to VPS
# 3. Pull latest code
# 4. Run docker-compose up
# 5. Run database migrations
```

### Manual Deployment (if GH Actions fails)

```bash
# On VPS, as root:
cd /var/www/mutabe3/current
git pull origin main

# Rebuild and restart services
docker-compose down
docker-compose up -d

# Run migrations
docker-compose exec backend npm run db:migrate
```

---

## Database

### Create/Reset Database

```bash
# On VPS, run migrations
docker-compose exec backend npm run db:migrate

# Seed database (test data)
docker-compose exec backend npm run db:seed
```

### Backup Database

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U mutabe3_user mutabe3 > /var/backups/mutabe3-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
docker-compose exec -T postgres psql -U mutabe3_user mutabe3 < /var/backups/mutabe3-backup.sql
```

---

## Services

### Start/Stop

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart frontend
docker-compose restart backend
docker-compose restart postgres
```

### Health Checks

```bash
# Check if frontend is running
curl http://localhost:3100

# Check API health
curl http://localhost:8080/api/health

# Check database connectivity (from backend container)
docker-compose exec backend npm run db:health

# Check Redis
docker-compose exec redis redis-cli ping
```

---

## Nginx Configuration

### File Location
`/etc/nginx/conf.d/mutabe3.conf`

### Reload Nginx
```bash
nginx -t  # Test config
systemctl reload nginx
```

### View Access Logs
```bash
tail -f /var/log/nginx/mutabe3-access.log
tail -f /var/log/nginx/mutabe3-error.log
```

---

## Monitoring & Logs

### Container Logs
```bash
# Real-time logs for all services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
```

### System Logs
```bash
# VPS system journal
journalctl -u docker.service -f

# Check disk usage
df -h
```

---

## Database Access

### Connect to PostgreSQL

```bash
# From VPS command line
docker-compose exec postgres psql -U mutabe3_user -d mutabe3

# From local machine (if postgres exposed)
psql -h 72.62.132.138 -U mutabe3_user -d mutabe3
```

### View Database Schema
```bash
docker-compose exec postgres psql -U mutabe3_user -d mutabe3 -c "\dt"
```

---

## Troubleshooting

### Port 3100 Not Responding
```bash
# Check if container is running
docker ps | grep mutabe3-frontend

# Check if nginx is forwarding correctly
curl -H "Host: mutabe3-stage.jo" http://localhost/

# Check docker network
docker network inspect mutabe3-network
```

### Database Connection Errors
```bash
# Verify DATABASE_URL is set
docker-compose exec backend env | grep DATABASE_URL

# Test connection
docker-compose exec backend npm run db:health
```

### Out of Disk Space
```bash
# Check usage
df -h

# Clean up Docker (be careful)
docker system prune -a

# Check container sizes
docker ps -s
```

---

## Emergency Procedures

### Full Rebuild
```bash
# Stop everything
docker-compose down -v

# Remove all data (WARNING: data loss)
rm -rf /var/lib/docker/volumes/mutabe3-*

# Rebuild from scratch
docker-compose up -d
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
```

### Rollback to Previous Commit
```bash
git log --oneline -10  # Find previous commit hash
git reset --hard <commit-hash>
docker-compose down
docker-compose up -d
docker-compose exec backend npm run db:migrate
```

---

## Notes

- **Backups:** Set up automated daily backups in cron (see PLAN.md)
- **SSL/TLS:** Handled by nginx with Let's Encrypt (renewed automatically)
- **Secrets:** All sensitive values in environment variables (GitHub Actions secrets)
- **Monitoring:** Self-hosted logging (see ops/logging)

---

**Last updated:** 2026-09-12  
**Authority:** FORGE (Rami approves changes to this file)  
**Related:** FACTS.md · PLAN.md · github.com/ramsharef1/forge/blob/main/connectors/VPS-SSH.md
