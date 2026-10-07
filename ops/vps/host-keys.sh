#!/usr/bin/env bash
# Read-only (D-073, SECURITY S-07): print this server's public SSH host keys and their fingerprints so the
# workflows can pin them instead of trusting whatever key answers (ssh-keyscan, trust on first use).
# Public keys only — never the private host keys.
set -euo pipefail
echo "== host: $(hostname) =="
for f in /etc/ssh/ssh_host_*_key.pub; do
  [ -f "$f" ] || continue
  echo "-- $f"
  echo "fingerprint: $(ssh-keygen -lf "$f")"
  echo "pubkey: $(cut -d' ' -f1,2 "$f")"
done
echo "== sshd HostKey lines =="
grep -E '^\s*HostKey ' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null || echo "(defaults)"
