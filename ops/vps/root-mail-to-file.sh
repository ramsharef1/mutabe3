#!/usr/bin/env bash
# D-086: stop the root-mail bounce loop on the shared server without reading or changing any site's files.
# Cron mails root's job output to root@<mydomain> = root@hstgr.cloud, a domain with no MX, so every message
# bounces and the bounce bounces again (~60 an hour since 2026-10-08). Here:
#   /etc/postfix/virtual  root@hstgr.cloud → root@localhost   (a local domain, so it is delivered on the box)
#   /etc/aliases          root → /var/log/root-mail           (one file, 0600, rotated weekly, 4 weeks kept)
# Both files are backed up and restored if a check fails. Prints counts only — no message contents or senders.
set -euo pipefail
V=/etc/postfix/virtual; A=/etc/aliases; F=/var/log/root-mail; BK=/root/mail-dns-backup; TS=$(date -u +%Y%m%dT%H%M%SZ)
DOM=$(postconf -h mydomain); MARK='# mutabe3 ops (D-086)'
mkdir -p -m 700 "$BK"; cp -p "$V" "$BK/virtual.$TS"; cp -p "$A" "$BK/aliases.$TS"
restore() { trap - ERR; echo "!! restoring"; cp -p "$BK/virtual.$TS" "$V"; cp -p "$BK/aliases.$TS" "$A"; postmap "$V"; newaliases; postfix reload >/dev/null 2>&1 || true; }
trap 'echo "failed at line $LINENO"; restore; exit 1' ERR
echo "== pre-flight =="
echo "mydomain: $DOM · local destinations: $(postconf -h mydestination)"
if grep -qE '^root:' "$A" && ! grep -qE "^root:[[:space:]]*$F" "$A"; then echo "root already has a different alias in $A — leaving it alone"; trap - ERR; exit 1; fi
bounced_before=$(journalctl -u postfix --since '-10min' --no-pager -o cat 2>/dev/null | grep -c 'status=bounced' || true)
echo "bounces in the last 10 min: $bounced_before"

echo "== file + rotation =="
U=$(postconf -h default_privs)   # local(8) writes alias-file deliveries as this user
[ -f "$F" ] || install -m 600 -o "$U" -g root /dev/null "$F"
chown "$U":root "$F"; chmod 600 "$F"
cat > /etc/logrotate.d/root-mail <<EOF
$F {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    copytruncate
    create 0600 $U root
}
EOF
logrotate -d /etc/logrotate.d/root-mail >/dev/null 2>&1 && echo "logrotate config ok"

echo "== postfix + aliases =="
grep -qE "^root@$DOM[[:space:]]" "$V" || printf '%s\nroot@%s\troot@localhost\n' "$MARK" "$DOM" >> "$V"
grep -qE '^root:' "$A" || printf '%s\nroot:\t%s\n' "$MARK" "$F" >> "$A"
postmap "$V"; newaliases
[ "$(postmap -q "root@$DOM" "hash:$V")" = "root@localhost" ] || { echo "✗ virtual map"; restore; exit 1; }
postfix check; postfix reload >/dev/null && echo "postfix reloaded"
trap - ERR

echo "== test =="
size0=$(stat -c %s "$F")
printf 'Subject: D-086 root mail test\n\ntest\n' | /usr/sbin/sendmail root
sleep 8
size1=$(stat -c %s "$F")
[ "$size1" -gt "$size0" ] && echo "✓ test message written to $F (+$((size1 - size0)) bytes)" || { echo "✗ test message not in $F"; restore; exit 1; }
sleep 70
echo "bounces in the last minute after the change: $(journalctl -u postfix --since '-1min' --no-pager -o cat 2>/dev/null | grep -c 'status=bounced' || true)"
echo "deliveries to the file in the last 2 min: $(journalctl -u postfix --since '-2min' --no-pager -o cat 2>/dev/null | grep -c 'relay=local.*status=sent' || true)"
ls -l "$F" | awk '{print $1, $3, $4}'
echo done
