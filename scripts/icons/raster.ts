// The app mark, rasterised from `public/icon.svg` — and nothing else.
//
// ## Why this exists
//
// Three marks shipped at once (panel review, 2026-09-25): the PNGs that iOS puts on
// the home screen and that link previews unfurl were still the **amber L on black**
// of the retired terminal identity, while `icon.svg`, the maskable icon and the boot
// splash were cyan on navy. Nothing tied the PNGs to the SVG, so the SVG changed and
// the PNGs did not. Every PNG is now *derived*, and `raster.test.ts` fails if a file on
// disk stops matching what this renders from the SVG.
//
// ## Why hand-rolled
//
// The mark is four axis-aligned rounded rectangles. A general SVG renderer would be a
// new dependency (or a system tool the CI machine does not have) to draw four boxes;
// a signed-distance test per sample is forty lines and is byte-for-byte reproducible
// on any machine with Node. It deliberately understands **only** `<rect>` with
// `x y width height rx fill` — the parser throws on anything else, so a redrawn mark
// that grows a `<path>` fails loudly here instead of rasterising wrong.
import { deflateSync, inflateSync } from 'node:zlib';

export interface Rect { x: number; y: number; w: number; h: number; rx: number; rgb: [number, number, number] }
export interface Mark { size: number; rects: Rect[] }

const hex = (s: string): [number, number, number] => {
  const m = /^#([0-9a-f]{6})$/i.exec(s.trim());
  if (!m) throw new Error(`icon.svg: fill must be #rrggbb, got "${s}"`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Read the mark. The first rect is the tile; the rest are drawn on it in order. */
export function parseMark(svg: string): Mark {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!vb || vb[1] !== vb[2]) throw new Error('icon.svg: expected a square viewBox starting at 0 0');
  const body = svg.replace(/<\?xml[^>]*>|<svg[^>]*>|<\/svg>|<!--[\s\S]*?-->/g, '').trim();
  const rects: Rect[] = [];
  for (const el of body.match(/<[^>]+>/g) ?? []) {
    if (!/^<rect\s/.test(el)) throw new Error(`icon.svg: only <rect> is supported, found ${el.slice(0, 40)}`);
    const a = (k: string, d?: number) => {
      const m = new RegExp(`\\s${k}="([^"]+)"`).exec(el);
      if (m) return m[1];
      if (d === undefined) throw new Error(`icon.svg: <rect> is missing ${k}`);
      return String(d);
    };
    rects.push({
      x: +a('x', 0), y: +a('y', 0), w: +a('width'), h: +a('height'), rx: +a('rx', 0), rgb: hex(a('fill')),
    });
  }
  if (!rects.length) throw new Error('icon.svg: no <rect> found');
  return { size: +vb[1], rects };
}

/** Signed distance to a rounded rectangle (negative inside). */
function sd(r: Rect, px: number, py: number): number {
  const rad = Math.min(r.rx, r.w / 2, r.h / 2);
  const qx = Math.abs(px - (r.x + r.w / 2)) - (r.w / 2 - rad);
  const qy = Math.abs(py - (r.y + r.h / 2)) - (r.h / 2 - rad);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
}

export interface Variant {
  /** Output edge in pixels. */
  px: number;
  /** Square the tile's corners — for every platform that applies its own mask
   *  (iOS home screen, App Store, Android adaptive icons). A pre-rounded tile under
   *  a platform mask shows a second, smaller rounding, or black corners on iOS. */
  bleed: boolean;
  /** No alpha channel. The App Store rejects a 1024 marketing icon with one. */
  opaque: boolean;
}

/** 4×4 supersampling: enough that the L's 3-unit corner radius reads as a curve at
 *  192 px, and a stable integer result, which is what the sync test compares. */
const SS = 4;

/** Straight RGBA, row-major, `px*px*4` bytes. */
export function render(mark: Mark, v: Variant): Uint8Array {
  const out = new Uint8Array(v.px * v.px * 4);
  const scale = mark.size / v.px;
  const rects = mark.rects.map((r, i) => (i === 0 && v.bleed ? { ...r, x: 0, y: 0, w: mark.size, h: mark.size, rx: 0 } : r));
  // A distance field is 1-Lipschitz, so a pixel whose centre is further than its
  // half-diagonal from every edge has all sixteen samples on the same side of every
  // edge. Those pixels — nearly all of them — take one sample and give the identical
  // result; only edge pixels pay for the supersampling.
  const halfDiag = scale * 0.7072;
  for (let y = 0; y < v.px; y++) {
    for (let x = 0; x < v.px; x++) {
      const i0 = (y * v.px + x) * 4;
      const cx = (x + 0.5) * scale, cy = (y + 0.5) * scale;
      if (rects.every((rc) => Math.abs(sd(rc, cx, cy)) > halfDiag)) {
        let hit: Rect | null = null;
        for (const rc of rects) if (sd(rc, cx, cy) <= 0) hit = rc;
        if (hit) { out[i0] = hit.rgb[0]; out[i0 + 1] = hit.rgb[1]; out[i0 + 2] = hit.rgb[2]; out[i0 + 3] = 255; }
        continue;
      }
      // Premultiplied accumulation, painter's order, per sample.
      let R = 0, G = 0, B = 0, A = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ux = (x + (sx + 0.5) / SS) * scale;
          const uy = (y + (sy + 0.5) / SS) * scale;
          let r = 0, g = 0, b = 0, a = 0;
          for (const rc of rects) {
            if (sd(rc, ux, uy) > 0) continue;
            r = rc.rgb[0]; g = rc.rgb[1]; b = rc.rgb[2]; a = 1; // opaque fills: last one wins
          }
          R += r * a; G += g * a; B += b * a; A += a;
        }
      }
      const n = SS * SS, i = (y * v.px + x) * 4;
      const alpha = A / n;
      out[i] = alpha ? Math.round(R / A) : 0;
      out[i + 1] = alpha ? Math.round(G / A) : 0;
      out[i + 2] = alpha ? Math.round(B / A) : 0;
      out[i + 3] = Math.round(alpha * 255);
    }
  }
  return out;
}

