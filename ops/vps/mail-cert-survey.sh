#!/usr/bin/env bash
# Read-only (D-078 prep): how certificates are issued here, which nginx file serves mutabe3.news and its
# ACME path, and how Postfix/Dovecot pick a certificate per hostname (SNI) — before adding mail.mutabe3.news.
# Prints mutabe3 lines only from shared files; never key material.
set -uo pipefail
echo "== ACME clients =="; command -v certbot && certbot --version 2>&1; ls -d /root/.acme.sh 2>/dev/null; ls /etc/letsencrypt/live 2>/dev/null | grep -c . | sed 's/^/letsencrypt live certs: /'
echo "== mutabe3 cert =="; ls -la /etc/letsencrypt/live/ 2>/dev/null | grep -i mutabe3; for d in /etc/letsencrypt/renewal/*mutabe3*; do [ -f "$d" ] && { echo "--- $d"; grep -E 'authenticator|webroot|installer|server|renew_hook|deploy_hook|post_hook' "$d"; grep -A3 'webroot_map' "$d"; }; done
openssl x509 -in /etc/letsencrypt/live/mutabe3.news/fullchain.pem -noout -subject -ext subjectAltName -enddate 2>/dev/null
echo "== renewal timers =="; systemctl list-timers --no-pager 2>/dev/null | grep -iE 'certbot|acme' ; grep -rlE 'certbot|acme' /etc/cron.d /var/spool/cron 2>/dev/null
echo "== deploy hooks dir =="; ls -la /etc/letsencrypt/renewal-hooks/*/ 2>/dev/null
echo "== nginx files mentioning mutabe3 =="; grep -rlE 'mutabe3' /etc/nginx 2>/dev/null
for f in $(grep -rlE 'server_name[^;]*mutabe3' /etc/nginx 2>/dev/null); do echo "--- $f (mutabe3 server blocks)"; awk '/server[[:space:]]*\{/{buf="";depth=0;inb=1} inb{buf=buf $0 "\n"; depth+=gsub(/\{/,"{"); depth-=gsub(/\}/,"}"); if(depth==0){ if(buf ~ /mutabe3/) printf "%s", buf; inb=0 }}' "$f" | grep -E 'server_name|listen|root|acme|well-known|ssl_certificate|return|location' ; done
echo "== who answers http://mail.mutabe3.news/.well-known/ now =="; curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' -H 'Host: mail.mutabe3.news' http://127.0.0.1/.well-known/acme-challenge/probe
echo "== postfix SNI map (mutabe3 lines + format sample shape) =="; grep -c . /etc/postfix/sni_map; grep mutabe3 /etc/postfix/sni_map || echo "(no mutabe3 line)"; head -1 /etc/postfix/sni_map | awk '{print "line shape: <host> " NF-1 " path(s)"}'
echo "== dovecot =="; dovecot --version; doveconf -n 2>/dev/null | grep -nE '^(ssl|ssl_cert|ssl_key|local_name|protocols)' | sed -E 's/ssl_key = .*/ssl_key = <path>/' | head; doveconf -n 2>/dev/null | grep -c 'local_name' | sed 's/^/local_name blocks: /'
ls /etc/dovecot/conf.d/ | head -40
