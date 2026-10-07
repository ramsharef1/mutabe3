#!/usr/bin/env bash
# D-073, SECURITY S-02: stop nginx advertising its version ("Server: nginx/1.20.1" → "Server: nginx").
# SHARED VPS (LAW 5): this applies to every site on the box, but changes only that one response header.
#
# Pre-flight (aborts without changing anything): nginx -t must pass; no server_tokens directive may exist yet
# (a duplicate would fail the config); conf.d/*.conf must be included inside the http block.
# Change: one new file /etc/nginx/conf.d/00-server-tokens.conf containing `server_tokens off;`, nginx -t,
# graceful reload. Check: every server_name answers with the same status code as before over local HTTP;
# on any difference or a failed test the file is removed and nginx reloaded again (automatic rollback).
# Manual rollback: rm /etc/nginx/conf.d/00-server-tokens.conf && nginx -t && systemctl reload nginx
set -uo pipefail
F=/etc/nginx/conf.d/00-server-tokens.conf
fail() { echo "❌ $*"; exit 1; }

echo "== pre-flight =="
nginx -t >/dev/null 2>&1 || fail "nginx -t fails before any change — not touching it"
if grep -rqs 'server_tokens' /etc/nginx; then grep -rn 'server_tokens' /etc/nginx; fail "server_tokens already configured — nothing to do automatically"; fi
grep -qE '^\s*include\s+/etc/nginx/conf.d/\*\.conf;' /etc/nginx/nginx.conf || fail "conf.d/*.conf is not included as expected"
[ -e "$F" ] && fail "$F already exists"

# every distinct server_name (first name of each block), status over local HTTP with that Host header
NAMES=$(grep -rhoE '^\s*server_name\s+[^;]+' /etc/nginx/conf.d/*.conf | awk '{print $2}' | grep -v '^_$' | sort -u)
declare -A BEFORE
for n in $NAMES; do BEFORE[$n]=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 -H "Host: $n" http://127.0.0.1/ || echo ERR); done
echo "sites checked: $(echo "$NAMES" | wc -w)"
echo "Server header before: $(curl -sI -H 'Host: mutabe3.news' http://127.0.0.1/ | grep -i '^server' | tr -d '\r')"

echo "== change =="
printf '# D-073 (mutabe3 ops, SECURITY S-02): hide the nginx version in the Server header and error pages.\nserver_tokens off;\n' > "$F"
chmod 644 "$F"
if ! nginx -t >/dev/null 2>&1; then rm -f "$F"; nginx -t 2>&1 | tail -2; fail "nginx -t failed with the new file — removed it, nothing reloaded"; fi
systemctl reload nginx || { rm -f "$F"; nginx -t >/dev/null 2>&1 && systemctl reload nginx; fail "reload failed — rolled back"; }
sleep 2

echo "== check =="
DIFF=0
for n in $NAMES; do
  a=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 -H "Host: $n" http://127.0.0.1/ || echo ERR)
  [ "$a" = "${BEFORE[$n]}" ] || { echo "  changed: site#$(echo -n "$n" | md5sum | cut -c1-6) ${BEFORE[$n]} → $a"; DIFF=1; }
done
if [ "$DIFF" = 1 ]; then rm -f "$F"; nginx -t >/dev/null 2>&1 && systemctl reload nginx; fail "a site's status changed — rolled back"; fi
echo "all sites: same status as before"
echo "Server header after: $(curl -sI -H 'Host: mutabe3.news' http://127.0.0.1/ | grep -i '^server' | tr -d '\r')"
echo "✅ server_tokens off ($F). Rollback: rm $F && nginx -t && systemctl reload nginx"
