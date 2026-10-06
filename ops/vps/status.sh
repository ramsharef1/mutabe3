#!/usr/bin/env bash
# Quick production status: services, who they run as, backups, timers, disk, health (D-048). No secrets printed.
set -u
echo "== services =="
for u in mutabe3-backend mutabe3-frontend; do
  pid=$(systemctl show "$u" -p MainPID --value 2>/dev/null)
  echo "$u: $(systemctl is-active "$u") · User=$(systemctl show "$u" -p User --value 2>/dev/null | sed 's/^$/root (unit default)/') · pid $pid runs as $( [ -n "$pid" ] && [ "$pid" != 0 ] && ps -o user= -p "$pid" || echo -) · restarts=$(systemctl show "$u" -p NRestarts --value)"
done
echo; echo "== backups (/var/backups/mutabe3) =="
if [ -d /var/backups/mutabe3 ]; then
  ls -lh --time-style=long-iso /var/backups/mutabe3 2>/dev/null | awk 'NR>1{print $5, $6, $7, $8}' | tail -8
  echo "total: $(du -sh /var/backups/mutabe3 | cut -f1) · files: $(ls -1 /var/backups/mutabe3 | wc -l)"
  systemctl list-timers mutabe3-backup.timer --no-pager 2>/dev/null | sed -n '1,2p'
  journalctl -u mutabe3-backup -n 3 --no-pager -o cat 2>/dev/null
else
  echo "none — run ops action setup-backups"
fi
echo; echo "== uploads =="; du -sh /var/www/mutabe3/uploads 2>/dev/null; echo "files: $(find /var/www/mutabe3/uploads -type f -not -path '*/.cache/*' 2>/dev/null | wc -l) · cache: $(find /var/www/mutabe3/uploads/.cache -type f 2>/dev/null | wc -l)"
echo; echo "== disk =="; df -h / | tail -1
echo; echo "== health =="; curl -fsS -o /dev/null -w 'backend %{http_code}\n' localhost:9080/api/health; curl -fsS -o /dev/null -w 'frontend %{http_code}\n' localhost:9100
