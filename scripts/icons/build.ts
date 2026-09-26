// `npm run icons` — regenerate every app-icon PNG from `public/icon.svg`.
//
// The SVG is the mark; the PNGs are build products that happen to be committed,
// because the web deploy, iOS's apple-touch-icon and the store listings all need
// raster files at fixed paths. Change the SVG, run this, commit both.
// `raster.test.ts` fails if they drift apart.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ICONS, parseMark, render, encodePng } from './raster.ts';

const pub = join(import.meta.dirname, '..', '..', 'public');
const mark = parseMark(readFileSync(join(pub, 'icon.svg'), 'utf8'));

for (const { file, v, use } of ICONS) {
  const out = join(pub, file);
  mkdirSync(dirname(out), { recursive: true });
  const png = encodePng(render(mark, v), v.px, v.opaque);
  writeFileSync(out, png);
  console.log(`${file.padEnd(28)} ${String(v.px).padStart(4)} px  ${(png.length / 1024).toFixed(1).padStart(6)} KB  ${use}`);
}
