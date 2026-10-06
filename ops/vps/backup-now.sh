#!/usr/bin/env bash
# Take a backup right now (DB + uploads) through the installed unit and show the result (D-048).
set -euo pipefail
test -x /usr/local/bin/mutabe3-backup || { echo "backups are not installed — run ops action setup-backups first"; exit 1; }
/usr/local/bin/mutabe3-backup --with-uploads
echo; ls -lh --time-style=long-iso /var/backups/mutabe3 | awk 'NR>1{print $5, $6, $7, $8}'
echo; systemctl list-timers mutabe3-backup.timer --no-pager | sed -n '1,2p'
