#!/usr/bin/env bash
# Apply the pending security updates on the shared VPS (D-061): the same scope dnf-automatic installs every
# morning (`upgrade --security`), restart only services that run on replaced files (known-safe ones), verify,
# and print the rollback. Never reboots — that is a separate decision (all sites go down for a minute or two).
# (no `| head` — pipefail/exit 141, D-048)
set -u
last_id() { dnf history list 2>/dev/null | awk -F'|' 'NR>2 {gsub(/ /, "", $1); print $1; exit}'; }
BEFORE=$(last_id)

echo "== 1. transaction =="
dnf -y upgrade --security > /tmp/d061-dnf.txt 2>&1; rc=$?
grep -vE '^(Last metadata)' /tmp/d061-dnf.txt | sed -n '1,60p'; rm -f /tmp/d061-dnf.txt
echo "dnf exit=$rc"
AFTER=$(last_id)
if [ -n "$AFTER" ] && [ "$AFTER" != "$BEFORE" ]; then
  echo "transaction id $AFTER"
  dnf history info "$AFTER" 2>/dev/null | grep -E '^\s+(Upgrade|Upgraded|Install|Erase)' | sed -n '1,30p'
else
  echo "no new transaction (nothing to do)"
fi

echo; echo "== 2. still pending =="
dnf -q check-update --security >/tmp/d061-cu.txt 2>/dev/null; cu=$?
if [ "$cu" = 0 ]; then echo "no security package left to upgrade"; else awk 'NF==3' /tmp/d061-cu.txt; fi; rm -f /tmp/d061-cu.txt
dnf -q updateinfo list --security 2>&1 | grep -E '^Security:' || true

echo; echo "== 3. services running on replaced files =="
SVC=$(dnf needs-restarting -s 2>/dev/null | sed 's/\.service$//' | sort -u)
if [ -z "$SVC" ]; then
  echo "none — no restart needed"
else
  for s in $SVC; do
    case "$s" in
      nginx)                  nginx -t >/dev/null 2>&1 && systemctl restart nginx && echo "restarted nginx" || echo "⚠️  nginx -t failed — not restarted" ;;
      php-fpm|php*-php-fpm)   systemctl reload "$s" && echo "reloaded $s" ;;
      mutabe3-backend|mutabe3-frontend|crond|chronyd|rsyslog|fail2ban|gssproxy|auditd) systemctl restart "$s" && echo "restarted $s" ;;
      *)                      echo "left for the next reboot: $s" ;;
    esac
  done
fi
echo "-- reboot --"; dnf needs-restarting -r 2>&1 | sed -n '1,4p'

echo; echo "== 4. verify =="
F=$(systemctl list-units --state=failed --plain --no-legend | awk '{print $1}' | paste -sd' ' -)
echo "failed units: ${F:-none}"
nginx -t 2>&1 | grep -E 'successful|failed|emerg' | sed 's/^/  /'
echo "mutabe3: backend $(curl -s -o /dev/null -m 10 -w '%{http_code}' localhost:9080/api/health) · frontend $(curl -s -o /dev/null -m 20 -w '%{http_code}' localhost:9100/)"
echo "httpd: $(systemctl is-enabled httpd 2>/dev/null) · $(rpm -q httpd) · vim-minimal: $(rpm -q vim-minimal)"

echo; echo "== rollback =="
if [ -n "$AFTER" ] && [ "$AFTER" != "$BEFORE" ]; then echo "  dnf -y history undo $AFTER"; else echo "  nothing changed"; fi
