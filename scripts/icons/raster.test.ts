import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ICONS, parseMark, render, encodePng, decodeOwnPng } from './raster.ts';

// The PNGs are committed build products of `public/icon.svg`. Three marks shipped at
// once before this existed (amber PNGs under a cyan SVG), because nothing noticed
// when one changed and the other did not. This is the thing that notices.

const pub = join(import.meta.dirname, '..', '..', 'public');
const mark = parseMark(readFileSync(join(pub, 'icon.svg'), 'utf8'));

describe('app icons are derived from icon.svg', () => {
  for (const { file, v } of ICONS) {
    it(`${file} matches a fresh render (run \`npm run icons\` if this fails)`, () => {
      const disk = decodeOwnPng(readFileSync(join(pub, file)));
      expect(disk.px).toBe(v.px);
      expect(disk.opaque).toBe(v.opaque);
      // Pixels, not bytes: a different zlib build must not fail this.
      expect(Buffer.from(disk.rgba).equals(Buffer.from(render(mark, v)))).toBe(true);
    });
  }

  it('every file the manifest names exists in the icon set', () => {
    const m = JSON.parse(readFileSync(join(pub, 'manifest.webmanifest'), 'utf8')) as {
      icons: { src: string; type: string }[]; shortcuts: { icons: { src: string }[] }[];
    };
    const pngs = [...m.icons, ...m.shortcuts.flatMap((s) => s.icons)]
      .filter((i) => i.src.endsWith('.png')).map((i) => i.src.replace(/^\.\//, ''));
    const known = new Set(ICONS.map((i) => i.file));
    for (const p of pngs) expect(known.has(p), p).toBe(true);
  });
});

describe('platform rules', () => {
  it('the App Store icon is 1024 and has no alpha channel', () => {
    const png = readFileSync(join(pub, 'icons/icon-1024.png'));
    expect(png[25]).toBe(2); // IHDR colour type: RGB
    expect(decodeOwnPng(png).px).toBe(1024);
  });

  it('maskable icons keep the mark inside the 80% safe zone', () => {
    // Android may crop a maskable icon to any shape that contains a centred circle
    // of radius 40% of the edge. Everything that is not the tile must sit inside it.
    for (const { file, v } of ICONS.filter((i) => i.file.includes('maskable'))) {
      const px = render(mark, v), c = v.px / 2;
      let far = 0;
      for (let y = 0; y < v.px; y++) {
        for (let x = 0; x < v.px; x++) {
          const i = (y * v.px + x) * 4;
          const isTile = px[i] === px[0] && px[i + 1] === px[1] && px[i + 2] === px[2];
          if (!isTile) far = Math.max(far, Math.hypot(x + 0.5 - c, y + 0.5 - c));
        }
      }
      expect(far, file).toBeGreaterThan(0); // the mark was drawn at all
      expect(far / v.px, file).toBeLessThanOrEqual(0.4);
    }
  });

  it('full-bleed variants have no transparent corner', () => {
    for (const { file } of ICONS.filter((i) => i.v.bleed)) {
      const { rgba } = decodeOwnPng(readFileSync(join(pub, file)));
      expect(rgba[3], file).toBe(255);
    }
  });
});

describe('the parser refuses what it cannot draw', () => {
  it('throws on a <path>, instead of silently dropping it', () => {
    expect(() => parseMark('<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="#000000"/><path d="M0 0"/></svg>'))
      .toThrow(/only <rect>/);
  });

  it('round-trips an encoded PNG', () => {
    const v = { px: 8, bleed: false, opaque: false };
    const rgba = render(mark, v);
    expect(Buffer.from(decodeOwnPng(encodePng(rgba, 8, false)).rgba).equals(Buffer.from(rgba))).toBe(true);
  });
});
