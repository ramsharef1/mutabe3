#!/usr/bin/env bash
# Read-only (PLAN Q3/Q5): last 24 h of Postfix bounces on the shared server, classified only as
# "from mutabe3.news" vs "other" — no addresses or other domains printed — plus generic reasons,
# and whether the server IP is on the common blocklists. Decides whether this IP is fit to send newsletters.
set -uo pipefail
log=$(journalctl -u postfix --since '-24h' --no-pager -o cat 2>/dev/null)
declare -A from
while read -r id dom; do from[$id]=$dom; done < <(grep -oE '^[a-z]+/[a-z]+\[[0-9]+\]: [0-9A-F]+: from=<[^>]*>' <<<"$log" | sed -E 's/.*: ([0-9A-F]+): from=<[^@>]*@?([^>]*)>/\1 \2/')
m=0; o=0; e=0
while read -r id; do d=${from[$id]:-}; if [ -z "$d" ]; then e=$((e+1)); elif [ "$d" = "mutabe3.news" ]; then m=$((m+1)); else o=$((o+1)); fi; done < <(grep -oE '[0-9A-F]+: to=<[^>]*>.*status=bounced' <<<"$log" | cut -d: -f1)
echo "== bounced 24h by sender =="; echo "mutabe3.news: $m · other domains: $o · null sender (bounce/DSN): $e"
echo "== sent 24h by sender =="; sm=0; so=0; while read -r id; do [ "${from[$id]:-}" = "mutabe3.news" ] && sm=$((sm+1)) || so=$((so+1)); done < <(grep -oE '[0-9A-F]+: to=<[^>]*>.*status=sent' <<<"$log" | cut -d: -f1); echo "mutabe3.news: $sm · other: $so"
echo "== bounce reasons (generic, top 8) =="; grep -oE 'status=bounced \(.*' <<<"$log" | sed -E 's/<[^>]*>//g; s/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+//g; s/[0-9]{3,}/N/g' | cut -c1-140 | sort | uniq -c | sort -rn | head -8
echo "== relay of bounces (local vs remote) =="; grep -oE 'relay=[^ ,]+.*status=bounced' <<<"$log" | grep -oE 'relay=[^ ,\[]+' | sed -E 's/relay=.*\.(google|outlook|yahoo)\..*/relay=remote-\1/; s/relay=(none|local|dovecot|virtual).*/relay=\1/' | sort | uniq -c | sort -rn | head -5
echo "== hourly bounce volume (last 6 h) =="; journalctl -u postfix --since '-6h' --no-pager -o short-iso 2>/dev/null | grep 'status=bounced' | cut -c1-13 | uniq -c
echo "== blocklists for the server IP =="; ip=$(curl -s4 --max-time 5 https://api.ipify.org); r=$(awk -F. '{print $4"."$3"."$2"."$1}' <<<"$ip")
for bl in zen.spamhaus.org bl.spamcop.net b.barracudacentral.org dnsbl.sorbs.net; do a=$(dig +short "$r.$bl" A | head -1); echo "$bl: ${a:-not listed}"; done
echo "== queue size =="; mailq 2>/dev/null | tail -1
