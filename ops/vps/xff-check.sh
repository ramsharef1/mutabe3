#!/usr/bin/env bash
# Read-only (D-064): does nginx hand the API the reader's real address? The per-IP rate limits (login, comments,
# search…) depend on it. Prints proxy directives and address *classes* only — no addresses (this log is public).
# (no `| head` — pipefail/exit 141, D-048)
set -u
NGX=$(grep -l 'server_name[^;]*mutabe3\.news' /etc/nginx/conf.d/*.conf 2>/dev/null | sed -n 1p)
echo "config: $NGX"
echo "== proxy directives inside the mutabe3.news server blocks =="
awk '/server_name[^;]*mutabe3\.news/{inb=1} inb && /^\s*server\s*\{|^server\s*\{/{if (seen) inb=0} inb{print; if (/^\}/) inb=0} /server_name[^;]*mutabe3\.news/{seen=1}' "$NGX" 2>/dev/null \
  | grep -nE 'server_name|listen|location|proxy_pass|proxy_set_header|real_ip|limit_req|include' | sed 's/^/  /' | sed -n '1,60p'
echo "-- shared includes / http-level --"
grep -rnhE 'set_real_ip_from|real_ip_header|limit_req_zone|proxy_set_header +X-(Forwarded-For|Real-IP)' /etc/nginx/nginx.conf /etc/nginx/conf.d/*.conf /etc/nginx/default.d/*.conf 2>/dev/null | sort | uniq -c | sed 's/^/  /' | sed -n '1,20p'
echo
echo "== what the API has recorded as the client address (Session.ipAddress, last 30 days) =="
DBURL=$(grep '^DATABASE_URL=' /etc/mutabe3/backend.env | cut -d= -f2- | tr -d '"'"'"); DBURL=${DBURL%%\?*}
psql "$DBURL" -Atc "select case when \"ipAddress\" is null then 'null'
  when \"ipAddress\" in ('127.0.0.1','::1','::ffff:127.0.0.1') then 'loopback'
  when \"ipAddress\" ~ '^(::ffff:)?(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' then 'private'
  else 'public' end as class, count(*) from \"Session\" where \"createdAt\" > now() - interval '30 days' group by 1 order by 2 desc" 2>&1 | sed 's/^/  /'
echo; echo "nothing changed"
