#!/usr/bin/env bash
# Read-only: every failed systemd unit on the VPS with its last journal lines (D-059 follow-up to the
# «وحدات فاشلة» row of the weekly digest and the «خدمة متوقفة» alert). Secret-looking values are masked.
# (no `| head`: with pipefail an early-closing reader turns into exit 141 — D-048)
set -u
mask() { sed -E 's/((PASSWORD|SECRET|DATABASE_URL|TOKEN|KEY)[A-Z_]*=)[^ ]*/\1***/Ig'; }
failed=$(systemctl list-units --state=failed --plain --no-legend 2>/dev/null | awk '{print $1}')
if [ -z "$failed" ]; then echo "no failed units"; exit 0; fi
echo "== failed units: $(printf '%s' "$failed" | paste -sd' ' -) =="
for u in $failed; do
  echo; echo "---- $u ----"
  systemctl show "$u" -p Description,ActiveEnterTimestamp,ExecMainStartTimestamp,ExecMainExitTimestamp,Result,ExecMainStatus,TriggeredBy 2>/dev/null | mask
  echo "-- last 25 journal lines --"
  journalctl -u "$u" -n 25 --no-pager -o short-iso 2>/dev/null | mask
  # The journal on this VPS is volatile and small (it drops lines within hours); rsyslog keeps them (D-060).
  echo "-- /var/log/messages (rsyslog) --"
  grep -hE "${u%.service}(\[|:)|${u}" /var/log/messages 2>/dev/null | tail -n 12 | mask | cut -c1-220
done
echo; echo "== timers that trigger the failed units =="
for u in $failed; do
  t=$(systemctl show "$u" -p TriggeredBy --value 2>/dev/null)
  [ -n "$t" ] && systemctl list-timers "$t" --all --no-pager 2>/dev/null | sed -n '1,2p'
done
echo; echo "== certificates served for mutabe3.news (for the certbot case) =="
echo | openssl s_client -servername mutabe3.news -connect localhost:443 2>/dev/null | openssl x509 -noout -subject -enddate -issuer 2>/dev/null
if command -v certbot >/dev/null 2>&1; then certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry' | sed -n '1,30p'; fi
