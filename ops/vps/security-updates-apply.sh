#!/usr/bin/env bash
# Apply the pending security updates on the shared VPS (D-061): the same scope dnf-automatic installs every
# morning (`upgrade --security`), restart only services that run on replaced files (known-safe ones), verify,
# and print the rollback. Never reboots — that is a separate decision (all sites go down for a minute or two).
# (no `| head` — pipefail/exit 141, D-048)
set -u
last_id() { dnf history list 2>/dev/null | awk -F'|' 'NR>2 {gsub(/ /, "", $1); print $1; exit}'; }
BEFORE=$(last_id)

echo "== 0. is the Apache/bolt-suexec file conflict blocking dnf-automatic? (read-only) =="
echo "-- conflict lines in /var/log/dnf*.log (by day) --"
grep -hE 'conflicts with file from package bolt-suexec' /var/log/dnf.log /var/log/dnf.log.* 2>/dev/null | cut -c1-10 | sort | uniq -c | sed -n '1,20p'
echo "-- dnf-automatic runs in /var/log/messages --"
grep -hE 'dnf-automatic|dnf\[[0-9]+\]: (Error|Transaction)' /var/log/messages /var/log/messages-* 2>/dev/null | grep -E 'Error|error|Failed|conflict|Complete|Finished|Started' | tail -n 12 | cut -c1-200
echo "-- what the last automatic transactions changed --"
for id in $(dnf history list 2>/dev/null | awk -F'|' 'NR>2 && $2 ~ /^ *$/ {gsub(/ /, "", $1); print $1}' | sed -n '1,4p'); do
  echo "#$id: $(dnf history info "$id" 2>/dev/null | awk '/^Begin time/{sub(/^Begin time *: */, ""); t=$0} /^ +(Upgrade|Install|Upgraded)/{n++} END{print t " · " n " package lines"}') · httpd touched: $(dnf history info "$id" 2>/dev/null | grep -cE '^\s+(Upgrade|Upgraded)\s+httpd')"
done
echo "-- bolt-suexec and who needs httpd --"
rpm -qi bolt-suexec 2>/dev/null | grep -E '^(Name|Version|Release|Install Date|Vendor|Packager|URL|Summary)' | sed 's/^/  /'
rpm -qf /usr/sbin/suexec 2>/dev/null | sed 's/^/  \/usr\/sbin\/suexec owned by: /'
rpm -q --whatrequires httpd httpd-core mod_ssl 2>/dev/null | sort -u | sed 's/^/  requires apache: /'
grep -lsE 'httpd|suexec' /etc/yum.repos.d/*.repo 2>/dev/null | sed 's/^/  repo mentions httpd: /'

echo; echo "== 1. transaction =="
dnf -y upgrade --security > /tmp/d061-dnf.txt 2>&1; rc=$?
if [ "$rc" != 0 ] && grep -q 'conflicts with file from package bolt-suexec' /tmp/d061-dnf.txt; then
  echo "full security upgrade refused: Apache's httpd-core conflicts with AdminBolt's bolt-suexec (/usr/sbin/suexec)."
  echo "Apache is masked (D-060) and never runs — retrying without the Apache packages."
  dnf -y upgrade --security --exclude='httpd*,mod_ssl,mod_lua' > /tmp/d061-dnf.txt 2>&1; rc=$?
fi
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
