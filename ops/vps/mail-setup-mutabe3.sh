#!/usr/bin/env bash
# PLAN Q3/Q5 (D-077): mail for mutabe3.news on the shared VPS — touches only mutabe3.news.
#  1. DKIM key for the app (selector m3) at /etc/mutabe3/dkim/m3.private, readable by the service user;
#     DKIM_KEY_FILE/DKIM_SELECTOR added to backend.env, backend restarted (the app signs, D-077).
#  2. PowerDNS zone mutabe3.news: SPF, DKIM, DMARC (p=none), mail A + MX. Zone backed up first.
#  3. Shared mail DB (/etc/mail/mail.sqlite, backed up first): domain mutabe3.news, mailbox
#     info@mutabe3.news, and editor@ ads@ corrections@ privacy@ noreply@ delivered to it.
#     The mailbox password is generated here and written to /root/mutabe3-info-mailbox.txt (0600) —
#     never printed (this repo's logs are public).
# Idempotent: each step skips what already exists. Any failed check restores both backups.
set -euo pipefail
Z=mutabe3.news; SEL=m3; DB=/etc/mail/mail.sqlite; ENVF=/etc/mutabe3/backend.env
TS=$(date -u +%Y%m%dT%H%M%SZ); BK=/root/mail-dns-backup; mkdir -p -m 700 "$BK"
IP=$(dig +short @127.0.0.1 "$Z" A | head -1); [ -n "$IP" ] || { echo "no A record for $Z — abort"; exit 1; }

echo "== pre-flight =="
grep -qE '^launch=.*(gsqlite3|gmysql|gpgsql)' /etc/pdns/pdns.conf || { echo "PowerDNS backend is not SQL — pdnsutil edits unsupported, abort"; grep '^launch' /etc/pdns/pdns.conf; exit 1; }
command -v sqlite3 >/dev/null && command -v doveadm >/dev/null && command -v openssl >/dev/null || { echo "missing tool — abort"; exit 1; }
pdnsutil list-zone "$Z" > "$BK/$Z.$TS.zone"; cp -p "$DB" "$BK/mail.sqlite.$TS"
echo "backups: $BK/$Z.$TS.zone · $BK/mail.sqlite.$TS"
rollback() { trap - ERR; echo "!! rollback"; cp -p "$BK/mail.sqlite.$TS" "$DB"; pdnsutil load-zone "$Z" "$BK/$Z.$TS.zone" >/dev/null 2>&1 || true; pdnsutil increase-serial "$Z" >/dev/null 2>&1 || true; }
trap 'echo "failed at line $LINENO"; rollback' ERR

echo "== 1. DKIM key =="
install -d -m 750 -o root -g mutabe3 /etc/mutabe3/dkim
if [ ! -s /etc/mutabe3/dkim/$SEL.private ]; then
  openssl genrsa -out /etc/mutabe3/dkim/$SEL.private 2048 2>/dev/null; echo "generated"
else echo "exists"; fi
chown root:mutabe3 /etc/mutabe3/dkim/$SEL.private; chmod 640 /etc/mutabe3/dkim/$SEL.private
PUB=$(openssl rsa -in /etc/mutabe3/dkim/$SEL.private -pubout -outform der 2>/dev/null | base64 -w0)
grep -q '^DKIM_KEY_FILE=' "$ENVF" || echo "DKIM_KEY_FILE=/etc/mutabe3/dkim/$SEL.private" >> "$ENVF"
grep -q '^DKIM_SELECTOR=' "$ENVF" || echo "DKIM_SELECTOR=$SEL" >> "$ENVF"
sudo -u mutabe3 test -r /etc/mutabe3/dkim/$SEL.private && echo "service user can read key"

echo "== 2. DNS =="
have() { pdnsutil list-zone "$Z" | awk -v n="$1" -v t="$2" '$1==n && $4==t' | grep -q .; }
add() { if have "$1" "$3"; then echo "exists: $1 $3"; else pdnsutil add-record "$Z" "$1" "$3" 3600 "$4" >/dev/null && echo "added: $1 $3"; fi; }
if pdnsutil list-zone "$Z" | awk '$1=="'$Z'" && $4=="TXT"' | grep -qi 'v=spf1'; then echo "exists: SPF"; else pdnsutil add-record "$Z" "$Z" TXT 3600 "\"v=spf1 ip4:$IP ~all\"" >/dev/null && echo "added: SPF"; fi
DK="\"v=DKIM1; k=rsa; \" \"p=${PUB:0:200}\" \"${PUB:200}\""
add "$SEL._domainkey.$Z" "$SEL._domainkey" TXT "$DK"
add "_dmarc.$Z" _dmarc TXT "\"v=DMARC1; p=none; rua=mailto:info@$Z; adkim=r; aspf=r\""
add "mail.$Z" mail A "$IP"
add "$Z" @ MX "10 mail.$Z."
pdnsutil rectify-zone "$Z" >/dev/null 2>&1 || true
pdnsutil increase-serial "$Z" >/dev/null

