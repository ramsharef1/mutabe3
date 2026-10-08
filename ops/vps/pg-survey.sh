#!/usr/bin/env bash
# Read-only (D-084 prep, Prisma 7): Postgres version, connection headroom (the server is shared), and the
# shape of DATABASE_URL (host kind, ssl/connection_limit params present) — never its values.
set -uo pipefail
U=$(grep '^DATABASE_URL=' /etc/mutabe3/backend.env | cut -d= -f2- | tr -d '"'"'")
host=$(sed -E 's#^[a-z]+://[^@]*@([^:/?]*).*#\1#' <<<"$U"); case "$host" in localhost|127.0.0.1|::1|"") kind=local;; *) kind=remote;; esac
echo "url: host=$kind · params: $(sed -nE 's#.*\?(.*)#\1#p' <<<"$U" | tr '&' '\n' | cut -d= -f1 | paste -sd, - || true)"
B=${U%%\?*}
psql "$B" -Atc "select 'version '||current_setting('server_version')" 
psql "$B" -Atc "select 'max_connections '||current_setting('max_connections')||' · superuser_reserved '||current_setting('superuser_reserved_connections')"
psql "$B" -Atc "select 'connections now '||count(*)||' (this db '||count(*) filter (where datname=current_database())||', other dbs '||count(*) filter (where datname<>current_database())||')' from pg_stat_activity where backend_type='client backend'"
psql "$B" -Atc "select 'ssl on server '||current_setting('ssl')"
psql "$B" -Atc "select 'databases '||count(*) from pg_database where not datistemplate"
echo "backend main pid conns: $(ss -tnp 2>/dev/null | grep ':5432' | grep -c node)"
echo "plain (no-ssl) local connection: $(psql "$B?sslmode=disable" -Atc "select 'ok'" 2>&1 | head -1)"
psql "$B" -Atc "select 'app connections using ssl: '||count(*) filter (where s.ssl)||' of '||count(*) from pg_stat_ssl s join pg_stat_activity a using (pid) where a.datname=current_database() and a.backend_type='client backend'"