// ---- PNG -----------------------------------------------------------------------

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Encode straight RGBA as PNG — colour type 6, or 2 (RGB) when `opaque`. */
export function encodePng(rgba: Uint8Array, px: number, opaque: boolean): Buffer {
  const ch = opaque ? 3 : 4;
  const raw = Buffer.alloc(px * (px * ch + 1));
  for (let y = 0; y < px; y++) {
    const row = y * (px * ch + 1);
    raw[row] = 0; // filter: none — larger files, trivially decodable by the sync test
    for (let x = 0; x < px; x++) {
      const s = (y * px + x) * 4, d = row + 1 + x * ch;
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2];
      if (!opaque) raw[d + 3] = rgba[s + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(px, 0); ihdr.writeUInt32BE(px, 4);
  ihdr[8] = 8; ihdr[9] = opaque ? 2 : 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

/** Decode a PNG this module wrote (filter 0 only) back to straight RGBA. The sync
 *  test compares *pixels*, not bytes, so a different zlib build cannot fail it. */
export function decodeOwnPng(png: Uint8Array): { px: number; opaque: boolean; rgba: Uint8Array } {
  const b = Buffer.from(png);
  let o = 8, px = 0, type = 0;
  const idat: Buffer[] = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (t === 'IHDR') { px = d.readUInt32BE(0); type = d[9]; }
    if (t === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  const ch = type === 2 ? 3 : 4, raw = inflateSync(Buffer.concat(idat));
  const rgba = new Uint8Array(px * px * 4);
  for (let y = 0; y < px; y++) {
    const row = y * (px * ch + 1);
    if (raw[row] !== 0) throw new Error('decodeOwnPng: only filter 0 is supported (was this file written by scripts/icons?)');
    for (let x = 0; x < px; x++) {
      const s = row + 1 + x * ch, d = (y * px + x) * 4;
      rgba[d] = raw[s]; rgba[d + 1] = raw[s + 1]; rgba[d + 2] = raw[s + 2]; rgba[d + 3] = ch === 4 ? raw[s + 3] : 255;
    }
  }
  return { px, opaque: type === 2, rgba };
}

// ---- the set -------------------------------------------------------------------

/** Every PNG the app ships, and what each one is for. Paths are relative to `public/`.
 *  The four root files keep their names because `index.html` (apple-touch-icon,
 *  og:image) and `sw.js` (the precache list) point at them. */
export const ICONS: { file: string; v: Variant; use: string }[] = [
  { file: 'icon-180.png', v: { px: 180, bleed: true, opaque: true }, use: 'apple-touch-icon — iOS masks it; transparency would show black' },
  { file: 'icon-192.png', v: { px: 192, bleed: false, opaque: false }, use: 'manifest, purpose any' },
  { file: 'icon-512.png', v: { px: 512, bleed: false, opaque: false }, use: 'manifest, purpose any; og:image' },
  { file: 'icon-512-maskable.png', v: { px: 512, bleed: true, opaque: true }, use: 'manifest, purpose maskable' },
  { file: 'icons/icon-192-maskable.png', v: { px: 192, bleed: true, opaque: true }, use: 'manifest, purpose maskable (launcher size)' },
  { file: 'icons/icon-1024.png', v: { px: 1024, bleed: true, opaque: true }, use: 'App Store marketing icon; Play takes the 512' },
];
