#!/usr/bin/env bash
# Read-only (PLAN Q3/Q5): which DNS server answers for ns1/ns2.webhubteam.com on this VPS, where the
# mutabe3.news zone lives, and what mail software exists — before adding MX/SPF/DKIM/DMARC and forwarding.
# Prints no secrets: zone contents are public DNS data anyway; no key material is read.
set -uo pipefail
echo "== listening on :53 =="; ss -lntup 2>/dev/null | grep -E ':53\s' || echo "(nothing on 53)"
echo "== DNS services =="; for s in named named-chroot pdns pdns-server powerdns knot nsd unbound dnsmasq coredns; do systemctl is-active "$s" >/dev/null 2>&1 && echo "active: $s"; done
echo "== panels =="; for d in /usr/local/cpanel /usr/local/directadmin /usr/local/CyberCP /usr/local/hestia /usr/local/vesta /usr/local/psa /usr/local/webuzo /etc/webmin; do [ -e "$d" ] && echo "present: $d"; done
echo "== named config =="; for f in /etc/named.conf /etc/bind/named.conf; do [ -f "$f" ] && { echo "$f"; grep -nE 'zone|file|include|allow-transfer|also-notify|directory' "$f" | head -40; }; done
echo "== named includes =="; ls -la /etc/named* /var/named 2>/dev/null | head -40
echo "== zone files mentioning mutabe3 =="; grep -rlI 'mutabe3' /var/named /etc/named* /etc/bind /etc/pdns /etc/powerdns 2>/dev/null | head
echo "== mutabe3 zone (public records) =="; for f in $(grep -rlI 'mutabe3' /var/named /etc/bind 2>/dev/null | grep -v '\.conf' | head -2); do echo "--- $f"; ls -la "$f"; cat "$f"; done
echo "== pdns mutabe3 =="; command -v pdnsutil >/dev/null && pdnsutil list-zone mutabe3.news 2>&1 | head -40
echo "== zones served (count) =="; grep -rhoE 'zone\s+"[^"]+"' /etc/named.conf /etc/named* 2>/dev/null | sort -u | head -30
echo "== serial check =="; dig +short @127.0.0.1 mutabe3.news SOA 2>&1; dig +short @127.0.0.1 mutabe3.news MX 2>&1
echo "== mail software =="; for s in postfix exim dovecot opendkim rspamd; do printf '%s: ' "$s"; systemctl is-active "$s" 2>/dev/null || true; done
command -v postconf >/dev/null && postconf -n 2>/dev/null | grep -E '^(myhostname|mydomain|myorigin|inet_interfaces|mydestination|virtual_alias_domains|virtual_alias_maps|smtpd_milters|relayhost)'
echo "== port 25 =="; ss -lntp 2>/dev/null | grep -E ':25\s' || echo "(nothing listening on 25)"
echo "== outbound 25 test =="; timeout 6 bash -c 'echo > /dev/tcp/gmail-smtp-in.l.google.com/25' 2>&1 && echo "outbound 25 open" || echo "outbound 25 blocked/timeout"
echo "== PTR =="; dig +short -x 72.62.132.138
echo "== opendkim keys present (names only) =="; ls /etc/opendkim/keys 2>/dev/null || echo "(none)"
echo "== firewall 53/25 =="; firewall-cmd --list-services 2>/dev/null; firewall-cmd --list-ports 2>/dev/null
