#!/usr/bin/env bash
# Read-only (PLAN Q3/Q5), second pass: how this shared mail server signs DKIM and manages virtual domains,
# so mutabe3.news can be added the same way without changing anything for the other domains.
# Prints config structure only — never private keys or passwords.
set -uo pipefail
echo "== who listens on 8891 / rspamd ports =="; ss -lntp 2>/dev/null | grep -E ':(8891|11332|11333|11334)\s' || echo "(none)"
echo "== postfix main.cf (non-secret keys) =="; postconf -n 2>/dev/null | grep -vE 'password|passwd|sasl_password'
echo "== myhostname (effective) =="; postconf -h myhostname
echo "== postfix sql maps (paths, no secrets) =="; for f in /etc/postfix/sql/*.cf; do echo "--- $f"; grep -vE 'password|passwd' "$f"; done 2>/dev/null
echo "== sqlite db referenced =="; db=$(grep -hoE 'dbpath\s*=\s*\S+' /etc/postfix/sql/*.cf 2>/dev/null | head -1 | awk -F= '{gsub(/ /,"",$2);print $2}'); echo "$db"; [ -n "$db" ] && ls -la "$db" && command -v sqlite3 >/dev/null && sqlite3 "$db" '.tables'
echo "== who owns that db (panel?) =="; [ -n "${db:-}" ] && dirname "$db" && ls -la "$(dirname "$db")" | head
echo "== /etc/postfix/virtual (domains only) =="; awk '{print $1}' /etc/postfix/virtual 2>/dev/null | sed 's/.*@//' | sort | uniq -c
echo "== rspamd dkim config =="; for f in /etc/rspamd/local.d/dkim_signing.conf /etc/rspamd/override.d/dkim_signing.conf /etc/rspamd/local.d/arc.conf /etc/rspamd/local.d/worker-proxy.inc /etc/rspamd/local.d/milter_headers.conf; do [ -f "$f" ] && { echo "--- $f"; grep -vE 'BEGIN|PRIVATE' "$f"; }; done
echo "== dkim key dirs (names only) =="; ls -la /var/lib/rspamd/dkim 2>/dev/null; ls -la /etc/opendkim/keys/* 2>/dev/null | awk '{print $1,$3,$4,$NF}'
echo "== opendkim config (non-secret) =="; [ -f /etc/opendkim.conf ] && grep -vE '^\s*#|^\s*$' /etc/opendkim.conf
echo "== dovecot domains/users source =="; grep -rhE '^\s*(driver|args|passdb|userdb|mail_location)' /etc/dovecot/dovecot.conf /etc/dovecot/conf.d/*.conf 2>/dev/null | grep -v password | sort -u | head -20
echo "== hostname/FCrDNS =="; hostname -f; dig +short srv1772644.hstgr.cloud A
echo "== mail panel hints =="; ls -d /usr/local/lsws /usr/local/CyberCP /opt/hcp /opt/hostinger* /usr/share/postfixadmin /var/www/*/postfixadmin /etc/hestiacp 2>/dev/null; systemctl list-units --type=service --no-pager 2>/dev/null | grep -iE 'panel|admin|cp\b|lsws|cyber|hcp|webmin' | head
echo "== recent mail log tail (status lines only, no addresses) =="; journalctl -u postfix --since '-24h' --no-pager 2>/dev/null | grep -oE 'status=[a-z]+' | sort | uniq -c
