#!/usr/bin/env bash
# D-079 (PLAN Q12, SECURITY S-07 + S-05): deploys stop running as the server's administrator account.
#  1. User mutabe3-deploy (no password, in group mutabe3 to read the env files), key from
#     ops/vps/keys/mutabe3-deploy.pub (restricted: no forwarding, no pty).
#  2. The checkout is owned by mutabe3-deploy, so git/npm ci/prisma/build run unprivileged.
#  3. One root helper, the only sudo it gets: `mutabe3-deploy-helper prepare|finish`
#     (prepare: .next back to the deploy user for the build; finish: .next to the service user + restart
#     the two mutabe3 units). Validated with visudo before it is installed.
#  4. S-05: SEAL_SECRET (new random) and FINGERPRINT_SALT (= current JWT_SECRET value, copied here and
#     never printed, so poll/view dedupe continues) added to backend.env if missing.
# Read from stdin by the ops workflow, so the public key is passed in as PUBKEY.
set -euo pipefail
U=mutabe3-deploy; SVC=mutabe3; ENVF=/etc/mutabe3/backend.env; FENV=/etc/mutabe3/frontend.env
APPDIR=$(systemctl show mutabe3-backend -p WorkingDirectory --value); APPDIR=${APPDIR%/packages/backend}
TOP=$(git -C "$APPDIR" rev-parse --show-toplevel)
echo "app: $APPDIR · checkout: $TOP"
[ -n "${PUBKEY:-}" ] && grep -q '^ssh-ed25519 ' <<<"$PUBKEY" || { echo "PUBKEY missing — abort"; exit 1; }

echo "== 1. user =="
id "$U" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash --comment 'mutabe3 deploys (D-079)' "$U"
passwd -l "$U" >/dev/null 2>&1 || true
usermod -aG "$SVC" "$U"
install -d -m 700 -o "$U" -g "$U" /home/$U/.ssh
printf 'restrict %s\n' "$PUBKEY" > /home/$U/.ssh/authorized_keys
chown "$U:$U" /home/$U/.ssh/authorized_keys; chmod 600 /home/$U/.ssh/authorized_keys
# sshd may restrict logins (AllowUsers/AllowGroups) — report, do not edit
sshd -T 2>/dev/null | grep -iE '^(allowusers|allowgroups|denyusers|denygroups|passwordauthentication|pubkeyauthentication) ' || true
for f in "$ENVF" "$FENV"; do [ -f "$f" ] && { chgrp "$SVC" "$f"; chmod 640 "$f"; }; done
ls -l "$ENVF" "$FENV" 2>/dev/null | awk '{print $1,$3,$4,$NF}'

echo "== 2. checkout ownership =="
NEXT="$APPDIR/packages/frontend/.next"
find "$TOP" -path "$NEXT" -prune -o -not -user "$U" -print0 | xargs -0 -r chown -h "$U:$SVC"
chmod -R g+rX,o+rX "$TOP" 2>/dev/null || true
echo "files not owned by $U outside .next: $(find "$TOP" -path "$NEXT" -prune -o -not -user "$U" -print | wc -l)"
UPL=$(grep '^UPLOAD_DIR=' "$ENVF" | cut -d= -f2-); echo "uploads (unchanged, service-owned): $(stat -c '%U' "${UPL:-/var/www/mutabe3/uploads}")"

echo "== 3. helper + sudo =="
cat > /usr/local/sbin/mutabe3-deploy-helper <<EOF
#!/usr/bin/env bash
# D-079: the only commands mutabe3-deploy may run as root.
set -euo pipefail
NEXT="$NEXT"
case "\${1:-}" in
  prepare) [ -d "\$NEXT" ] && chown -R $U:$SVC "\$NEXT"; echo "prepare: .next → $U" ;;
  finish)  chown -R $SVC: "\$NEXT"; systemctl restart mutabe3-frontend; systemctl restart mutabe3-backend || true; echo "finish: .next → $SVC; units restarted" ;;
  *) echo "usage: mutabe3-deploy-helper prepare|finish" >&2; exit 2 ;;
esac
EOF
chown root:root /usr/local/sbin/mutabe3-deploy-helper; chmod 755 /usr/local/sbin/mutabe3-deploy-helper
TMP=$(mktemp); printf '# D-079: mutabe3 deploys — exactly two commands, nothing else\nDefaults:%s !requiretty\n%s ALL=(root) NOPASSWD: /usr/local/sbin/mutabe3-deploy-helper prepare, /usr/local/sbin/mutabe3-deploy-helper finish\n' "$U" "$U" > "$TMP"
visudo -cf "$TMP" >/dev/null && install -m 440 -o root -g root "$TMP" /etc/sudoers.d/mutabe3-deploy && echo "sudoers installed"; rm -f "$TMP"
sudo -l -U "$U" | sed -n '/may run/,$p'

echo "== 4. separate secrets (S-05) =="
if ! grep -q '^SEAL_SECRET=' "$ENVF"; then printf 'SEAL_SECRET=%s\n' "$(openssl rand -hex 32)" >> "$ENVF"; echo "SEAL_SECRET added"; else echo "SEAL_SECRET exists"; fi
if ! grep -q '^FINGERPRINT_SALT=' "$ENVF"; then
  J=$(grep '^JWT_SECRET=' "$ENVF" | head -1 | cut -d= -f2-); [ -n "$J" ] || { echo "no JWT_SECRET — abort"; exit 1; }
  printf 'FINGERPRINT_SALT=%s\n' "$J" >> "$ENVF"; unset J; echo "FINGERPRINT_SALT added (= current JWT_SECRET value, keeps dedupe)"
else echo "FINGERPRINT_SALT exists"; fi
grep -cE '^(SEAL_SECRET|FINGERPRINT_SALT|JWT_SECRET|JWT_REFRESH_SECRET)=' "$ENVF" | sed 's/^/secret lines present: /'

echo "== 5. dry run as $U (no restart) =="
PATH_N=/opt/node22/bin:/usr/bin:/bin
sudo -u "$U" -H env PATH=$PATH_N bash -c "cd '$APPDIR' && git fetch --quiet origin main && git status --short | wc -l | sed 's/^/dirty files: /' && node -v && npm -v && set -a && . '$ENVF' && set +a && [ -n \"\$DATABASE_URL\" ] && echo 'env readable'"
sudo -u "$U" sudo -n /usr/local/sbin/mutabe3-deploy-helper bogus 2>&1 | head -1
sudo -u "$U" sudo -n /bin/true 2>&1 | head -1 | sed 's/^/arbitrary sudo: /'
echo done
