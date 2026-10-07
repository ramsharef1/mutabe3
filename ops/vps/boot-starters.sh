#!/usr/bin/env bash
# Read-only (D-062): how did nginx and gssproxy start at the last boot although both are 'disabled'?
# (no `| head` — pipefail/exit 141, D-048)
set -u
BOOT=$(uptime -s)
echo "last boot: $BOOT UTC"
for u in nginx gssproxy; do
  echo; echo "== $u =="
  systemctl show "$u" -p UnitFileState,UnitFilePreset,FragmentPath,DropInPaths,WantedBy,RequiredBy,TriggeredBy,ActiveEnterTimestamp,ExecMainStartTimestamp 2>/dev/null
  echo "-- units that pull it in --"; systemctl list-dependencies --reverse --plain --no-pager "$u.service" 2>/dev/null | sed -n '1,15p'
done
echo; echo "== who mentions nginx / gssproxy in unit files, cron @reboot, rc.local =="
grep -lsE 'nginx|gssproxy' /etc/systemd/system/*.service /etc/systemd/system/*/*.conf /usr/lib/systemd/system/bolt*.service /usr/lib/systemd/system/*bolt*.service 2>/dev/null | grep -v '/nginx.service' | sed 's/^/  unit: /'
for f in /usr/lib/systemd/system/bolt-agent.service /etc/systemd/system/bolt-agent.service; do [ -f "$f" ] && { echo "-- $f --"; grep -vE '^\s*(#|$)' "$f"; }; done
crontab -l 2>/dev/null | grep -E '@reboot' | sed 's/^/  root cron: /'
grep -hsE '@reboot' /etc/cron.d/* /var/spool/cron/* 2>/dev/null | sed 's/^/  cron: /'
[ -x /etc/rc.d/rc.local ] && { echo "-- rc.local (executable) --"; grep -vE '^\s*(#|$)' /etc/rc.d/rc.local; } || echo "  rc.local: not executable"
echo; echo "== /var/log/messages at the last boot: what happened just before nginx/gssproxy started =="
D=$(date -d "$BOOT" '+%b %e'); H=$(date -d "$BOOT" '+%H')
grep -nE "^$D $H:[0-9:]+ .*(Starting The nginx|Started The nginx|nginx\[|Starting GSSAPI|Started GSSAPI|gssproxy)" /var/log/messages* 2>/dev/null | sed -n '1,12p' | cut -c1-200
L=$(grep -nE "^$D $H:[0-9:]+ .*Starting The nginx" /var/log/messages 2>/dev/null | sed -n 1p | cut -d: -f1)
if [ -n "$L" ]; then echo "-- 12 lines before the nginx start --"; sed -n "$((L-12)),$((L+1))p" /var/log/messages | cut -c1-200; fi
echo; echo "== the AdminBolt view =="
command -v bolt-cli >/dev/null && bolt-cli --help 2>&1 | grep -iE 'nginx|service|web' | sed -n '1,10p'
echo "nginx binary: $(command -v nginx) · $(nginx -v 2>&1) · pkg $(rpm -qf "$(command -v nginx)" 2>/dev/null)"
echo; echo "nothing changed"
