#!/usr/bin/env bash
# Read-only (D-079): after the first unprivileged deploy — frontend permission errors since restart,
# ISR/cache files written by the service user, ownership of the checkout, units' users.
set -uo pipefail
APP=/var/www/mutabe3/current/projects/mutabe3; N=$APP/packages/frontend/.next
since=$(systemctl show mutabe3-frontend -p ActiveEnterTimestamp --value)
echo "frontend up since: $since"
curl -s -o /dev/null http://127.0.0.1:9100/; curl -s -o /dev/null http://127.0.0.1:9100/about; sleep 3
echo "== permission errors since restart =="; journalctl -u mutabe3-frontend -u mutabe3-backend --since "$since" --no-pager -o cat | grep -iE 'EACCES|EPERM|permission denied' | head -5 || true
echo "count: $(journalctl -u mutabe3-frontend -u mutabe3-backend --since "$since" --no-pager -o cat | grep -ciE 'EACCES|EPERM|permission denied')"
echo "== files written in .next since restart (by owner) =="; find "$N" -newermt "$since" -type f -printf '%u\n' 2>/dev/null | sort | uniq -c
echo "== .next owner =="; stat -c '%U:%G' "$N"
echo "== checkout owner (top, .git, node_modules) =="; stat -c '%n %U:%G' "$APP" "$APP/.git" "$APP/node_modules" 2>/dev/null
echo "== unit users =="; for u in mutabe3-frontend mutabe3-backend; do echo "$u: $(systemctl show $u -p User --value)"; done
echo "== backend sees new secrets (names only) =="; pid=$(systemctl show mutabe3-backend -p MainPID --value); tr '\0' '\n' < /proc/$pid/environ 2>/dev/null | grep -oE '^(SEAL_SECRET|FINGERPRINT_SALT|DKIM_KEY_FILE)=' | sort
echo "== last logins of mutabe3-deploy =="; last -n 3 mutabe3-deploy 2>/dev/null | head -3; journalctl -u sshd --since '-30min' --no-pager -o cat | grep -E 'Accepted publickey for mutabe3-deploy' | tail -2 | sed -E 's/from [0-9.]+/from <runner>/'
