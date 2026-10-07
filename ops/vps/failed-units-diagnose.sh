#!/usr/bin/env bash
# Read-only diagnosis of the three failed units the monitor found (D-060): certbot-renew, httpd, logrotate.
# Changes nothing. Secret-looking values are masked. (no `| head` — pipefail/exit 141, D-048)
set -u
mask() { sed -E 's/((PASSWORD|SECRET|DATABASE_URL|TOKEN|KEY)[A-Z_]*=)[^ ]*/\1***/Ig'; }
MYIP=$(curl -s --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')

echo "== 1. certbot-renew =="
BAD=$(journalctl -u certbot-renew -n 60 --no-pager -o cat 2>/dev/null | grep -oE '/etc/letsencrypt/live/[^/]+/fullchain.pem \(failure\)' | sed -E 's#/etc/letsencrypt/live/([^/]+)/.*#\1#' | sort -u)
echo "failing lineage(s): ${BAD:-none}"
for d in $BAD; do
  echo "-- $d: DNS vs this server ($MYIP) --"
  getent ahostsv4 "$d" | awk '{print $1}' | sort -u | sed 's/^/  A /'
  getent ahostsv4 "www.$d" 2>/dev/null | awk '{print $1}' | sort -u | sed 's/^/  www A /'
  echo "-- renewal conf --"; sed -E 's/(account *= *).*/\1***/' "/etc/letsencrypt/renewal/$d.conf" 2>/dev/null
  echo "-- expiry --"; certbot certificates --cert-name "$d" 2>/dev/null | grep -E 'Domains|Expiry'
  echo "-- nginx references --"; grep -rn "$d" /etc/nginx/ 2>/dev/null | grep -vE '\.(bak|new|old)' | cut -c1-160
  echo "-- last failure reason (letsencrypt.log) --"
  grep -nE "Failed to renew|Challenge failed|Detail:|Type:|Problem binding|unauthorized|NXDOMAIN|Timeout|$d" /var/log/letsencrypt/letsencrypt.log 2>/dev/null | grep -A8 "$d" | tail -40 | cut -c1-220
done
echo "-- all lineages --"; certbot certificates 2>/dev/null | grep -E 'Certificate Name|Expiry' | paste - - | sed -E 's/ +/ /g'

echo; echo "== 2. httpd =="
echo "package: $(rpm -q httpd 2>/dev/null) · enabled: $(systemctl is-enabled httpd 2>/dev/null) · active: $(systemctl is-active httpd 2>/dev/null)"
systemctl show httpd -p ExecMainStartTimestamp,ExecMainExitTimestamp,ExecMainStatus,Result,NRestarts,TriggeredBy,WantedBy,RequiredBy,Conflicts 2>/dev/null
echo "-- config test --"; httpd -t 2>&1 | sed -n '1,8p'
echo "-- listeners on :80/:443 --"; ss -ltnp 2>/dev/null | awk '$4 ~ /:(80|443)$/ {print $4, $6}' | sed -E 's/users:\(\("([^"]+)".*/\1/' | sort -u
echo "-- apache Listen directives --"; grep -rhE '^\s*Listen' /etc/httpd/conf /etc/httpd/conf.d 2>/dev/null | sort -u
echo "-- who references httpd (cron, logrotate, panel) --"
grep -rlE 'httpd|apachectl' /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly /etc/crontab /var/spool/cron 2>/dev/null
grep -rn 'httpd' /etc/logrotate.d/httpd 2>/dev/null | cut -c1-140
systemctl list-units --all --plain --no-legend 2>/dev/null | grep -iE 'adminbolt|phyre|apache|httpd' | awk '{print $1, $3, $4}'
echo "-- journal (this boot) --"; journalctl -b -u httpd --no-pager -o short-iso 2>/dev/null | tail -12 | cut -c1-200
echo "-- error_log tail --"; tail -n 8 /var/log/httpd/error_log 2>/dev/null | cut -c1-200

echo; echo "== 3. logrotate =="
systemctl show logrotate -p ExecMainStartTimestamp,ExecMainExitTimestamp,ExecMainStatus,Result 2>/dev/null
echo "-- journal (this boot) --"; journalctl -b -u logrotate --no-pager -o short-iso 2>/dev/null | tail -12 | cut -c1-200
echo "-- dry run: errors only --"
logrotate -d /etc/logrotate.conf 2>&1 | grep -iE 'error|warning|skipping|cannot|not found|duplicate|unknown|refused|denied|bad|ignoring|insecure' | sort | uniq -c | sort -rn | sed -n '1,40p' | cut -c1-220
echo "-- configs --"; ls -1 /etc/logrotate.d/ 2>/dev/null | paste -sd' ' -
echo "-- status file --"; ls -la /var/lib/logrotate/ 2>/dev/null; sed -n '1,3p' /var/lib/logrotate/logrotate.status 2>/dev/null

echo; echo "== 4. journald (why 'No entries' earlier) =="
journalctl --disk-usage 2>/dev/null
grep -E '^\s*(Storage|SystemMaxUse|MaxRetentionSec|RuntimeMaxUse)=' /etc/systemd/journald.conf /etc/systemd/journald.conf.d/*.conf 2>/dev/null
ls -d /var/log/journal 2>/dev/null || echo "/var/log/journal absent → volatile journal (lost on reboot)"
echo; echo "diagnosis complete — nothing changed"
