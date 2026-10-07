#!/usr/bin/env bash
# Postgres should be reachable only from this server (D-063). Check that nothing outside uses it, then remove it
# from firewalld's active zones (runtime + permanent, no reload so fail2ban's runtime bans stay). Postgres is not
# restarted and its config is untouched; firewalld never filters loopback, so local apps — including any that
# connect through the server's own public IP — keep working. Prints counts only (this log is public).
# (no `| head` — pipefail/exit 141, D-048)
set -u
TS=$(date -u +%Y%m%d-%H%M%S); BK=/root/ops-backups/D-063-$TS; mkdir -p "$BK"; chmod 700 /root/ops-backups "$BK"
MYIP=$(curl -s -4 --max-time 5 https://api.ipify.org || true)
pq() { runuser -u postgres -- psql -Atc "$1" 2>/dev/null; }
cd /
STOP=(); ROLLBACK=()

echo "== 1. does anything outside use Postgres? =="
echo "listen_addresses=$(pq 'show listen_addresses') · port=$(pq 'show port') · log_connections=$(pq 'show log_connections')"
HBA=$(pq 'show hba_file')
echo "pg_hba rules: $(grep -cvE '^\s*(#|$)' "$HBA" 2>/dev/null) · of which allow non-loopback hosts: $(grep -vE '^\s*(#|$)' "$HBA" 2>/dev/null | awk '$1 ~ /^host/ && $4 !~ /^(127\.0\.0\.1|::1)/ && $4 != "samehost"' | wc -l)"
cp -a "$HBA" "$BK/pg_hba.conf" 2>/dev/null
REMOTE_DB=$(pq "select count(*) from pg_stat_activity where client_addr is not null and host(client_addr) not in ('127.0.0.1', '::1', '${MYIP:-0}')")
REMOTE_TCP=$(ss -Htn state established '( sport = :5432 )' 2>/dev/null | awk '{print $4}' | sed -E 's/:[0-9]+$//; s/^\[|\]$//g' | grep -vcE "^(127\.|::1$|::ffff:127\.|${MYIP:-x}$)")
echo "remote sessions now: pg_stat_activity ${REMOTE_DB:-?} · established TCP ${REMOTE_TCP:-?}"
[ "${REMOTE_DB:-0}" != 0 ] || [ "${REMOTE_TCP:-0}" != 0 ] && STOP+=("a client outside this server is connected to Postgres right now")
DD=$(pq 'show data_directory'); LD=$(pq 'show log_directory'); case "$LD" in /*) ;; *) LD="$DD/$LD";; esac
if [ -d "$LD" ]; then
  L=$(find "$LD" -type f -mtime -7 2>/dev/null)
  if [ -n "$L" ]; then
    echo "postgres logs, last 7 days: 'no pg_hba.conf entry' $(cat $L 2>/dev/null | grep -c 'no pg_hba.conf entry') · auth failures $(cat $L 2>/dev/null | grep -cE 'password authentication failed|authentication failed') · remote 'connection authorized' $(cat $L 2>/dev/null | grep -E 'connection received: host=' | grep -vcE "host=(127\.0\.0\.1|::1|\[local\]|${MYIP:-x})")"
  fi
fi

echo; echo "== 2. firewall =="
if ! systemctl is-active --quiet firewalld; then
  STOP+=("firewalld is not running — this script only edits firewalld")
else
  for z in $(firewall-cmd --get-active-zones 2>/dev/null | awk '!/^[[:space:]]/{print $1}'); do
    t=$(firewall-cmd --permanent --zone="$z" --get-target 2>/dev/null)
    echo "zone $z · target $t · services: $(firewall-cmd --zone="$z" --list-services | tr ' ' ',') · ports: $(firewall-cmd --zone="$z" --list-ports | tr ' ' ',')"
    firewall-cmd --permanent --zone="$z" --list-all > "$BK/zone-$z.txt" 2>&1
    [ "$t" = ACCEPT ] && STOP+=("zone $z accepts everything (target ACCEPT)")
    n=$(firewall-cmd --zone="$z" --list-rich-rules | grep -c 5432); [ "$n" != 0 ] && echo "rich rules mentioning 5432 in $z: $n (left alone — listed in $BK)"
  done
fi
ipt=$(nft list ruleset 2>/dev/null | grep -cE 'dport (5432|\{[^}]*5432)')
echo "nftables rules mentioning dport 5432: $ipt"

if [ ${#STOP[@]} -gt 0 ]; then echo; echo "❌ NOT changing anything:"; printf '  - %s\n' "${STOP[@]}"; exit 1; fi

echo; echo "== 3. close =="
CHANGED=0
for z in $(firewall-cmd --get-active-zones 2>/dev/null | awk '!/^[[:space:]]/{print $1}'); do
  for s in postgresql; do
    if firewall-cmd --permanent --zone="$z" --query-service="$s" >/dev/null 2>&1 || firewall-cmd --zone="$z" --query-service="$s" >/dev/null 2>&1; then
      firewall-cmd --zone="$z" --remove-service="$s" >/dev/null; firewall-cmd --permanent --zone="$z" --remove-service="$s" >/dev/null
      echo "removed service $s from zone $z"; CHANGED=1; ROLLBACK+=("firewall-cmd --zone=$z --add-service=$s && firewall-cmd --permanent --zone=$z --add-service=$s")
    fi
  done
  for p in 5432/tcp 5432/udp; do
    if firewall-cmd --permanent --zone="$z" --query-port="$p" >/dev/null 2>&1 || firewall-cmd --zone="$z" --query-port="$p" >/dev/null 2>&1; then
      firewall-cmd --zone="$z" --remove-port="$p" >/dev/null; firewall-cmd --permanent --zone="$z" --remove-port="$p" >/dev/null
      echo "removed port $p from zone $z"; CHANGED=1; ROLLBACK+=("firewall-cmd --zone=$z --add-port=$p && firewall-cmd --permanent --zone=$z --add-port=$p")
    fi
  done
done
[ "$CHANGED" = 0 ] && echo "⚠️  no firewalld service/port entry for 5432 was found — the opening comes from somewhere else (see zone files in $BK)"

echo; echo "== 4. verify =="
for z in $(firewall-cmd --get-active-zones 2>/dev/null | awk '!/^[[:space:]]/{print $1}'); do
  echo "zone $z now · services: $(firewall-cmd --zone="$z" --list-services | tr ' ' ',') · ports: $(firewall-cmd --zone="$z" --list-ports | tr ' ' ',') · permanent services: $(firewall-cmd --permanent --zone="$z" --list-services | tr ' ' ',')"
done
echo "local Postgres: 127.0.0.1 $(pg_isready -q -h 127.0.0.1 -p 5432 && echo ok || echo FAIL) · own public IP $(pg_isready -q -h "${MYIP:-127.0.0.1}" -p 5432 -t 5 && echo ok || echo FAIL) · socket $(runuser -u postgres -- pg_isready -q && echo ok || echo FAIL)"
echo "mutabe3: backend $(curl -s -m 10 localhost:9080/api/health | grep -o '"database":"[a-z]*"') · frontend $(curl -s -o /dev/null -m 20 -w '%{http_code}' localhost:9100/)"
echo "fail2ban: $(systemctl is-active fail2ban) · jails $(fail2ban-client status 2>/dev/null | awk -F: '/Number of jail/{gsub(/ /,"",$2); print $2}')"
echo "failed units: $(systemctl list-units --state=failed --plain --no-legend | awk '{print $1}' | paste -sd' ' - | sed 's/^$/none/')"
echo; echo "== rollback (zone backups in $BK) =="
if [ ${#ROLLBACK[@]} -eq 0 ]; then echo "  nothing changed"; else printf '  %s\n' "${ROLLBACK[@]}"; fi
