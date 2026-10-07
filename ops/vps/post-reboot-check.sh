#!/usr/bin/env bash
# After reboot.sh (D-062): new kernel running? every service that ran before running again? anything failed?
# Read-only. (no `| head` — pipefail/exit 141, D-048)
set -u
BK=$(readlink -f /root/ops-backups/D-062-latest 2>/dev/null)
echo "== boot =="
echo "kernel $(uname -r) · newest installed $(rpm -q kernel --last 2>/dev/null | awk 'NR==1{sub(/^kernel-/, "", $1); print $1}')"
echo "booted $(uptime -s) UTC ($(uptime -p)) · $(systemctl is-system-running 2>/dev/null)"
dnf needs-restarting -r 2>&1 | sed -n '1,3p'

echo; echo "== services: before vs now =="
if [ -f "$BK/running-before.txt" ]; then
  systemctl list-units --type=service --state=running --plain --no-legend 2>/dev/null | awk '{print $1}' | sort > /tmp/d062-now.txt
  missing=$(comm -23 "$BK/running-before.txt" /tmp/d062-now.txt | grep -vE '^(user@|session-)' )
  new=$(comm -13 "$BK/running-before.txt" /tmp/d062-now.txt | grep -vE '^(user@|session-)')
  echo "before $(wc -l < "$BK/running-before.txt") · now $(wc -l < /tmp/d062-now.txt)"
  if [ -n "$missing" ]; then
    echo "not running now:"; for u in $missing; do echo "  $u — $(systemctl is-active "$u") / $(systemctl is-enabled "$u" 2>/dev/null) · $(systemctl show "$u" -p Result --value)"; done
  else
    echo "every service that ran before is running again ✓"
  fi
  [ -n "$new" ] && echo "running now but not before: $(printf '%s ' $new)"
  rm -f /tmp/d062-now.txt
else
  echo "no saved list at /root/ops-backups/D-062-latest"
fi

echo; echo "== failed units =="; F=$(systemctl list-units --state=failed --plain --no-legend | awk '{print $1}' | paste -sd' ' -); echo "${F:-none}"
for u in $F; do echo "-- $u --"; journalctl -b -u "$u" -n 8 --no-pager -o cat 2>/dev/null | sed 's/^/  /'; done

echo; echo "== web stack =="
nginx -t 2>&1 | grep -E 'successful|failed|emerg' | sed 's/^/  /'
ss -ltn 2>/dev/null | awk 'NR>1{print $4}' | grep -E ':(80|443|5432|9080|9100)$' | sort -u | paste -sd' ' - | sed 's/^/listening: /'
echo "mutabe3: backend $(curl -s -m 10 localhost:9080/api/health | grep -o '"database":"[a-z]*"') $(curl -s -o /dev/null -m 10 -w '%{http_code}' localhost:9080/api/health) · frontend $(curl -s -o /dev/null -m 20 -w '%{http_code}' localhost:9100/)"
echo "timers: $(systemctl list-timers --no-pager --plain --no-legend 2>/dev/null | awk '{print $(NF-1)}' | grep -E 'mutabe3|logrotate|certbot|dnf-automatic' | paste -sd' ' -)"
