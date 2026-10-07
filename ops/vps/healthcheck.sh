#!/usr/bin/env bash
# Daily server facts for the monitor workflow (D-059). Prints `key=value` lines only — no secret values,
# no host names. ops/monitor/server.mjs reads them and decides what is an alert; this script decides nothing.
# Also runnable by hand: gh workflow run ops-vps.yml -f action=healthcheck
# (no `| head` anywhere: with pipefail an early-closing reader turns into exit 141 — D-048)
set -u
kv() { printf '%s=%s\n' "$1" "${2:-unknown}"; }
BK=/var/backups/mutabe3
UP=$(grep '^UPLOAD_DIR=' /etc/mutabe3/backend.env 2>/dev/null | cut -d= -f2-); UP=${UP:-/var/www/mutabe3/uploads}

kv now "$(date -u +%FT%TZ)"
kv uptime_days "$(awk '{printf "%.1f", $1/86400}' /proc/uptime 2>/dev/null)"
kv load1 "$(cut -d' ' -f1 /proc/loadavg 2>/dev/null)"
kv cpus "$(nproc 2>/dev/null)"

# Disk: the root filesystem plus whichever filesystems hold the uploads and the backups (often all the same one).
disk() { df -P "$2" 2>/dev/null | awk -v k="$1" 'NR==2{gsub("%","",$5); printf "disk_%s_pct=%s\ndisk_%s_free_gb=%.1f\ndisk_%s_mount=%s\n", k, $5, k, $4/1048576, k, $6}'; }
disk root /
disk uploads "$UP"
disk backups "$BK"
df -Pi / 2>/dev/null | awk 'NR==2{gsub("%","",$5); print "inode_root_pct=" $5}'
free -m 2>/dev/null | awk '/^Mem:/{print "mem_total_mb=" $2; print "mem_avail_mb=" $7} /^Swap:/{print "swap_used_mb=" $3}'

# Services (fixed keys; the Postgres unit name differs between installs).
PG=$(systemctl list-units --type=service --all --plain --no-legend 'postgresql*' 2>/dev/null | awk 'NR==1{print $1}')
kv unit_backend "$(systemctl is-active mutabe3-backend 2>/dev/null)"
kv unit_frontend "$(systemctl is-active mutabe3-frontend 2>/dev/null)"
kv unit_nginx "$(systemctl is-active nginx 2>/dev/null)"
kv unit_postgres "$( [ -n "$PG" ] && systemctl is-active "$PG" 2>/dev/null )"   # empty → unknown, never a false "inactive"
kv restarts_backend "$(systemctl show mutabe3-backend -p NRestarts --value 2>/dev/null)"
kv restarts_frontend "$(systemctl show mutabe3-frontend -p NRestarts --value 2>/dev/null)"
kv failed_units "$(systemctl list-units --state=failed --plain --no-legend 2>/dev/null | awk '{print $1}' | paste -sd, -)"
kv health_backend "$(curl -s -o /dev/null -m 10 -w '%{http_code}' http://localhost:9080/api/health 2>/dev/null)"
kv health_frontend "$(curl -s -o /dev/null -m 20 -w '%{http_code}' http://localhost:9100/ 2>/dev/null)"
kv backend_err_24h "$(journalctl -u mutabe3-backend --since -24h --no-pager -o cat 2>/dev/null | grep -ci 'error')"

# Backups (D-048): timer, last result, newest dump and whether it still restores.
kv backup_timer "$(systemctl is-active mutabe3-backup.timer 2>/dev/null)"
kv backup_next "$(systemctl show mutabe3-backup.timer -p NextElapseUSecRealtime --value 2>/dev/null)"
kv backup_last_run "$(systemctl show mutabe3-backup.service -p ExecMainExitTimestamp --value 2>/dev/null)"
kv backup_last_result "$(systemctl show mutabe3-backup.service -p Result --value 2>/dev/null)"
newest=$(ls -t "$BK"/db-*.dump 2>/dev/null | sed -n 1p)
if [ -n "$newest" ]; then
  kv dump_newest "$(basename "$newest")"
  kv dump_age_h "$(( ( $(date +%s) - $(stat -c %Y "$newest") ) / 3600 ))"
  kv dump_size_kb "$(( $(stat -c %s "$newest") / 1024 ))"
  if pg_restore --list "$newest" >/dev/null 2>&1; then kv dump_valid yes; else kv dump_valid no; fi
else
  kv dump_newest none; kv dump_age_h 9999; kv dump_size_kb 0; kv dump_valid no
fi
kv dump_count "$(ls -1 "$BK"/db-*.dump 2>/dev/null | wc -l | tr -d ' ')"
upn=$(ls -t "$BK"/uploads-*.tgz 2>/dev/null | sed -n 1p)
if [ -n "$upn" ]; then kv uploads_archive_age_d "$(( ( $(date +%s) - $(stat -c %Y "$upn") ) / 86400 ))"; else kv uploads_archive_age_d none; fi
kv backups_total "$(du -sh "$BK" 2>/dev/null | cut -f1)"
kv uploads_total "$(du -sh "$UP" 2>/dev/null | cut -f1)"

# Database and content growth (the URL is read, used, never printed; Prisma's `?schema=` suffix is not valid for psql).
DBURL=$(grep '^DATABASE_URL=' /etc/mutabe3/backend.env 2>/dev/null | cut -d= -f2- | tr -d '"'"'"); DBURL=${DBURL%%\?*}
if [ -n "$DBURL" ] && command -v psql >/dev/null 2>&1; then
  q() { psql "$DBURL" -Atc "$1" 2>/dev/null; }
  kv db_size_mb "$(q 'select round(pg_database_size(current_database())/1048576.0, 1)')"
  kv articles_published "$(q "select count(*) from \"Article\" where status = 'PUBLISHED'")"
  kv articles_7d "$(q "select count(*) from \"Article\" where status = 'PUBLISHED' and \"publishedAt\" > now() - interval '7 days'")"
fi

# OS hygiene (informational — this VPS is shared with other sites, so only the digest reports it).
if command -v needs-restarting >/dev/null 2>&1; then
  if needs-restarting -r >/dev/null 2>&1; then kv reboot_required no; else kv reboot_required yes; fi
fi
if sec=$(dnf -q -C updateinfo list --security 2>/dev/null); then kv security_updates "$(printf '%s\n' "$sec" | grep -c .)"; fi
