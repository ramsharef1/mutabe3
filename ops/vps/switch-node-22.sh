#!/usr/bin/env bash
# Move mutabe3's two units to Node 22 LTS without touching the VPS's shared global node (D-055 / SECURITY S-01, TECH-STACK).
# Installs the official tarball under /opt/node22 (SHA-256 verified), points both units at it via drop-ins,
# restarts with health checks and rolls back if either service does not come up. Idempotent.
set -euo pipefail
NODE_VER=${NODE_VER:-22.22.0}
PREFIX=/opt/node22
ARCH=$(uname -m); case "$ARCH" in x86_64) NARCH=x64 ;; aarch64) NARCH=arm64 ;; *) echo "unsupported arch $ARCH"; exit 1 ;; esac
TARBALL="node-v${NODE_VER}-linux-${NARCH}.tar.xz"
BASE="https://nodejs.org/dist/v${NODE_VER}"

echo "== current =="
echo "global node: $(command -v node) $(node -v) · units run as: $(systemctl show -p User --value mutabe3-backend)"
for u in mutabe3-backend mutabe3-frontend; do echo "$u ExecStart: $(systemctl show -p ExecStart --value "$u" | sed -E 's/^\{ path=([^;]*); argv\[\]=([^;]*);.*/\2/')"; done

echo "== 1. install Node ${NODE_VER} under ${PREFIX} (if missing) =="
if [ -x "$PREFIX/bin/node" ] && [ "$("$PREFIX/bin/node" -v)" = "v${NODE_VER}" ]; then
  echo "already installed: $("$PREFIX/bin/node" -v)"
else
  TMP=$(mktemp -d); cd "$TMP"
  curl -fsSLO "$BASE/$TARBALL"; curl -fsSLO "$BASE/SHASUMS256.txt"
  grep " $TARBALL\$" SHASUMS256.txt | sha256sum -c - >/dev/null && echo "checksum ok"
  rm -rf "$PREFIX.new"; mkdir -p "$PREFIX.new"; tar -xJf "$TARBALL" -C "$PREFIX.new" --strip-components=1
  rm -rf "$PREFIX.old"; [ -d "$PREFIX" ] && mv "$PREFIX" "$PREFIX.old"; mv "$PREFIX.new" "$PREFIX"
  cd /; rm -rf "$TMP"
  echo "installed: $("$PREFIX/bin/node" -v) · npm $("$PREFIX/bin/npm" -v)"
fi

echo "== 2. drop-ins (PATH first so npm/npx resolve to Node 22 too) =="
for u in mutabe3-backend mutabe3-frontend; do
  d=/etc/systemd/system/$u.service.d; mkdir -p "$d"
  cat > "$d/30-node22.conf" <<EOF
# mutabe3 D-055 — run on Node ${NODE_VER} from ${PREFIX}; the VPS's global node is untouched. Managed by ops/vps/switch-node-22.sh.
[Service]
Environment=PATH=${PREFIX}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
EOF
done
# The backend's ExecStart names the node binary explicitly (D-049 drop-in) — repoint it.
cat > /etc/systemd/system/mutabe3-backend.service.d/20-exec-dist.conf <<EOF
# mutabe3 D-049/D-055 — compiled backend on Node ${NODE_VER}. Managed by ops/vps/switch-node-22.sh.
[Service]
ExecStart=
ExecStart=${PREFIX}/bin/node dist/index.js
EOF
# The frontend's ExecStart is /usr/bin/npm run start …; replace with the Node 22 npm so the runtime matches.
cat > /etc/systemd/system/mutabe3-frontend.service.d/20-exec-node22.conf <<EOF
# mutabe3 D-055 — next start on Node ${NODE_VER}. Managed by ops/vps/switch-node-22.sh.
[Service]
ExecStart=
ExecStart=${PREFIX}/bin/npm run start --workspace=packages/frontend -- --port 9100
EOF
systemctl daemon-reload

rollback() {
  echo "❌ $1 did not become healthy on Node ${NODE_VER} — restoring the previous unit settings"
  journalctl -u "$1" -n 25 --no-pager -o cat | sed -E 's/((PASSWORD|SECRET|DATABASE_URL|TOKEN)[A-Z_]*=)[^ ]*/\1***/Ig' || true
  rm -f /etc/systemd/system/mutabe3-*.service.d/30-node22.conf /etc/systemd/system/mutabe3-frontend.service.d/20-exec-node22.conf
  cat > /etc/systemd/system/mutabe3-backend.service.d/20-exec-dist.conf <<EOF
[Service]
ExecStart=
ExecStart=$(command -v node) dist/index.js
EOF
  systemctl daemon-reload; systemctl restart mutabe3-backend mutabe3-frontend; sleep 6
  curl -fsS -o /dev/null localhost:9080/api/health && curl -fsS -o /dev/null localhost:9100 && echo "rolled back — both healthy again on the global node"
  exit 1
}
wait_ok() { for i in $(seq 1 12); do curl -fsS -o /dev/null "$2" && { echo "$1 healthy after $i tries"; return 0; }; sleep 3; done; rollback "$1"; }

echo "== 3. restart + verify =="
systemctl restart mutabe3-backend;  wait_ok mutabe3-backend  localhost:9080/api/health
systemctl restart mutabe3-frontend; wait_ok mutabe3-frontend localhost:9100
for u in mutabe3-backend mutabe3-frontend; do
  pid=$(systemctl show -p MainPID --value "$u")
  echo "$u: pid $pid · $(ps -o user= -p "$pid") · $(cat /proc/$pid/exe >/dev/null 2>&1; readlink -f /proc/$pid/exe) · node $(cat /proc/$pid/environ 2>/dev/null | tr '\0' '\n' | grep '^PATH=' | cut -c1-40)…"
done
curl -fsS -o /dev/null -w 'articles %{http_code}\n' 'localhost:9080/api/articles?take=1'
curl -s -o /dev/null -w 'img route %{http_code}\n' localhost:9080/api/img/999/2026/10/none.webp
echo "✅ both units on Node ${NODE_VER} (${PREFIX}); the global node stays $(node -v) for the other sites"
