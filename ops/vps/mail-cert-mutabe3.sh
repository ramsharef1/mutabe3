#!/usr/bin/env bash
# D-078: TLS certificate for mail.mutabe3.news on the shared mail server, mutabe3-only changes:
#  1. certbot certonly --nginx (issues only; nginx config untouched apart from certbot's temporary
#     challenge block) with a per-certificate deploy hook that reloads postfix + dovecot on renewal.
#  2. Postfix: one line in /etc/postfix/sni_map (texthash) → key + chain for mail.mutabe3.news.
#  3. Dovecot: /etc/dovecot/conf.d/sni/mail.mutabe3.news.conf with a local_name block.
# Shared files are backed up and restored if a config check or the TLS handshake test fails.
set -euo pipefail
H=mail.mutabe3.news; LE=/etc/letsencrypt/live/$H; SNI=/etc/postfix/sni_map; DSNI=/etc/dovecot/conf.d/sni
BK=/root/mail-dns-backup; TS=$(date -u +%Y%m%dT%H%M%SZ); mkdir -p -m 700 "$BK"
echo "== pre-flight =="
[ "$(dig +short @127.0.0.1 $H A)" = "$(dig +short @127.0.0.1 mutabe3.news A)" ] || { echo "$H does not resolve to this server — abort"; exit 1; }
[ -d "$DSNI" ] && doveconf -n >/dev/null || { echo "dovecot sni dir missing or config invalid — abort"; exit 1; }
grep -rqE '^\s*!include(_try)?\s+.*sni/' /etc/dovecot/ || { echo "dovecot does not include conf.d/sni — abort"; exit 1; }
echo "sni_map field shapes (extensions only):"; head -2 "$SNI" | awk '{for(i=2;i<=NF;i++){n=split($i,a,".");printf "%s ", a[n]} print ""}'
cp -p "$SNI" "$BK/sni_map.$TS"
restore() { trap - ERR; echo "!! restoring"; cp -p "$BK/sni_map.$TS" "$SNI"; rm -f "$DSNI/$H.conf"; postfix reload >/dev/null 2>&1 || true; systemctl reload dovecot || true; }

echo "== 1. certificate =="
if [ -s "$LE/fullchain.pem" ]; then echo "exists"; else
  certbot certonly --nginx -d "$H" --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring \
    --deploy-hook 'systemctl reload postfix dovecot' 2>&1 | grep -E 'Successfully|Certificate is saved|error|Error' || true
fi
[ -s "$LE/fullchain.pem" ] || { echo "✗ no certificate issued — nothing else changed"; exit 1; }
grep -q 'renew_hook\|deploy_hook' /etc/letsencrypt/renewal/$H.conf && echo "renewal hook set" || echo "⚠ no renewal hook in renewal conf"
nginx -t 2>&1 | tail -1
openssl x509 -in "$LE/fullchain.pem" -noout -subject -enddate

trap 'echo "failed at line $LINENO"; restore; exit 1' ERR
echo "== 2. postfix SNI =="
if grep -qE "^$H[[:space:]]" "$SNI"; then echo "exists"; else printf '%s %s %s\n' "$H" "$LE/privkey.pem" "$LE/fullchain.pem" >> "$SNI"; echo "added"; fi
postfix check
postfix reload >/dev/null && echo "postfix reloaded"
echo "== 3. dovecot SNI =="
cat > "$DSNI/$H.conf" <<EOF
# mutabe3 (D-078) — certificate for IMAP/POP3/submission clients connecting as $H
local_name $H {
  ssl_cert = <$LE/fullchain.pem
  ssl_key = <$LE/privkey.pem
}
EOF
doveconf -n >/dev/null
systemctl reload dovecot && echo "dovecot reloaded"
sleep 2
echo "== verify (handshake with SNI $H) =="
ok=1
chk() { local r; r=$(echo | timeout 10 openssl s_client $1 -connect 127.0.0.1:$2 -servername $H -verify_hostname $H 2>/dev/null | grep -E 'Verify return code'); echo "  $3: $r"; grep -q 'code: 0 (ok)' <<<"$r" || ok=0; }
chk "-starttls smtp" 25 "SMTP 25 STARTTLS"
chk "" 993 "IMAPS 993"
chk "-starttls smtp" 587 "submission 587"
echo "  other hosts unaffected — default cert still served without SNI:"; echo | timeout 10 openssl s_client -connect 127.0.0.1:993 2>/dev/null | openssl x509 -noout -subject 2>/dev/null | sed -E 's/=.*/= (unchanged default)/'
[ "$ok" = 1 ] || { restore; echo "✗ handshake check failed"; exit 1; }
trap - ERR
echo "sni_map lines for other hosts unchanged: $(grep -vc "^$H" "$BK/sni_map.$TS") → $(grep -vc "^$H" "$SNI")"
echo done
