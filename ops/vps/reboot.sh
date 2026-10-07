#!/usr/bin/env bash
# Reboot the shared VPS into the installed kernel (D-062) — only after a pre-flight that everything running now
# comes back by itself. Saves the running-service list for post-reboot-check.sh, then schedules the reboot
# 20 s out so this SSH session ends cleanly. Any failed guard aborts without rebooting (exit 1).
# (no `| head` — pipefail/exit 141, D-048)
set -u
TS=$(date -u +%Y%m%d-%H%M%S); BK=/root/ops-backups/D-062-$TS; mkdir -p "$BK"; chmod 700 /root/ops-backups "$BK"
ln -sfn "$BK" /root/ops-backups/D-062-latest
STOP=()

echo "== kernel =="
NEWEST=$(rpm -q kernel --last 2>/dev/null | awk 'NR==1{sub(/^kernel-/, "", $1); print $1}')
DEFAULT=$(grubby --default-kernel 2>/dev/null)
echo "running $(uname -r) · newest installed $NEWEST · boot default $DEFAULT"
case "$DEFAULT" in *"$NEWEST") echo "boot default is the newest kernel ✓";; *) STOP+=("boot default ($DEFAULT) is not the newest installed kernel ($NEWEST)");; esac
echo "previous kernel stays in the boot menu: $(ls /boot/vmlinuz-* 2>/dev/null | grep -v rescue | sed 's#.*/vmlinuz-##' | paste -sd' ' -)"
df -h /boot | awk 'NR==2{print "/boot free " $4}'

echo; echo "== running services — will each come back at boot? =="
systemctl list-units --type=service --state=running --plain --no-legend 2>/dev/null | awk '{print $1}' | sort > "$BK/running-before.txt"
echo "$(wc -l < "$BK/running-before.txt") running services saved to $BK/running-before.txt"
ENABLED=()
while read -r u; do
  e=$(systemctl is-enabled "$u" 2>/dev/null)
  case "$e" in
    enabled|enabled-runtime|static|indirect|generated|alias|transient) continue ;;
  esac
  case "$u" in user@*|session-*|systemd-*|getty@*|serial-getty@*) continue ;; esac
  by=$(systemctl show "$u" -p WantedBy -p RequiredBy --value 2>/dev/null | xargs)
  if [ -n "$by" ]; then
    echo "$u is '$e' but pulled in at boot by: $by ✓"
  elif [[ "$u" =~ ^(nginx|postgresql|php-fpm|php8[0-9]-php-fpm|mutabe3-[a-z]+)\.service$ ]]; then
    # Core web stack: it must start at boot, not wait for a watchdog cron (nginx came up 2 min 11 s after the
    # 2026-10-05 boot, at the first */3 run of convertec-watchdog). Reversible: systemctl disable <unit>.
    systemctl enable "$u" >/dev/null 2>&1 && { ENABLED+=("$u"); echo "enabled at boot: $u (was '$e')"; } || STOP+=("could not enable $u")
  else
    STOP+=("running but '$e' at boot and nothing pulls it in: $u")
  fi
done < "$BK/running-before.txt"
echo "-- watchdog scripts that (re)start nginx --"
grep -nisE 'nginx' /usr/local/bin/convertec-watchdog.sh /root/site-monitor.sh 2>/dev/null | cut -c1-160 | sed 's/^/  /'
# 'static' units come back only if something pulls them in; show them so the post-check can be read against this.
echo "static (pulled in by sockets/targets): $(while read -r u; do [ "$(systemctl is-enabled "$u" 2>/dev/null)" = static ] && printf '%s ' "$u"; done < "$BK/running-before.txt")"

echo; echo "== long-lived processes outside systemd services (started from a shell — would not come back) =="
ps -eo pid=,user=,etimes=,unit=,args= 2>/dev/null | awk '$4 ~ /^session-[0-9]+\.scope$/ && $3 > 3600 && $5 !~ /^(sshd|-?bash|sudo|su|sh|ps|awk|sleep|tmux|screen|SCREEN|login|systemd)/ {print}' | cut -c1-160 > "$BK/session-daemons.txt"
if [ -s "$BK/session-daemons.txt" ]; then cat "$BK/session-daemons.txt"; STOP+=("$(wc -l < "$BK/session-daemons.txt") long-lived process(es) in login sessions (see above)"); else echo "none"; fi
if command -v docker >/dev/null 2>&1; then
  echo "-- docker --"
  while read -r n rest; do   # process substitution, not a pipe: STOP must survive the loop
    [ -z "$n" ] && continue
    p=$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$n" 2>/dev/null); echo "$n $rest · restart=$p"
    if [ "$p" = no ] || [ -z "$p" ]; then STOP+=("docker container $n has no restart policy"); fi
  done < <(docker ps --format '{{.Names}} · {{.Status}}' 2>/dev/null)
fi

echo; echo "== nothing half-done =="
for p in dnf rpm yum pg_dump pg_restore mysqldump tar rsync certbot; do
  pgrep -x "$p" >/dev/null 2>&1 && STOP+=("$p is running right now")
done
for u in mutabe3-backup dnf-automatic dnf-makecache logrotate certbot-renew; do
  s=$(systemctl is-active "$u.service" 2>/dev/null); [ "$s" = activating ] && STOP+=("$u.service is running right now")
done
echo "failed units now: $(systemctl list-units --state=failed --plain --no-legend | awk '{print $1}' | paste -sd' ' - | sed 's/^$/none/')"
echo "mutabe3 before: backend $(curl -s -o /dev/null -m 10 -w '%{http_code}' localhost:9080/api/health) · frontend $(curl -s -o /dev/null -m 20 -w '%{http_code}' localhost:9100/)"

echo
if [ ${#STOP[@]} -gt 0 ]; then
  echo "❌ NOT rebooting:"; printf '  - %s\n' "${STOP[@]}"; exit 1
fi
[ ${#ENABLED[@]} -gt 0 ] && echo "enabled at boot in this run: ${ENABLED[*]} (undo: systemctl disable ${ENABLED[*]})"
echo "== pre-flight passed — rebooting in 20 s =="
systemd-run --quiet --on-active=20 --timer-property=AccuracySec=1s --unit=d062-reboot /usr/bin/systemctl reboot
echo "scheduled at $(date -u +%T) UTC for $(date -u -d '+20 sec' +%T) UTC · then: gh workflow run ops-vps.yml -f action=post-reboot-check"
