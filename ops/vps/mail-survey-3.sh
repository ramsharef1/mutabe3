#!/usr/bin/env bash
# Read-only (PLAN Q3/Q5), third pass: table structure of the shared mail database (no rows of other
# domains), Dovecot's password scheme, what manages /etc/mail/mail.sqlite, and the origin of the local
# bounce loop (process/uid that submits it). Prints no addresses, passwords or hashes.
set -uo pipefail
db=/etc/mail/mail.sqlite
echo "== schema =="; sqlite3 "$db" '.schema'
echo "== row counts =="; for t in domains mailboxes aliases domain_aliases virtual_aliases; do printf '%s: ' "$t"; sqlite3 "$db" "select count(*) from $t"; done
echo "== mutabe3 rows =="; sqlite3 "$db" "select 'domain',name,active from domains where name='mutabe3.news'; select 'mailbox',email,active from mailboxes where email like '%@mutabe3.news'; select 'alias',source,destination from aliases where source like '%@mutabe3.news'"
echo "== example maildir shape (path pattern only) =="; sqlite3 "$db" "select maildir from mailboxes limit 1" | sed -E 's#[^/]+@[^/]+#<email>#; s#/[^/]*\.[a-z]+/#/<domain>/#'
echo "== dovecot sql (no secrets) =="; grep -vE 'password\s*=|connect' /etc/dovecot/dovecot-sqlite.conf.ext 2>/dev/null
echo "== password hash scheme in use =="; sqlite3 "$db" "select substr(password,1,instr(password,'}')) from mailboxes limit 3" 2>/dev/null | sort | uniq -c
echo "== who writes mail.sqlite (recent processes / panels) =="; ls -la --time-style=full-iso "$db"; grep -rlE '/etc/mail/mail\.sqlite' /opt /usr/local/bin /usr/local/sbin /etc/cron* /var/lib 2>/dev/null | head
systemctl list-units --type=service --no-pager --state=running 2>/dev/null | awk '{print $1}' | grep -vE '^(systemd|dbus|getty|sshd|chronyd|crond|rsyslog|auditd|irqbalance|firewalld|NetworkManager|polkit|postgresql|nginx|postfix|dovecot|rspamd|pdns|mutabe3)' | head -30
echo "== webmail present? =="; ls -d /var/www/*roundcube* /usr/share/roundcubemail /var/www/html/webmail /opt/*/roundcube* 2>/dev/null; grep -rlE 'roundcube|snappymail|rainloop' /etc/nginx/conf.d 2>/dev/null | head -3
echo "== loop: original submissions in last 2 h (uid + recipient domain only) =="
journalctl -u postfix --since '-2h' --no-pager -o cat 2>/dev/null | grep -E 'postfix/pickup.*uid=' | sed -E 's/.*uid=([0-9]+) from=<([^@>]*)@?([^>]*)>.*/uid=\1 from-domain=\3/' | sort | uniq -c | sort -rn | head
echo "== loop: recipients' domains of bounced (top) =="
journalctl -u postfix --since '-2h' --no-pager -o cat 2>/dev/null | grep 'status=bounced' | grep -oE 'to=<[^>]*>' | sed -E 's/to=<[^@]*@?([^>]*)>/\1/' | sort | uniq -c | sort -rn | head -3
echo "== loop: uid names =="; for u in $(journalctl -u postfix --since '-2h' --no-pager -o cat 2>/dev/null | grep -oE 'pickup.*uid=[0-9]+' | grep -oE '[0-9]+$' | sort -u); do getent passwd "$u" | cut -d: -f1,6; done
echo "== loop: a sample bounce chain (ids + status, addresses masked) =="
journalctl -u postfix --since '-10min' --no-pager -o cat 2>/dev/null | head -14 | sed -E 's/<[^>@]*@/<*@/g'
echo "== cron jobs mailing (MAILTO / lines, names only) =="; grep -lE '' /etc/cron.d/* 2>/dev/null | xargs -r grep -LE '^MAILTO=""' 2>/dev/null | head; ls -la --time-style=full-iso /etc/cron.d /var/spool/cron 2>/dev/null | head -20
