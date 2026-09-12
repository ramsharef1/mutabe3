# Strapi CMS Setup for mutabe3

**Strapi** is a headless CMS that provides:
- Article management dashboard
- Media library (images, videos)
- User roles & permissions
- Content scheduling
- REST API for frontend
- Admin panel at http://localhost:1337/admin

---

## Installation on VPS

### Step 1: Install Node.js & npm (if not done)
```bash
ssh root@72.62.132.138
node --version  # Should be 18+
npm --version
```

### Step 2: Create Strapi database
```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE mutabe3_strapi OWNER mutabe3_user;
EOF
```

### Step 3: Install Strapi globally
```bash
npm install -g strapi@latest
```

### Step 4: Create Strapi project
```bash
cd /var/www/mutabe3/current/projects/mutabe3/packages/backend

strapi new strapi-app --quickstart
# This will:
# - Create strapi-app/ directory
# - Install Strapi + dependencies
# - Set up SQLite locally (we'll change to PostgreSQL)
```

### Step 5: Configure PostgreSQL
Edit `strapi-app/.env`:
```env
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=mutabe3_strapi
DATABASE_USERNAME=mutabe3_user
DATABASE_PASSWORD=mutabe3_secure_pass
JWT_SECRET=strapi_jwt_secret_key_2024
ADMIN_JWT_SECRET=strapi_admin_secret_key_2024
API_TOKEN_SALT=strapi_api_token_salt_2024
NODE_ENV=production
```

### Step 6: Build & Start
```bash
cd strapi-app
npm run build
npm start
```

### Step 7: Access Admin Panel
```
http://localhost:1337/admin
```

Create first admin user when prompted.

---

## Via Systemd (Production)

Create `/etc/systemd/system/mutabe3-strapi.service`:

```ini
[Unit]
Description=mutabe3 Strapi CMS
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/mutabe3/current/projects/mutabe3/packages/backend/strapi-app
Environment="DATABASE_CLIENT=postgres"
Environment="DATABASE_HOST=localhost"
Environment="DATABASE_PORT=5432"
Environment="DATABASE_NAME=mutabe3_strapi"
Environment="DATABASE_USERNAME=mutabe3_user"
Environment="DATABASE_PASSWORD=mutabe3_secure_pass"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
systemctl daemon-reload
systemctl enable mutabe3-strapi
systemctl start mutabe3-strapi
```

---

## API Endpoints

Once running, Strapi provides REST API:

```
GET    /api/articles              # List articles
GET    /api/articles/:id          # Single article
POST   /api/articles              # Create article (auth required)
PUT    /api/articles/:id          # Update article
DELETE /api/articles/:id          # Delete article

GET    /api/categories            # List categories
GET    /api/auth/local/register   # User registration
POST   /api/auth/local            # User login
```

---

## Content Types to Create

In Strapi Admin:

### 1. **Article**
- title (String, required)
- slug (String, unique)
- content (Rich text)
- summary (String)
- featured_image (Media)
- author (Relation to User)
- category (Relation to Category)
- status (Enum: draft, published, archived)
- published_at (DateTime)
- view_count (Number)

### 2. **Category**
- name (String, required, unique)
- slug (String, unique)
- description (Text)
- image (Media)
- display_order (Number)

### 3. **Comment**
- content (Text)
- author (String)
- email (Email)
- article (Relation to Article)
- status (Enum: pending, approved, rejected)
- published_at (DateTime)

---

## Frontend Integration

In Next.js, fetch articles from Strapi:

```typescript
async function getArticles() {
  const res = await fetch('http://localhost:1337/api/articles');
  return res.json();
}
```

Or via frontend proxy (if using Vercel):
```typescript
const res = await fetch('/api/articles');  // Proxied to VPS backend
```

---

## Nginx Configuration

Add to `/etc/nginx/conf.d/mutabe3.conf`:

```nginx
location /cms {
    proxy_pass http://localhost:1337/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Access at: `https://mutabe3.jo/cms/admin`

---

## Troubleshooting

### Port 1337 already in use
```bash
lsof -i :1337
kill -9 <PID>
```

### Database connection error
```bash
psql -U mutabe3_user -d mutabe3_strapi -h localhost -c "SELECT 1"
```

### Build fails
```bash
cd strapi-app
rm -rf node_modules .cache
npm install
npm run build
```

---

**Status:** Ready for installation  
**Next:** Run Strapi setup on VPS
