#!/usr/bin/env bash
# Install the daily backup: Postgres custom-format dump every night + uploads archive on Sundays,
# local rotation (14 daily dumps, 6 weekly archives), driven by a systemd timer (D-048). Idempotent.
# Backups stay on the VPS under /var/backups/mutabe3 (root-only). Off-site copies need storage Rami picks.
set -euo pipefail
BK=/var/backups/mutabe3
install -d -m 0700 -o root -g root "$BK"

echo "== 1. backup script =="
cat > /usr/local/bin/mutabe3-backup <<'EOF'
#!/usr/bin/env bash
# mutabe3 backup (D-048): DB dump nightly, uploads archive on Sundays or with --with-uploads. Rotates locally.
# Restore DB:  set -a; . /etc/mutabe3/backend.env; set +a; pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" /var/backups/mutabe3/db-<ts>.dump
# Restore uploads:  tar -xzf /var/backups/mutabe3/uploads-<ts>.tgz -C "$UPLOAD_DIR"
set -euo pipefail
BK=/var/backups/mutabe3; KEEP_DB_DAYS=${KEEP_DB_DAYS:-14}; KEEP_UP_WEEKS=${KEEP_UP_WEEKS:-6}
set -a; . /etc/mutabe3/backend.env; set +a
UP=${UPLOAD_DIR:-/var/www/mutabe3/uploads}
ts=$(date +%F_%H%M); umask 077; mkdir -p "$BK"
pg_dump --format=custom --no-owner --no-privileges --file="$BK/db-$ts.dump.tmp" "$DATABASE_URL"
pg_restore --list "$BK/db-$ts.dump.tmp" >/dev/null          # archive is valid before we keep it
mv "$BK/db-$ts.dump.tmp" "$BK/db-$ts.dump"
if [ "${1:-}" = "--with-uploads" ] || [ "$(date +%u)" = 7 ]; then
  if [ -d "$UP" ]; then
    tar --exclude='./.cache' -czf "$BK/uploads-$ts.tgz.tmp" -C "$UP" . && mv "$BK/uploads-$ts.tgz.tmp" "$BK/uploads-$ts.tgz"
  fi
fi
find "$BK" -name 'db-*.dump' -mtime +"$KEEP_DB_DAYS" -delete
find "$BK" -name 'uploads-*.tgz' -mtime +$((KEEP_UP_WEEKS * 7)) -delete
find "$BK" -name '*.tmp' -mmin +120 -delete
echo "mutabe3-backup ok · newest: $(ls -t "$BK" | head -1) ($(du -h "$BK/$(ls -t "$BK" | head -1)" | cut -f1)) · $(ls -1 "$BK" | wc -l) files, $(du -sh "$BK" | cut -f1) total"
EOF
chmod 0755 /usr/local/bin/mutabe3-backup

echo "== 2. systemd service + timer =="
cat > /etc/systemd/system/mutabe3-backup.service <<'EOF'
[Unit]
Description=mutabe3 database + uploads backup (D-048)
After=network.target
[Service]
Type=oneshot
ExecStart=/usr/local/bin/mutabe3-backup
Nice=10
IOSchedulingClass=idle
EOF
cat > /etc/systemd/system/mutabe3-backup.timer <<'EOF'
[Unit]
Description=Nightly mutabe3 backup — 00:30 UTC (03:30 Amman), D-048
[Timer]
OnCalendar=*-*-* 00:30:00 UTC
RandomizedDelaySec=10m
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now mutabe3-backup.timer
systemctl list-timers mutabe3-backup.timer --no-pager | head -2

echo "== 3. first backup now (with uploads) =="
/usr/local/bin/mutabe3-backup --with-uploads
ls -lh --time-style=long-iso "$BK" | awk 'NR>1{print $1, $3, $5, $6, $7, $8}'

echo "== 4. restore drill into a scratch database (proves the dump restores; dropped afterwards) =="
newest=$(ls -t "$BK"/db-*.dump | head -1)
DRILL=mutabe3_restore_drill
if runuser -u postgres -- psql -Atc 'select 1' >/dev/null 2>&1; then
  # local superuser via peer auth; the dump is root-only, so stream it in
  runuser -u postgres -- psql -q -c "drop database if exists $DRILL" -c "create database $DRILL"
  runuser -u postgres -- pg_restore --no-owner --no-privileges -d "$DRILL" < "$newest"
  q() { runuser -u postgres -- psql -d "$DRILL" -Atc "$1"; }
  echo "restored: $(q 'select count(*) from "Article"') articles, $(q 'select count(*) from "User"') users, $(q "select count(*) from information_schema.tables where table_schema='public'") tables"
  runuser -u postgres -- psql -q -c "drop database $DRILL"
  echo "scratch database dropped ✓"
else
  echo "⚠️  no local postgres superuser via peer auth — skipped the restore drill (pg_restore --list already validated the archive)"
fi

echo "== 5. other backup jobs on this VPS (for the record) =="
for f in /etc/cron.d/vps-backup; do [ -f "$f" ] && { echo "--- $f ---"; grep -v '^#' "$f" | grep -v '^\s*$' | sed -E 's/((PASSWORD|SECRET|TOKEN|KEY)[A-Z_]*=)[^ ]*/\1***/Ig'; }; done
echo "✅ backups installed: nightly 00:30 UTC, 14 daily dumps + 6 weekly uploads archives kept in $BK (on this VPS only)"
