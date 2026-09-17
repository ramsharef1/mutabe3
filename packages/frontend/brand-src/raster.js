const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');
const dir = process.argv[2] || '.';

const jobs = [
  ['logo.svg', 'logo@2x.png', { mode: 'width', value: 1320 }],
  ['logo-white.svg', 'logo-white@2x.png', { mode: 'width', value: 1320 }],
  ['logo-lockup.svg', 'logo-lockup@2x.png', { mode: 'width', value: 1320 }],
  ['icon-app.svg', 'apple-icon.png', { mode: 'width', value: 180 }],
  ['icon-app.svg', 'icon-512.png', { mode: 'width', value: 512 }],
  ['icon.svg', 'icon-preview.png', { mode: 'width', value: 128 }],
  ['og.svg', 'opengraph-image.png', { mode: 'width', value: 1200 }],
  // previews on gray so transparency is visible
  ['logo.svg', 'preview-logo.png', { mode: 'width', value: 800 }, '#dfe6ee'],
  ['logo-white.svg', 'preview-white.png', { mode: 'width', value: 800 }, '#990000'],
  ['logo-lockup.svg', 'preview-lockup.png', { mode: 'width', value: 800 }, '#dfe6ee'],
];

for (const [src, out, fitTo, background] of jobs) {
  const svg = fs.readFileSync(path.join(dir, src), 'utf8');
  const r = new Resvg(svg, { fitTo, background });
  const img = r.render();
  fs.writeFileSync(path.join(dir, out), img.asPng());
  console.log(out, img.width + 'x' + img.height);
}
