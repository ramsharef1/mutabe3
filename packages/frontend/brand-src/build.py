import sys, json
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
BLUE = "#2e6db4"


def shape(fontfile, text, size):
    data = open(fontfile, "rb").read()
    face = hb.Face(data)
    font = hb.Font(face)
    upem = face.upem
    font.scale = (upem, upem)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True, "calt": True})
    tt = TTFont(fontfile)
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    s = size / upem
    x = 0.0
    parts, clusters = [], []
    bp = BoundsPen(gs)
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        gx = (x + pos.x_offset) * s
        gy = -pos.y_offset * s
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}")
        gs[name].draw(TransformPen(pen, (s, 0, 0, -s, gx, gy)))
        d = pen.getCommands()
        if d:
            parts.append(d)
        gs[name].draw(TransformPen(bp, (s, 0, 0, -s, gx, gy)))
        clusters.append({"cluster": info.cluster, "x": gx, "adv": pos.x_advance * s, "name": name})
        x += pos.x_advance
    xmin, ymin, xmax, ymax = bp.bounds
    return " ".join(parts), (xmin, ymin, xmax, ymax), clusters


word_d, wb, wcl = shape(f"{OUT}/kufi-900.woff2", "المتابع", 100)
tag_d, tb, _ = shape(f"{OUT}/kufi-700.woff2", "موقع المتابع الاخباري", 22)

# --- geometry -------------------------------------------------------------
wx0, wy0, wx1, wy1 = wb
W = wx1 - wx0
H = wy1 - wy0
# ت is character index 3 in "المتابع"; seat the medallion on it
teh = [c for c in wcl if c["cluster"] == 3][0]
cx = teh["x"] + teh["adv"] / 2
# Letter body (ignoring ascenders of ا/ل): approximate as lower 62% of glyph height
body_top = wy1 - H * 0.62
cy = (body_top + wy1) / 2 - H * 0.045
r = H * 0.335
gap = 2.0
ring = 3.0

PAD = 6
vb_x = wx0 - PAD
vb_y = wy0 - PAD
vb_w = W + 2 * PAD
vb_h = H + 2 * PAD


def medallion(color, blue=BLUE, ring_w=None):
    ring_w = ring_w or ring
    mic_w, mic_h = r * 0.60, r * 0.92
    band_w, band_h = r * 1.10, r * 0.44
    return f"""
  <g transform="translate({cx:.2f} {cy:.2f})">
    <circle r="{r:.2f}" fill="none" stroke="{color}" stroke-width="{ring_w}"/>
    <rect x="{-mic_w/2:.2f}" y="{-r*0.86:.2f}" width="{mic_w:.2f}" height="{mic_h:.2f}" rx="{mic_w/2:.2f}" fill="{color}"/>
    <rect x="{-band_w/2:.2f}" y="{-r*0.10:.2f}" width="{band_w:.2f}" height="{band_h:.2f}" fill="{blue}"/>
    <path d="M{-r*0.18:.2f} {r*0.34:.2f} L{r*0.18:.2f} {r*0.34:.2f} L0 {r*0.90:.2f} Z" fill="{color}"/>
  </g>"""


def logo_svg(color, with_tag=False):
    tvb_h = vb_h
    tag = ""
    if with_tag:
        tx0, ty0, tx1, ty1 = tb
        # right-align tagline under the word, gray, small gap
        dx = wx1 - tx1
        dy = (wy1 + 14) - ty0
        tag = f'\n  <path transform="translate({dx:.2f} {dy:.2f})" d="{tag_d}" fill="{"#8a8a8a" if color != "#fff" else "#d0d0d0"}"/>'
        tvb_h = vb_h + (ty1 - ty0) + 14
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb_x:.2f} {vb_y:.2f} {vb_w:.2f} {tvb_h:.2f}" width="{vb_w*2:.0f}" height="{tvb_h*2:.0f}" role="img" aria-label="المتابع">
  <defs>
    <mask id="cut" maskUnits="userSpaceOnUse" x="{vb_x:.2f}" y="{vb_y:.2f}" width="{vb_w:.2f}" height="{tvb_h:.2f}">
      <rect x="{vb_x:.2f}" y="{vb_y:.2f}" width="{vb_w:.2f}" height="{tvb_h:.2f}" fill="#fff"/>
      <circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r + ring/2 + gap:.2f}" fill="#000"/>
    </mask>
  </defs>
  <path d="{word_d}" fill="{color}" mask="url(#cut)"/>{medallion(color)}{tag}
</svg>
"""


def icon_svg(bg=None, color="#111"):
    R = r
    size = R * 2.5
    bgrect = f'<rect width="{size:.2f}" height="{size:.2f}" rx="{size*0.18:.2f}" fill="{bg}"/>' if bg else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size:.2f} {size:.2f}" width="512" height="512" role="img" aria-label="المتابع">
  {bgrect}
  <g transform="translate({size/2 - cx:.2f} {size/2 - cy:.2f})">{medallion(color, ring_w=r * 0.17)}
  </g>
</svg>
"""


open(f"{OUT}/logo.svg", "w").write(logo_svg("#111"))
open(f"{OUT}/logo-white.svg", "w").write(logo_svg("#fff"))
open(f"{OUT}/logo-lockup.svg", "w").write(logo_svg("#111", with_tag=True))
open(f"{OUT}/icon.svg", "w").write(icon_svg())
open(f"{OUT}/icon-app.svg", "w").write(icon_svg(bg="#fff"))

# OG image 1200x630: white, logo centered, red rule + site name
og_scale = 800 / vb_w
lw, lh = vb_w * og_scale, vb_h * og_scale
lx, ly = (1200 - lw) / 2, 105
og = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#fff"/>
  <rect y="0" width="1200" height="14" fill="#990000"/>
  <g transform="translate({lx:.2f} {ly:.2f}) scale({og_scale:.4f}) translate({-vb_x:.2f} {-vb_y:.2f})">
    <defs>
      <mask id="cut2" maskUnits="userSpaceOnUse" x="{vb_x:.2f}" y="{vb_y:.2f}" width="{vb_w:.2f}" height="{vb_h:.2f}">
        <rect x="{vb_x:.2f}" y="{vb_y:.2f}" width="{vb_w:.2f}" height="{vb_h:.2f}" fill="#fff"/>
        <circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r + ring/2 + gap:.2f}" fill="#000"/>
      </mask>
    </defs>
    <path d="{word_d}" fill="#111" mask="url(#cut2)"/>{medallion("#111")}
  </g>
  <rect x="200" y="{ly + lh + 34:.0f}" width="800" height="3" fill="#a80101"/>
  <g transform="translate({600 - (tb[2]-tb[0]) * 2.1 / 2:.2f} {ly + lh + 64:.2f}) scale(2.1) translate({-tb[0]:.2f} {-tb[1]:.2f})">
    <path d="{tag_d}" fill="#333"/>
  </g>
</svg>
"""
open(f"{OUT}/og.svg", "w").write(og)

print(json.dumps({"word_bbox": [round(v, 1) for v in wb], "teh_x": round(cx, 1), "cy": round(cy, 1), "r": round(r, 1), "viewBox": [round(vb_x, 1), round(vb_y, 1), round(vb_w, 1), round(vb_h, 1)], "glyphs": [c["name"] for c in wcl]}))
