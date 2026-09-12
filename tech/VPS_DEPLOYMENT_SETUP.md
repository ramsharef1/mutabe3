# VPS Deployment Setup for mutabe3

**Target VPS:** 72.62.132.138 (srv1772644.hstgr.cloud)  
**Port:** 3100  
**OS:** AlmaLinux + AdminBolt  
**SSH:** `ssh -i ~/.ssh/id_ed25519 root@72.62.132.138`

---

## Prerequisites

1. **SSH Access:** Key-based auth configured (`~/.ssh/id_ed25519`)
2. **GitHub Secrets:** Added to repository (see step 7)
3. **Docker on VPS:** Must be installed (see step 1)
4. **nginx on VPS:** Must be installed (see step 2)

---

## Manual Setup (One-time, on VPS)

### Step 1: Install Docker & Docker Compose

```bash
# SSH into VPS
ssh -i ~/.ssh/id_ed25519 root@72.62.132.138

# Install Docker (if not installed)
sudo curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Set Up Project Directory

```bash
# Create project directory
sudo mkdir -p /var/www/mutabe3
cd /var/www/mutabe3

# Clone repository
sudo git clone https://github.com/ramsharef1/forge.git current
cd current/projects/mutabe3

# Verify docker-compose.yml exists
ls -la docker-compose.yml
```

### Step 3: Create Environment File on VPS

```bash
# Create .env file with production values
sudo tee .env > /dev/null << 'EOF'
# Database (use VPS postgres)
DATABASE_URL=postgresql://mutabe3_user:SECURE_PASSWORD_HERE@postgres:5432/mutabe3

# Redis
REDIS_URL=redis://redis:6379

# API & Auth
JWT_SECRET=GENERATE_SECURE_KEY_HERE

# CMS
STRAPI_URL=http://strapi:1337
STRAPI_API_TOKEN=GENERATE_TOKEN_HERE

# Frontend
NEXT_PUBLIC_API_URL=https://mutabe3-stage.jo/api
NEXT_PUBLIC_STRAPI_URL=https://mutabe3-stage.jo/api/content

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENV=production

# Logging
LOG_LEVEL=info
EOF

# Secure permissions
sudo chmod 600 .env
```

### Step 4: Install nginx Configuration

```bash
# Copy nginx config
sudo cp connectors/mutabe3.conf /etc/nginx/conf.d/mutabe3.conf

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 5: Set Up Let's Encrypt SSL (if domains are ready)

```bash
# Install certbot (if not installed)
sudo yum install -y certbot python3-certbot-nginx

# Get certificate for staging domain
sudo certbot certonly --nginx \
  -d mutabe3-stage.jo \
  -d www.mutabe3-stage.jo \
  --email admin@mutabe3.jo

# Get certificate for production domain (optional now)
sudo certbot certonly --nginx \
  -d mutabe3.jo \
  -d www.mutabe3.jo \
  --email admin@mutabe3.jo

# Auto-renewal should be configured automatically
sudo systemctl enable certbot.timer
```

### Step 6: Start Services

```bash
# Navigate to project directory
cd /var/www/mutabe3/current/projects/mutabe3

# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 7: Initialize Database

```bash
# Wait for services to start (10-15 seconds)
sleep 15

# Run migrations
docker-compose exec backend npm run db:migrate

# Seed database (optional)
docker-compose exec backend npm run db:seed

