#!/usr/bin/env bash
# PLAN Q3 (D-077): this Postfix resolves aliases from hash:/etc/postfix/virtual (virtual_alias_maps), not
# the SQLite aliases table — so editor@ ads@ corrections@ privacy@ noreply@ → info@mutabe3.news are
# appended there (mutabe3 lines only; file backed up; restored if postmap/verification fails).
set -euo pipefail
Z=mutabe3.news; V=/etc/postfix/virtual; BK=/root/mail-dns-backup; TS=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p -m 700 "$BK"; cp -p "$V" "$BK/virtual.$TS"; [ -f "$V.db" ] && cp -p "$V.db" "$BK/virtual.db.$TS"
restore() { trap - ERR; echo "!! restoring $V"; cp -p "$BK/virtual.$TS" "$V"; postmap "$V"; postfix reload >/dev/null 2>&1 || true; }
trap 'echo "failed at line $LINENO"; restore; exit 1' ERR
n=0
for a in editor ads corrections privacy noreply; do
  grep -qE "^$a@$Z[[:space:]]" "$V" || { printf '%s@%s\tinfo@%s\n' "$a" "$Z" "$Z" >> "$V"; n=$((n+1)); }
done
echo "appended $n line(s)"
postmap "$V"
ok=1; for a in editor ads corrections privacy noreply; do [ "$(postmap -q "$a@$Z" "hash:$V")" = "info@$Z" ] || ok=0; done
[ "$ok" = 1 ] || { restore; echo "✗ verification failed"; exit 1; }
trap - ERR
postfix check && postfix reload && echo "✓ aliases live; postfix reloaded"
echo "lines for other domains unchanged: $(grep -vc "@$Z" "$BK/virtual.$TS") → $(grep -vc "@$Z" "$V")"
