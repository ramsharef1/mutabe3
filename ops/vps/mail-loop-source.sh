#!/usr/bin/env bash
# Read-only: which scheduled job's output causes the root mail loop (root@<host domain> has no MX → bounce →
# double bounce). Correlates root mail submissions with cron/timer starts in the same second. Prints only
# whether each source belongs to mutabe3 or not, its schedule and the cron file mtime — no other site's names.
set -uo pipefail
since='-1h'
mapfile -t subs < <(journalctl -u postfix --since "$since" --no-pager -o short-unix 2>/dev/null | grep -E 'pickup.*uid=0 ' | awk '{print int($1)}')
echo "root mail submissions in last hour: ${#subs[@]}"
declare -A hit
while read -r ts line; do
  t=${ts%.*}
  for s in "${subs[@]}"; do d=$((s - t)); if [ $d -ge 0 ] && [ $d -le 90 ]; then
    cmd=$(sed -E 's/.*CMD \((.*)\)$/\1/' <<<"$line"); hit["$cmd"]=$(( ${hit["$cmd"]:-0} + 1 )); break; fi; done
done < <(journalctl --since "$since" --no-pager -o short-unix -t CROND 2>/dev/null | grep -E '\(root\) CMD' | awk '{ts=$1; $1=""; print ts, $0}')
echo "== cron commands started ≤90 s before a root mail (classified) =="
i=0; for c in "${!hit[@]}"; do i=$((i+1)); own=$([[ "$c" == *mutabe3* ]] && echo mutabe3 || echo other-site)
  f=$(grep -lF -- "$(cut -c1-40 <<<"$c")" /etc/cron.d/* /var/spool/cron/root 2>/dev/null | head -1)
  sched=$(grep -hF -- "$(cut -c1-40 <<<"$c")" /etc/cron.d/* /var/spool/cron/root 2>/dev/null | head -1 | awk '{print $1,$2,$3,$4,$5}')
  mt=$([ -n "$f" ] && stat -c %y "$f" | cut -c1-16)
  mailto=$([ -n "$f" ] && grep -hE '^MAILTO=' "$f" | head -1)
  echo "job #$i · owner: $own · matches: ${hit[$c]} · schedule: ${sched:-?} · file modified: ${mt:-?} · ${mailto:-no MAILTO line} · redirects output: $(grep -qE '>\s*/dev/null|>>' <<<"$c" && echo yes || echo no)"
done
echo "== root aliases =="; grep -E '^root:' /etc/aliases || echo "(no root alias → mail goes to root@\$mydomain = root@hstgr.cloud, which has no MX)"