# Check database
docker-compose exec postgres psql -U mutabe3_user -d mutabe3 -c "\dt"
```

---

## GitHub Actions Setup

### Add Repository Secrets

In GitHub repository → Settings → Secrets and variables → Actions, add:

| Secret Name | Value | How to Get |
|---|---|---|
| `VPS_HOST` | `72.62.132.138` | From FACTS.md |
| `VPS_USER` | `root` | SSH user |
| `VPS_PORT` | `22` | SSH port (default) |
| `VPS_SSH_KEY` | `(contents of ~/.ssh/id_ed25519)` | Output of `cat ~/.ssh/id_ed25519` |

**To add SSH key:**

```bash
# On your local machine, output the private key
cat ~/.ssh/id_ed25519
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`), then:

1. Go to GitHub → mutabe3 repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `VPS_SSH_KEY`
4. Value: Paste the entire key content
5. Click "Add secret"

Repeat for `VPS_HOST` and `VPS_USER`.

---

## Automated Deployment (After GitHub Actions Setup)

Once GitHub Actions secrets are configured, deployment is automatic:

```bash
# On your local machine, make a commit and push
git add -A
git commit -m "feat: update configuration"
git push origin main

# GitHub Actions will:
# 1. Build Docker images
# 2. SSH to VPS
# 3. Pull latest code
# 4. Run docker-compose up
# 5. Run database migrations
# 6. Verify deployment

# View deployment progress in GitHub → Actions tab
```

---

## Troubleshooting

### Services Not Starting

```bash
# SSH to VPS
ssh -i ~/.ssh/id_ed25519 root@72.62.132.138

# Check Docker daemon
systemctl status docker

# Start Docker if stopped
systemctl start docker

# View detailed logs
docker-compose logs
```

### Database Connection Error

```bash
# Test PostgreSQL connection
docker-compose exec backend psql $DATABASE_URL -c "SELECT 1"

# Check if postgres service is healthy
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres
```

### Port Already in Use

```bash
# Check what's using port 3100
netstat -tlnp | grep 3100

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml and nginx config
```

### nginx 502 Bad Gateway

```bash
# Verify frontend container is running
docker-compose ps frontend

# Check if it's listening on port 3000
docker-compose exec frontend netstat -tlnp | grep 3000

# Test direct connection
curl http://localhost:3000

# Check nginx error log
tail -f /var/log/nginx/mutabe3-error.log
```

### SSL Certificate Issues

```bash
# Check certificate expiration
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check Let's Encrypt auto-renewal
sudo systemctl status certbot.timer
```

---

## Monitoring & Maintenance

### Regular Backups

```bash
# Backup database daily (add to crontab)
0 2 * * * docker-compose exec postgres pg_dump -U mutabe3_user mutabe3 > /var/backups/mutabe3-$(date +\%Y\%m\%d).sql

# Check backup status
ls -lh /var/backups/mutabe3-*.sql
```

### Update Services

```bash
# Pull latest code
cd /var/www/mutabe3/current/projects/mutabe3
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Run migrations if schema changed
docker-compose exec backend npm run db:migrate
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Follow nginx access log
tail -f /var/log/nginx/mutabe3-access.log
```

---

## Security Notes

- ✅ SSH key-based authentication (no passwords)
- ✅ SSL/TLS with Let's Encrypt (automatic renewal)
- ✅ Environment variables for secrets (not in code)
- ✅ Docker network isolation
- ✅ nginx security headers configured

### Hardening (Post-MVP)

- [ ] Set up firewall rules (only allow HTTP/HTTPS/SSH)
- [ ] Enable fail2ban for SSH protection
- [ ] Regular security updates
- [ ] Monitor disk space (alerts)
- [ ] Set up log rotation
- [ ] Configure rate limiting in nginx
- [ ] Enable CORS properly
- [ ] Set up Web Application Firewall (WAF)

---

## Emergency Procedures

### Rollback to Previous Version

```bash
# Find previous commit
git log --oneline -10

# Rollback
git reset --hard <commit-hash>

# Restart services
docker-compose down
docker-compose up -d
docker-compose exec backend npm run db:migrate
```

### Full Database Reset (⚠️ WARNING: DATA LOSS)

```bash
# Stop services
docker-compose down -v

# Remove data volumes
docker volume rm mutabe3_postgres_data mutabe3_redis_data

# Start fresh
docker-compose up -d
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
```

---

**Last updated:** 2026-09-12  
**Author:** FORGE Session 1  
**Status:** Ready for deployment
