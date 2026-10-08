#!/usr/bin/env bash
# D-081: the daily monitor stops using the administrator key.
#  1. healthcheck.sh is installed root-owned at /usr/local/lib/mutabe3/healthcheck.sh (a copy taken from this
#     run, not the deploy-owned checkout, so the deploy user cannot change what root executes).
#  2. mutabe3-facts.timer (root) writes its key=value output hourly and at 04:10 UTC to
#     /var/lib/mutabe3-monitor/facts.txt (atomic replace, 0644; the facts carry no secrets).
#  3. User mutabe3-monitor whose key is forced to `cat` that one file — no shell, no forwarding, no pty.
# Re-run after changing ops/vps/healthcheck.sh. Needs HEALTHCHECK (script text) and MONITOR_PUBKEY in env.
set -euo pipefail
U=mutabe3-monitor; D=/var/lib/mutabe3-monitor; L=/usr/local/lib/mutabe3
[ -n "${HEALTHCHECK:-}" ] && grep -q 'kv unit_backend' <<<"$HEALTHCHECK" || { echo "HEALTHCHECK missing — abort"; exit 1; }
grep -q '^ssh-ed25519 ' <<<"${MONITOR_PUBKEY:-}" || { echo "MONITOR_PUBKEY missing — abort"; exit 1; }

echo "== 1. healthcheck (root-owned copy) =="
install -d -m 755 -o root -g root "$L"
printf '%s\n' "$HEALTHCHECK" > "$L/healthcheck.sh.new"; chown root:root "$L/healthcheck.sh.new"; chmod 755 "$L/healthcheck.sh.new"; mv -f "$L/healthcheck.sh.new" "$L/healthcheck.sh"
sha256sum "$L/healthcheck.sh" | cut -c1-16 | sed 's/^/sha256: /'

echo "== 2. facts timer =="
install -d -m 755 -o root -g root "$D"
cat > /etc/systemd/system/mutabe3-facts.service <<EOF
[Unit]
Description=mutabe3: write server facts for the monitor (D-081)
[Service]
Type=oneshot
Nice=10
ExecStart=/bin/bash -c '$L/healthcheck.sh > $D/facts.txt.new && chmod 644 $D/facts.txt.new && mv -f $D/facts.txt.new $D/facts.txt'
EOF
cat > /etc/systemd/system/mutabe3-facts.timer <<'EOF'
[Unit]
Description=mutabe3: server facts hourly and before the 04:17 UTC daily check (D-081)
[Timer]
OnCalendar=hourly
OnCalendar=*-*-* 04:10:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now mutabe3-facts.timer >/dev/null 2>&1
systemctl start mutabe3-facts.service
echo "facts: $(wc -l < $D/facts.txt) lines · $(grep '^now=' $D/facts.txt) · timer $(systemctl is-active mutabe3-facts.timer)"

echo "== 3. monitor user =="
id "$U" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash --comment 'mutabe3 monitor, read-only (D-081)' "$U"
passwd -l "$U" >/dev/null 2>&1 || true
install -d -m 700 -o "$U" -g "$U" /home/$U/.ssh
printf 'restrict,command="/bin/cat %s/facts.txt" %s\n' "$D" "$MONITOR_PUBKEY" > /home/$U/.ssh/authorized_keys
chown "$U:$U" /home/$U/.ssh/authorized_keys; chmod 600 /home/$U/.ssh/authorized_keys
id "$U" | sed -E 's/uid=[0-9]+/uid=…/'
sudo -l -U "$U" 2>&1 | grep -q 'not allowed' && echo "sudo: none" || sudo -l -U "$U" | tail -2
echo "can read env file: $(sudo -u $U test -r /etc/mutabe3/backend.env && echo YES-unexpected || echo no)"
echo "can read facts: $(sudo -u $U test -r $D/facts.txt && echo yes || echo NO-unexpected)"
echo done
