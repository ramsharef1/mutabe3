#!/usr/bin/env bash
# Read-only survey of the VPS before changing service users or adding backups (D-048).
# Prints no secret values: unit files and env are masked.
set -u
APP=/var/www/mutabe3/current/projects/mutabe3
mask() { sed -E 's/((PASSWORD|SECRET|DATABASE_URL|TOKEN|KEY)[A-Z_]*=)[^ ]*/\1***/Ig'; }

echo "== os =="; . /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"; uname -r; echo "selinux: $(getenforce 2>/dev/null || echo n/a)"; echo "tz: $(timedatectl show -p Timezone --value 2>/dev/null || date +%Z)"
echo; echo "== node =="; command -v node; node -v; command -v npx || true

for u in mutabe3-backend mutabe3-frontend; do
  echo; echo "== unit $u =="
  systemctl cat "$u" 2>&1 | mask
  systemctl show "$u" -p User,Group,WorkingDirectory,EnvironmentFiles,ActiveState,SubState,MainPID,NRestarts 2>/dev/null | mask
  pid=$(systemctl show "$u" -p MainPID --value 2>/dev/null); [ -n "$pid" ] && [ "$pid" != 0 ] && echo "runs as: $(ps -o user=,comm= -p "$pid")"
done
echo; echo "== drop-ins =="; ls -la /etc/systemd/system/mutabe3-*.service.d 2>/dev/null || echo none

echo; echo "== paths (perm owner) =="
for p in /var/www /var/www/mutabe3 /var/www/mutabe3/current /var/www/mutabe3/current/projects "$APP" "$APP/packages/frontend/.next" "$APP/packages/frontend/.next/standalone" "$APP/node_modules" /var/www/mutabe3/uploads /var/www/mutabe3/uploads/.cache /etc/mutabe3 /etc/mutabe3/backend.env /var/backups /var/lib/mutabe3; do
  stat -c '%A %U:%G %n' "$p" 2>/dev/null || echo "missing   $p"
done
echo; echo "== files a non-root service could not read (outside node_modules) =="
find "$APP" -path "$APP/node_modules" -prune -o \( -type f ! -perm -o=r -print \) 2>/dev/null | head -10
find "$APP" -path "$APP/node_modules" -prune -o \( -type d ! -perm -o=rx -print \) 2>/dev/null | head -10
echo "node_modules files not world-readable: $(find "$APP/node_modules" -type f ! -perm -o=r 2>/dev/null | wc -l)"
echo "dotfiles in checkout root/packages: $(find "$APP" -maxdepth 3 -name '.env*' -not -path '*/node_modules/*' 2>/dev/null | tr '\n' ' ')"
echo "files written in the last day under the checkout (runtime writes?):"; find "$APP" -path "$APP/node_modules" -prune -o -path "$APP/packages/frontend/.next" -prune -o -type f -mtime -1 -print 2>/dev/null | head -10

echo; echo "== users =="; id mutabe3 2>&1; getent passwd | grep -i mutabe3 || true

echo; echo "== postgres =="
command -v pg_dump && pg_dump --version; command -v pg_restore >/dev/null && echo "pg_restore ok"
systemctl list-units --type=service --no-pager 2>/dev/null | grep -i postgres | head -3
( set -a; . /etc/mutabe3/backend.env 2>/dev/null; set +a
  psql "$DATABASE_URL" -Atc "select version(), pg_size_pretty(pg_database_size(current_database())), current_user" 2>&1 | cut -c1-160 )

echo; echo "== timers / cron =="
systemctl list-timers --all --no-pager 2>/dev/null | grep -iE 'mutabe3|backup|pg' || echo "no mutabe3/backup timers"
ls /etc/cron.d 2>/dev/null | tr '\n' ' '; echo; crontab -l 2>/dev/null | grep -v '^#' | head -5

echo; echo "== disk / ports =="
df -h / /var 2>/dev/null | awk 'NR==1||/\/$|\/var$/'
du -sh /var/www/mutabe3/uploads /var/backups 2>/dev/null
ss -ltnp 2>/dev/null | grep -E ':(9080|9100)\b' | sed -E 's/users:.*//'
echo; echo "== health =="; curl -fsS -o /dev/null -w 'backend %{http_code}\n' localhost:9080/api/health; curl -fsS -o /dev/null -w 'frontend %{http_code}\n' localhost:9100
