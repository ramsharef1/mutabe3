#!/usr/bin/env bash
# Keep the Apache stack out of dnf-automatic's daily security run (D-061). Apache's httpd-core and AdminBolt's
# bolt-suexec both own /usr/sbin/suexec, so any transaction containing an httpd update is refused as a whole —
# from the first morning such an update is published, every automatic security update on the box would stop.
# Apache is masked (D-060) and never runs. Only dnf-automatic is affected ([base] in automatic.conf); manual dnf
# and AdminBolt's own tooling still see the packages. Idempotent; backup + rollback printed.
# (no `| head` — pipefail/exit 141, D-048)
set -u
CONF=/etc/dnf/automatic.conf; EXCL='httpd* mod_*'
TS=$(date -u +%Y%m%d-%H%M%S); BK=/root/ops-backups/D-061-$TS; mkdir -p "$BK"; chmod 700 /root/ops-backups "$BK"

probe() {  # what dnf-automatic would install with the given config, without downloading or installing
  local t=/tmp/d061-auto-probe.conf
  sed -E -e 's/^\s*apply_updates\s*=.*/apply_updates = no/' -e 's/^\s*download_updates\s*=.*/download_updates = no/' \
         -e 's/^\s*emit_via\s*=.*/emit_via = stdio/' "$1" > "$t"
  dnf-automatic "$t" 2>&1 | grep -vE '^\s*$|Last metadata' | sed -n '1,25p' | sed 's/^/  /'
  rm -f "$t"
}

echo "== before =="
grep -nE '^\s*\[|^\s*excludepkgs|^\s*upgrade_type|^\s*apply_updates|^\s*reboot\s*=' "$CONF" | sed 's/^/  /'
echo "-- what tomorrow's automatic run would install --"; probe "$CONF"

echo; echo "== change =="
# First run (2026-10-07 17:30) missed that the file already says `exclude = httpd* mod_ssl* mod_lua*` (`exclude` is
# dnf's older name for `excludepkgs`) and added a redundant line; converge back to the original.
if grep -qE '^\s*exclude\s*=.*httpd' "$CONF" && grep -qE '^# D-061: ' "$CONF"; then
  cp -a "$CONF" "$BK/automatic.conf"
  sed -i -E '/^# D-061: /d; /^excludepkgs = httpd\* mod_\*$/d' "$CONF"
  echo "removed the redundant D-061 lines — Apache was already held by: $(grep -E '^\s*exclude\s*=' "$CONF")"
  ORIG=$(ls -1d /root/ops-backups/D-061-*/automatic.conf 2>/dev/null | sort | sed -n 1p)
  [ -n "$ORIG" ] && { cmp -s "$ORIG" "$CONF" && echo "identical to the original ($ORIG) ✓" || { echo "differs from $ORIG:"; diff -u "$ORIG" "$CONF" | sed 's/^/  /'; }; }
elif grep -qE '^\s*(exclude|excludepkgs)\s*=.*httpd' "$CONF"; then
  echo "already held: $(grep -E '^\s*(exclude|excludepkgs)\s*=' "$CONF")"
else
  cp -a "$CONF" "$BK/automatic.conf"
  if grep -qE '^\s*\[base\]' "$CONF"; then
    sed -i -E "/^\s*\[base\]/a\\# D-061: Apache conflicts with AdminBolt's bolt-suexec and is masked; keep it out so the daily security run is never refused.\\nexcludepkgs = $EXCL" "$CONF"
  else
    printf '\n[base]\n# D-061: Apache conflicts with AdminBolt'"'"'s bolt-suexec and is masked; keep it out so the daily security run is never refused.\nexcludepkgs = %s\n' "$EXCL" >> "$CONF"
  fi
  echo "added under [base]: excludepkgs = $EXCL"
  diff -u "$BK/automatic.conf" "$CONF" | sed 's/^/  /'
fi

echo; echo "== after: what the automatic run would install now =="; probe "$CONF"
echo; echo "== manual dnf still sees Apache (unchanged) =="
dnf -q check-update --security 2>/dev/null | awk 'NF==3 {print "  " $1}'
echo; echo "== rollback =="
if [ -f "$BK/automatic.conf" ]; then echo "  cp -a $BK/automatic.conf $CONF"; else echo "  nothing changed"; fi
