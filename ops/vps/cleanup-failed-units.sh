#!/usr/bin/env bash
# Clear the three failed systemd units on the shared VPS (D-060). Idempotent; every changed file is backed up
# under /root/ops-backups/D-060-<ts>/ (never inside /etc/logrotate.d, which would read a copy as config);
# rollback commands are printed at the end. Nothing here touches mutabe3's own units.
# (no `| head` — pipefail/exit 141, D-048)
set -u
TS=$(date -u +%Y%m%d-%H%M%S); BK=/root/ops-backups/D-060-$TS; mkdir -p "$BK"; chmod 700 /root/ops-backups "$BK"
ROLLBACK=()
state() { printf '%-16s %s / %s\n' "$1" "$(systemctl is-active "$1" 2>/dev/null)" "$(systemctl show "$1" -p Result --value 2>/dev/null)"; }
echo "== before =="; for u in certbot-renew httpd logrotate; do state "$u"; done
echo "failed: $(systemctl list-units --state=failed --plain --no-legend | awk '{print $1}' | paste -sd' ' -)"

# ── 1. certbot: stop renewing a lineage whose domain no longer points here ─────────────────────────────
echo; echo "== 1. certbot =="
D=universitiesvoice.com; CONF=/etc/letsencrypt/renewal/$D.conf
MYIP=$(curl -s --max-time 5 -4 https://api.ipify.org || true)
IPS=$(getent ahostsv4 "$D" | awk '{print $1}' | sort -u | paste -sd' ' -)
EXPIRED=$(openssl x509 -checkend 0 -noout -in "/etc/letsencrypt/live/$D/cert.pem" >/dev/null 2>&1 && echo no || echo yes)
echo "$D → $IPS · this server $MYIP · expired: $EXPIRED"
if [ ! -f "$CONF" ]; then
  echo "renewal conf already disabled — nothing to do"
elif [ -n "$MYIP" ] && [ "$EXPIRED" = yes ] && ! printf ' %s ' "$IPS" | grep -qF " $MYIP "; then
  cp -a "$CONF" "$BK/"
  mv "$CONF" "$CONF.disabled-$(date -u +%Y%m%d)"
  echo "renewal disabled: $(ls /etc/letsencrypt/renewal/ | grep -F "$D")"
  ROLLBACK+=("mv /etc/letsencrypt/renewal/$D.conf.disabled-$(date -u +%Y%m%d) $CONF")
else
  echo "⚠️  guard not met (domain points here, not expired, or own IP unknown) — left alone"
fi
echo "-- certbot-renew.service once (nothing is due before 2026-10-30, so no challenge and no nginx reload) --"
systemctl start certbot-renew.service; echo "exit=$?"
state certbot-renew
journalctl -u certbot-renew -n 6 --no-pager -o cat 2>/dev/null | sed 's/^/  /'

# ── 2. httpd: Apache can never bind :80 beside nginx; stop the panel's daily start attempt from failing the unit ──
echo; echo "== 2. httpd =="
NG80=$(ss -ltnp 2>/dev/null | awk '$4 ~ /:80$/' | grep -c nginx)
if [ "$(systemctl is-enabled httpd 2>/dev/null)" = masked ]; then
  echo "already masked"
elif [ "$NG80" -ge 1 ] && [ "$(systemctl is-active httpd)" != active ] && [ ! -e /etc/systemd/system/httpd.service ]; then
  systemctl mask httpd.service && ROLLBACK+=("systemctl unmask httpd.service")
else
  echo "⚠️  guard not met (nginx not on :80, httpd active, or a unit file override exists) — left alone"
fi
systemctl reset-failed httpd.service 2>/dev/null || true
echo "httpd: enabled=$(systemctl is-enabled httpd 2>/dev/null) active=$(systemctl is-active httpd 2>/dev/null) result=$(systemctl show httpd -p Result --value)"

# ── 3. logrotate: the okath stanza needs `su` (its log directory is group-writable) ───────────────────
echo; echo "== 3. logrotate =="
LR=/etc/logrotate.d/okath; LOGDIR=/var/www/okath/current/storage/logs
if grep -qE '^\s*su\s' "$LR"; then
  echo "okath stanza already has su: $(grep -E '^\s*su\s' "$LR" | xargs)"
else
  OWN=$(stat -c '%U %G' "$LOGDIR")
  cp -a "$LR" "$BK/okath.logrotate"
  sed -i -E "/^\s*create\s/a\\    su $OWN" "$LR"
  grep -qE "^\s*su $OWN$" "$LR" || { echo "❌ edit did not apply — restoring"; cp -a "$BK/okath.logrotate" "$LR"; }
  ROLLBACK+=("cp -a $BK/okath.logrotate $LR")
fi
# 3b. The stanza's `create 0640` never took effect before (rotation was always skipped), so okath has been running
# with a group-writable 0664 log. Keep the mode it actually ran with, or a group-nginx writer would lose its log.
PREV=$(ls -t "$LOGDIR"/laravel.log-* 2>/dev/null | sed -n 1p)
if [ -n "$PREV" ] && [ "$(stat -c %a "$PREV")" = 664 ] && grep -qE '^\s*create 0640 ' "$LR"; then
  [ -f "$BK/okath.logrotate" ] || cp -a "$LR" "$BK/okath.logrotate"
  sed -i -E 's/^(\s*create )0640 /\10664 /' "$LR"
  echo "create mode 0640 → 0664 (the mode okath ran with: $(basename "$PREV") is $(stat -c %a "$PREV"))"
  [ "$(stat -c %a "$LOGDIR/laravel.log" 2>/dev/null)" = 640 ] && chmod 0664 "$LOGDIR/laravel.log" && echo "laravel.log chmod 0664"
fi
echo "-- writers of okath's log (php-fpm okath pool, artisan workers) --"
ps -eo user:16,group:10,args 2>/dev/null | grep -E 'php-fpm: pool okath|artisan (queue|horizon|schedule)' | grep -v grep | awk '{print $1, $2, $3, $4, $5}' | sort | uniq -c
cat "$LR" | sed 's/^/  /'
logrotate -d /etc/logrotate.conf >"$BK/logrotate-d.txt" 2>&1; rc=$?
echo "logrotate -d exit=$rc · errors: $(grep -c '^error:' "$BK/logrotate-d.txt")"
grep '^error:' "$BK/logrotate-d.txt" | sed 's/^/  /'
if [ "$rc" != 0 ] && [ -f "$BK/okath.logrotate" ]; then
  echo "❌ dry run still fails — restoring the okath stanza"; cp -a "$BK/okath.logrotate" "$LR"
else
  echo "-- logrotate.service once (rotates only what is due; same work as the 00:34 run) --"
  systemctl reset-failed logrotate.service 2>/dev/null || true
  systemctl start logrotate.service; echo "exit=$?"
fi
state logrotate
ls -la "$LOGDIR" | sed 's/^/  /'

# ── after ─────────────────────────────────────────────────────────────────────────────────────────────
echo; echo "== after =="; for u in certbot-renew httpd logrotate; do state "$u"; done
F=$(systemctl list-units --state=failed --plain --no-legend | awk '{print $1}' | paste -sd' ' -)
echo "failed units: ${F:-none}"
nginx -t 2>&1 | sed 's/^/  /'
echo "mutabe3: backend $(curl -s -o /dev/null -m 10 -w '%{http_code}' localhost:9080/api/health) · frontend $(curl -s -o /dev/null -m 20 -w '%{http_code}' localhost:9100/)"
echo; echo "== rollback (backups in $BK) =="
if [ ${#ROLLBACK[@]} -eq 0 ]; then echo "nothing changed in this run"; else printf '  %s\n' "${ROLLBACK[@]}"; fi
