#!/bin/sh
# Regenerates the brand raster assets from the sources in this folder (D-089, DESIGN-SYSTEM «Assets to produce»):
#   app/opengraph-image.png + app/twitter-image.png  ← og.html (1200×630)
#   app/favicon.ico (16/32/48)                       ← icon-small.svg (white plate, heavier ring)
#   app/apple-icon.png (180, flattened on white)     ← app/icon.svg (iOS paints transparency black)
# Needs macOS Google Chrome (headless; Satori cannot shape Arabic) and python3 with Pillow. Run from anywhere:
#   sh packages/frontend/scripts/brand/render.sh
set -eu
here=$(cd "$(dirname "$0")" && pwd)
app="$here/../../app"
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# shot <file> <w,h> <out.png> [transparent]
shot() {
  bg=""
  [ "${4:-}" = transparent ] && bg="--default-background-color=00000000"
  rm -f "$3"
  # Chrome writes the screenshot once the virtual-time budget (web-font load) has run, but does not always exit
  # afterwards: perl's alarm ends it; success is the file existing.
  perl -e 'alarm 45; exec @ARGV' "$CHROME" --headless --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
    --user-data-dir="$tmp/profile-$(basename "$3" .png)" --force-device-scale-factor=1 --window-size="$2" --virtual-time-budget=8000 \
    $bg --screenshot="$3" "file://$1" >/dev/null 2>&1 || true
  [ -s "$3" ] || { echo "no screenshot for $1" >&2; exit 1; }
}

shot "$here/og.html" 1200,630 "$tmp/og.png"
printf '<html><body style="margin:0;background:transparent"><img src="file://%s" style="display:block;width:256px;height:256px"></body></html>' \
  "$here/icon-small.svg" > "$tmp/small.html"
shot "$tmp/small.html" 256,256 "$tmp/small.png" transparent
printf '<html><body style="margin:0;background:#fff"><div style="width:540px;height:540px;display:flex;align-items:center;justify-content:center"><img src="file://%s" style="width:430px;height:430px"></div></body></html>' \
  "$app/icon.svg" > "$tmp/apple.html"
shot "$tmp/apple.html" 540,540 "$tmp/apple.png"

python3 -I - "$tmp" "$app" <<'PY'
import sys
from PIL import Image
tmp, app = sys.argv[1], sys.argv[2]
og = Image.open(f"{tmp}/og.png").convert("RGB")
assert og.size == (1200, 630), og.size
for name in ("opengraph-image.png", "twitter-image.png"):
    og.save(f"{app}/{name}", optimize=True)
small = Image.open(f"{tmp}/small.png").convert("RGBA")
assert small.size == (256, 256), small.size
small.save(f"{app}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
apple = Image.open(f"{tmp}/apple.png").convert("RGB").resize((180, 180), Image.LANCZOS)
apple.save(f"{app}/apple-icon.png", optimize=True)
print("written: opengraph-image.png twitter-image.png favicon.ico apple-icon.png")
PY
