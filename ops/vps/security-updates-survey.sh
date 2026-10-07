#!/usr/bin/env bash
# Read-only (D-061): which security updates are pending on the shared VPS, what they would touch,
# whether a reboot is already due, and how dnf-automatic is set up. Changes nothing (metadata refresh only).
# (no `| head` — pipefail/exit 141, D-048)
set -u
echo "== kernel =="
echo "running $(uname -r) · $(uptime -p)"
rpm -q kernel --last 2>/dev/null | sed -n '1,3p'

echo; echo "== dnf-automatic =="
for t in dnf-automatic.timer dnf-automatic-install.timer dnf-automatic-download.timer dnf-automatic-notifyonly.timer; do
  printf '%-34s %s / %s\n' "$t" "$(systemctl is-enabled "$t" 2>/dev/null)" "$(systemctl is-active "$t" 2>/dev/null)"
done
grep -E '^\s*(upgrade_type|apply_updates|download_updates|reboot|reboot_command|emit_via)\s*=' /etc/dnf/automatic.conf 2>/dev/null
echo "-- excludes --"; grep -hE '^\s*exclude' /etc/dnf/dnf.conf /etc/yum.repos.d/*.repo 2>/dev/null || echo none

echo; echo "== recent dnf transactions =="; dnf history list 2>/dev/null | sed -n '1,10p'

echo; echo "== refresh metadata =="; dnf -q makecache 2>&1 | tail -n 3; echo "ok"

echo; echo "== pending security advisories =="
dnf -q updateinfo summary --security 2>/dev/null
dnf -q updateinfo list --security 2>/dev/null | awk '{print $1, $2, $3}' | sort -k2,2 -k1,1 | sed -n '1,80p'

echo; echo "== the transaction a security upgrade would run (dry run, --assumeno) =="
dnf upgrade --security --assumeno 2>&1 | grep -vE '^(Last metadata|Operation aborted|Is this ok)' | sed -n '1,90p'

echo; echo "== needs-restarting before any update =="
if dnf needs-restarting --help >/dev/null 2>&1; then
  dnf needs-restarting -r 2>&1 | tail -n 4
  echo "-- services already running on replaced files --"; dnf needs-restarting -s 2>/dev/null | sort -u | sed -n '1,40p'
else
  echo "dnf needs-restarting unavailable (dnf-plugins-core missing)"
fi

echo; echo "== running services =="
systemctl list-units --type=service --state=running --plain --no-legend 2>/dev/null | awk '{print $1}' | paste -sd' ' -
echo; echo "== disk for the transaction =="; df -h / /boot 2>/dev/null | sed 's/^/  /'
echo; echo "survey complete — nothing changed"
