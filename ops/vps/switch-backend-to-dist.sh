#!/usr/bin/env bash
# Start mutabe3-backend from the compiled build (node dist/index.js) instead of `npx tsx watch src/index.ts` (D-049).
# Needs packages/backend/dist/index.js on the box — the deploy builds it (npm run build --workspace=packages/backend).
# Idempotent; health-checked; rolls the drop-in back if the service does not come up.
set -euo pipefail
APP=/var/www/mutabe3/current/projects/mutabe3
DIST="$APP/packages/backend/dist/index.js"
DROPIN=/etc/systemd/system/mutabe3-backend.service.d/20-exec-dist.conf
NODE=$(command -v node)

echo "== preconditions =="
test -f "$DIST" || { echo "❌ $DIST missing — run a deploy first (it builds the backend)"; exit 1; }
echo "dist: $(stat -c '%y %U' "$DIST") · node: $NODE ($($NODE -v))"
echo "before: $(systemctl show -p ExecStart --value mutabe3-backend | sed -E 's/^\{ path=([^;]*); argv\[\]=([^;]*);.*/\2/')"

echo "== drop-in =="
mkdir -p "$(dirname "$DROPIN")"
cat > "$DROPIN" <<EOF
# mutabe3 D-049 — run the compiled backend; the deploy rebuilds dist/ and restarts the unit.
# Managed by ops/vps/switch-backend-to-dist.sh. Remove this file + daemon-reload to go back to tsx watch.
[Service]
ExecStart=
ExecStart=$NODE dist/index.js
EOF
systemctl daemon-reload

rollback() {
  echo "❌ backend did not become healthy on dist/ — restoring tsx start"
  journalctl -u mutabe3-backend -n 25 --no-pager -o cat | sed -E 's/((PASSWORD|SECRET|DATABASE_URL|TOKEN)[A-Z_]*=)[^ ]*/\1***/Ig' || true
  rm -f "$DROPIN"; systemctl daemon-reload; systemctl restart mutabe3-backend; sleep 5
  curl -fsS -o /dev/null localhost:9080/api/health && echo "rolled back — backend healthy again on tsx"
  exit 1
}
echo "== restart + verify =="
systemctl restart mutabe3-backend
ok=0; for i in $(seq 1 10); do curl -fsS -o /dev/null localhost:9080/api/health && { ok=1; echo "healthy after $i tries"; break; }; sleep 3; done
[ "$ok" = 1 ] || rollback
pid=$(systemctl show -p MainPID --value mutabe3-backend)
echo "after: $(systemctl show -p ExecStart --value mutabe3-backend | sed -E 's/^\{ path=([^;]*); argv\[\]=([^;]*);.*/\2/') · pid $pid runs as $(ps -o user= -p "$pid") · cmd: $(ps -o args= -p "$pid" | cut -c1-80)"
curl -fsS -o /dev/null -w 'articles %{http_code}\n' 'localhost:9080/api/articles?take=1'
curl -s -o /dev/null -w 'img route (bad width) %{http_code}\n' localhost:9080/api/img/999/2026/10/none.webp
echo "✅ backend runs from dist/"
