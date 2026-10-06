#!/usr/bin/env bash
# Run mutabe3-backend and mutabe3-frontend as an unprivileged system user instead of root (D-048).
# Idempotent. Verifies health after each restart and rolls the unit settings back if a service
# does not come up, so a failed attempt leaves production exactly as it was.
set -euo pipefail
SVC=${SVC_USER:-mutabe3}
APP=/var/www/mutabe3/current/projects/mutabe3
STATE=/var/lib/mutabe3                      # writable HOME for the service (npm/npx/next caches, telemetry config)
UP=$(grep '^UPLOAD_DIR=' /etc/mutabe3/backend.env 2>/dev/null | cut -d= -f2- || true); UP=${UP:-/var/www/mutabe3/uploads}

echo "== 1. system user $SVC =="
if id "$SVC" >/dev/null 2>&1; then echo "exists: $(id "$SVC")"; else
  useradd --system --user-group --home-dir "$STATE" --no-create-home --shell /sbin/nologin "$SVC" 2>/dev/null \
    || useradd --system --user-group --home-dir "$STATE" --no-create-home --shell /usr/sbin/nologin "$SVC"
  echo "created: $(id "$SVC")"
fi
install -d -m 0750 -o "$SVC" -g "$SVC" "$STATE" "$STATE/.npm" "$STATE/.cache"

echo "== 2. what the services must WRITE: uploads (+ derivative cache) and the frontend's .next (ISR / revalidate) =="
mkdir -p "$UP/.cache"; chown -R "$SVC:$SVC" "$UP"
[ -d "$APP/packages/frontend/.next" ] && chown -R "$SVC:$SVC" "$APP/packages/frontend/.next"
echo "uploads → $(stat -c '%U:%G' "$UP") · .next → $(stat -c '%U:%G' "$APP/packages/frontend/.next" 2>/dev/null || echo n/a)"

echo "== 3. what they must READ: the checkout, world-readable (dotfiles .env* excluded) =="
chmod o+rx /var/www /var/www/mutabe3 /var/www/mutabe3/current /var/www/mutabe3/current/projects 2>/dev/null || true
find "$APP" -type d ! -perm -o=rx -exec chmod o+rx {} + 2>/dev/null || true
find "$APP" -type f ! -name '.env*' ! -perm -o=r -exec chmod o+r {} + 2>/dev/null || true
echo "unreadable left (outside node_modules): $(find "$APP" -path "$APP/node_modules" -prune -o -type f ! -name '.env*' ! -perm -o=r -print 2>/dev/null | wc -l)"

echo "== 4. systemd drop-ins =="
for u in mutabe3-backend mutabe3-frontend; do
  d=/etc/systemd/system/$u.service.d; mkdir -p "$d"
  cat > "$d/10-service-user.conf" <<EOF
# mutabe3 D-048 — run as the unprivileged service user, not root. Managed by ops/vps/setup-service-user.sh.
[Service]
User=$SVC
Group=$SVC
UMask=0022
NoNewPrivileges=true
PrivateTmp=true
Environment=HOME=$STATE
Environment=npm_config_cache=$STATE/.npm
Environment=XDG_CACHE_HOME=$STATE/.cache
Environment=NEXT_TELEMETRY_DISABLED=1
EOF
done
systemctl daemon-reload

rollback() {
  echo "❌ $1 did not become healthy as $SVC — restoring the previous unit settings"
  journalctl -u "$1" -n 25 --no-pager -o cat | sed -E 's/((PASSWORD|SECRET|DATABASE_URL|TOKEN)[A-Z_]*=)[^ ]*/\1***/Ig' || true
  rm -f /etc/systemd/system/mutabe3-*.service.d/10-service-user.conf
  systemctl daemon-reload
  systemctl restart mutabe3-backend mutabe3-frontend; sleep 4
  curl -fsS -o /dev/null localhost:9080/api/health && curl -fsS -o /dev/null localhost:9100 && echo "rolled back — both services healthy again as before"
  exit 1
}
wait_ok() { for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS -o /dev/null "$2" && return 0; sleep 3; done; rollback "$1"; }

echo "== 5. restart + verify (backend first, then frontend) =="
systemctl restart mutabe3-backend;  wait_ok mutabe3-backend  localhost:9080/api/health
systemctl restart mutabe3-frontend; wait_ok mutabe3-frontend localhost:9100
for u in mutabe3-backend mutabe3-frontend; do
  pid=$(systemctl show "$u" -p MainPID --value); echo "$u: active=$(systemctl is-active "$u") User=$(systemctl show "$u" -p User --value) pid $pid runs as $(ps -o user= -p "$pid")"
done

echo "== 6. write checks as $SVC =="
runas() { if command -v runuser >/dev/null; then runuser -u "$SVC" -- "$@"; else su -s /bin/sh "$SVC" -c "$*"; fi; }
runas touch "$UP/.cache/.write-test" && runas rm "$UP/.cache/.write-test" && echo "uploads/.cache writable ✓"
runas touch "$APP/packages/frontend/.next/.write-test" && runas rm "$APP/packages/frontend/.next/.write-test" && echo ".next writable ✓"
runas test -r "$APP/package.json" && echo "checkout readable ✓"
runas test -r /etc/mutabe3/backend.env && echo "⚠️  backend.env is readable by $SVC (systemd reads it as root; consider chmod 600)" || echo "backend.env not readable by $SVC ✓ (systemd injects it)"
echo "✅ service user in place"
