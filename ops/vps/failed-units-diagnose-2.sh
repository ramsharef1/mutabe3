#!/usr/bin/env bash
# Read-only, second pass (D-060): who starts httpd at 03:00, the okath logrotate stanza and its directory,
# certbot hooks. The volatile journal had already dropped these lines, so read rsyslog/cron files instead.
# Changes nothing. Secret-looking values are masked. (no `| head` — pipefail/exit 141, D-048)
set -u
mask() { sed -E 's/((PASSWORD|PASS|SECRET|DATABASE_URL|TOKEN|KEY)[A-Z_]*[=:] *)[^ ]*/\1***/Ig'; }

echo "== A. httpd: what happened around its start (rsyslog /var/log/messages*) =="
for f in /var/log/messages /var/log/messages-*; do [ -f "$f" ] || continue
  grep -hE 'httpd|Apache|AH0[0-9]{4}' "$f" 2>/dev/null | grep -vE 'logrotate' | tail -n 14 | cut -c1-220
done
echo "-- lines 02:59–03:01 on 6 and 7 Oct --"
grep -hE '^Oct +[67] 0(2:59|3:00|3:01)' /var/log/messages 2>/dev/null | tail -n 40 | cut -c1-200

echo; echo "== B. cron at 02:55–03:05 (/var/log/cron*) =="
grep -hE '^Oct +[5-7] (02:5[5-9]|03:0[0-5])' /var/log/cron /var/log/cron-* 2>/dev/null | grep -E 'CMD|RUN|run-parts|STARTUP' | mask | cut -c1-220
echo "-- root crontab --"; crontab -l 2>/dev/null | grep -vE '^\s*(#|$)' | mask | cut -c1-200
echo "-- other user crontabs (names) --"; ls -1 /var/spool/cron 2>/dev/null | paste -sd' ' -
echo "-- /etc/cron.d --"; for f in /etc/cron.d/*; do echo "[$f]"; grep -vE '^\s*(#|$)' "$f" | mask | cut -c1-200; done
echo "-- scripts that mention httpd/apachectl --"
grep -rlsE 'httpd|apachectl' /usr/local/bin /usr/local/sbin /root /etc/cron.daily /etc/cron.hourly /etc/cron.weekly /opt 2>/dev/null --include='*.sh' --include='*.py' --include='*.php' | sed -n '1,20p'
grep -rlsE 'systemctl +(re)?start +httpd|service +httpd|apachectl' /usr/local /root /opt /etc 2>/dev/null | grep -vE '/(share|doc|man)/' | sed -n '1,20p'

echo; echo "== C. timers (all) =="; systemctl list-timers --all --no-pager 2>/dev/null | cut -c1-160

echo; echo "== D. packages touched recently =="
rpm -qa --last 2>/dev/null | sed -n '1,12p'
grep -hE '^2026-10-0[67]T0[23]:' /var/log/dnf.rpm.log 2>/dev/null | tail -n 12

echo; echo "== E. logrotate at 00:30 (/var/log/messages) =="
grep -hE 'logrotate' /var/log/messages 2>/dev/null | tail -n 12 | cut -c1-220
echo "-- exit code of a dry run --"; logrotate -d /etc/logrotate.conf >/dev/null 2>&1; echo "logrotate -d exit=$?"
echo "-- /etc/logrotate.d/okath --"; cat /etc/logrotate.d/okath 2>/dev/null
echo "-- /etc/logrotate.d/jugate-laravel (for comparison) --"; cat /etc/logrotate.d/jugate-laravel 2>/dev/null
L=/var/www/okath/current/storage/logs
echo "-- okath log path --"
for p in /var/www/okath /var/www/okath/current /var/www/okath/current/storage "$L"; do stat -c '%A %U:%G %n' "$p" 2>/dev/null; done
readlink -f /var/www/okath/current 2>/dev/null | sed 's/^/current → /'
ls -la "$L" 2>/dev/null | sed -n '1,15p'
echo "-- php-fpm pool users --"
grep -hsE '^\s*(\[|user|group|listen\.owner)\s*' /etc/php-fpm.d/*.conf /etc/opt/remi/php8*/php-fpm.d/*.conf 2>/dev/null | paste -sd' ' - | sed 's/\[/\n[/g'

echo; echo "== F. certbot hooks =="
grep -vE '^\s*(#|$)' /etc/sysconfig/certbot 2>/dev/null | mask
ls -1 /etc/letsencrypt/renewal-hooks/*/ 2>/dev/null
echo; echo "diagnosis 2 complete — nothing changed"
