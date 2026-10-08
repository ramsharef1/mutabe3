#!/usr/bin/env bash
# PLAN Q3/Q5 (D-077) check: one labelled test message to editor@mutabe3.news, signed by the app's DKIM key
# exactly as the backend signs; confirm it lands in info@'s mailbox and that rspamd verifies DKIM + SPF
# against public DNS. Also: is port 25 reachable on the public IP, and does the backend report DKIM ready.
set -uo pipefail
Z=mutabe3.news
echo "== app DKIM status (backend env) =="; grep -E '^DKIM_(KEY_FILE|SELECTOR)=' /etc/mutabe3/backend.env
APP=$(systemctl show mutabe3-backend -p WorkingDirectory --value)
before=$(doveadm search -u "info@$Z" mailbox INBOX all 2>/dev/null | wc -l)
cd "$APP" && sudo -u mutabe3 env $(grep -E '^(DKIM_KEY_FILE|DKIM_SELECTOR)=' /etc/mutabe3/backend.env | xargs) node -e '
const nm = require(require.resolve("nodemailer", { paths: [process.cwd(), process.cwd() + "/packages/backend"] }));
const fs = require("fs");
const t = nm.createTransport({ host: "localhost", port: 25, secure: false, tls: { rejectUnauthorized: false },
  dkim: { domainName: "mutabe3.news", keySelector: process.env.DKIM_SELECTOR, privateKey: fs.readFileSync(process.env.DKIM_KEY_FILE, "utf8") } });
t.sendMail({ from: "المتابع <noreply@mutabe3.news>", to: "editor@mutabe3.news", subject: "اختبار البريد — يمكن حذفه",
  text: "رسالة اختبار من إعداد البريد (D-077). وصلت إلى info@ عبر editor@. يمكن حذفها." })
 .then((i) => console.log("sent:", i.response)).catch((e) => { console.error("send failed:", e.message); process.exit(1); });'
sleep 6
after=$(doveadm search -u "info@$Z" mailbox INBOX all 2>/dev/null | wc -l)
echo "== delivered to info@ =="; echo "INBOX messages: $before → $after"
uid=$(doveadm search -u "info@$Z" mailbox INBOX all 2>/dev/null | tail -1 | awk '{print $2}')
if [ -n "$uid" ]; then
  doveadm fetch -u "info@$Z" text mailbox INBOX uid "$uid" 2>/dev/null | sed '1d' > /tmp/m3-test.eml
  echo "== headers =="; grep -E '^(DKIM-Signature|Subject|From|To|Delivered-To):' /tmp/m3-test.eml | cut -c1-110
  echo "== rspamd verdict (DKIM/SPF/DMARC symbols) =="; rspamc -h 127.0.0.1:11333 -i 72.62.132.138 -F noreply@mutabe3.news symbols < /tmp/m3-test.eml 2>/dev/null | grep -E 'R_DKIM|R_SPF|DMARC' | sed 's/^ *//'
  rm -f /tmp/m3-test.eml
fi
echo "== public port 25 =="; timeout 6 bash -c "exec 3<>/dev/tcp/$(curl -s4 https://api.ipify.org)/25; head -1 <&3" 2>&1 | sed -E 's/[a-z0-9.-]+\.hstgr\.cloud/<host>/'