echo "== 3. mailbox + aliases =="
MAILROOT=$(sqlite3 "$DB" "select maildir from mailboxes limit 1" | sed -E 's#/[^/]+/[^/]+/?$##')
[ -n "$MAILROOT" ] || MAILROOT=/home/boltweb/mail
sqlite3 "$DB" "insert or ignore into domains(name,active) values('$Z',1)"
DID=$(sqlite3 "$DB" "select id from domains where name='$Z'")
if [ -z "$(sqlite3 "$DB" "select 1 from mailboxes where email='info@$Z'")" ]; then
  PW=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)
  HASH=$(doveadm pw -s SHA512-CRYPT -p "$PW")
  install -d -o 2000 -g 2000 -m 700 "$MAILROOT/$Z"
  sqlite3 "$DB" "insert into mailboxes(domain_id,local_part,email,password,maildir,quota,active) values($DID,'info','info@$Z','$HASH','$MAILROOT/$Z/info',0,1)"
  umask 077; printf 'mailbox: info@%s\npassword: %s\nIMAP/SMTP host: mail.%s (IMAP 993 SSL, SMTP 587 STARTTLS)\nchange: doveadm pw -s SHA512-CRYPT, then update mailboxes.password in %s\n' "$Z" "$PW" "$Z" "$DB" > /root/mutabe3-info-mailbox.txt
  unset PW HASH; echo "created info@$Z (password in /root/mutabe3-info-mailbox.txt)"
else echo "exists: info@$Z"; fi
for a in editor ads corrections privacy noreply; do
  if [ -z "$(sqlite3 "$DB" "select 1 from aliases where source='$a@$Z'")" ]; then
    sqlite3 "$DB" "insert into aliases(domain_id,source,destination,type,active) values($DID,'$a@$Z','info@$Z','forward',1)"; echo "alias $a@ → info@"
  else echo "exists: $a@"; fi
done

echo "== verify =="
ok=1
[ "$(postmap -q "$Z" sqlite:/etc/postfix/sql/sqlite_virtual_domains.cf)" = "$Z" ] && echo "✓ postfix knows $Z" || { echo "✗ domain map"; ok=0; }
postmap -q "info@$Z" sqlite:/etc/postfix/sql/sqlite_virtual_mailbox_maps.cf >/dev/null && echo "✓ mailbox map" || { echo "✗ mailbox map"; ok=0; }
[ "$(postmap -q "editor@$Z" sqlite:/etc/postfix/sql/sqlite_virtual_alias_maps.cf)" = "info@$Z" ] && echo "✓ editor@ → info@" || { echo "✗ alias map"; ok=0; }
doveadm user "info@$Z" >/dev/null 2>&1 && echo "✓ dovecot user" || { echo "✗ dovecot user"; ok=0; }
for q in "$Z MX" "$Z TXT" "_dmarc.$Z TXT" "$SEL._domainkey.$Z TXT" "mail.$Z A"; do r=$(dig +short @127.0.0.1 $q | tr '\n' ' ' | cut -c1-90); echo "  $q → ${r:-∅}"; [ -n "$r" ] || ok=0; done
[ "$ok" = 1 ] || { rollback; exit 1; }
trap - ERR
SAN=$(openssl x509 -in /etc/ssl/bolt/fullchain.pem -noout -ext subjectAltName 2>/dev/null || true)
for h in "mail.$Z" "$(hostname -f)"; do grep -q "DNS:$h" <<<"$SAN" && echo "TLS cert covers $h" || echo "TLS cert does not cover $h"; done
systemctl restart mutabe3-backend; sleep 4; systemctl is-active mutabe3-backend
echo "other domains in mail DB unchanged: $(sqlite3 "$BK/mail.sqlite.$TS" 'select count(*) from domains') before → $(sqlite3 "$DB" "select count(*) from domains where name!='$Z'") now (excluding $Z)"
echo "done"
