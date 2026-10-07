#!/usr/bin/env bash
# Read-only (D-073, SECURITY S-02): where (if anywhere) nginx's version banner is configured, which conf
# files the http block includes, and the current Server header — before switching server_tokens off.
set -uo pipefail
echo "== nginx -v =="; nginx -v 2>&1
echo "== server_tokens directives =="; grep -rn 'server_tokens' /etc/nginx 2>/dev/null || echo "(none — default is on)"
echo "== includes in nginx.conf =="; grep -nE '^\s*(include|http\s*\{)' /etc/nginx/nginx.conf
echo "== conf.d files =="; ls -la /etc/nginx/conf.d/ 2>/dev/null
echo "== Server header now =="; curl -sI http://127.0.0.1/ -H 'Host: mutabe3.news' | grep -i '^server' || true
echo "== nginx -t =="; nginx -t 2>&1 | tail -2
