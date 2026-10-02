import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// The manifest is what an install sheet, a TWA wrapper (Bubblewrap/PWABuilder) and a
// store-packaging tool read first. Every field below was either missing or pointing
// at a stale asset before the 2026-09-25 panel review; these pin the ones a packager
// rejects on, and the one that silently orphans existing installs (`id`).

const pub = join(import.meta.dirname, '..', '..', 'public');
interface Img { src: string; sizes: string; type: string; purpose?: string; form_factor?: string; label?: string }
const m = JSON.parse(readFileSync(join(pub, 'manifest.webmanifest'), 'utf8')) as {
  id: string; start_url: string; scope: string; icons: Img[]; screenshots: Img[];
  shortcuts: { name: string; url: string; icons: Img[] }[];
};
const file = (src: string) => join(pub, src.replace(/^\.\//, ''));

/** Width × height from a baseline or progressive JPEG's SOF marker. */
function jpegSize(buf: Buffer): [number, number] {
  let o = 2;
  while (o < buf.length) {
    const marker = buf[o + 1], len = buf.readUInt16BE(o + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return [buf.readUInt16BE(o + 7), buf.readUInt16BE(o + 5)];
    o += 2 + len;
  }
  throw new Error('no SOF marker');
}
const pngSize = (buf: Buffer): [number, number] => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

describe('manifest.webmanifest', () => {
  it('keeps the identity existing installs already have', () => {
    // With no `id`, a browser uses `start_url` as the app's identity. Adding an `id`
    // that resolves anywhere else would make every installed Lexi a *different* app
    // to Chrome — a second icon, and a storage origin question nobody wants.
    const base = 'https://example.test/app/manifest.webmanifest';
    const start = new URL(m.start_url, base).href;
    expect(new URL(m.id, start).href).toBe(start);
  });

  it('every icon and screenshot file exists at the size it claims', () => {
    for (const img of [...m.icons, ...m.screenshots, ...m.shortcuts.flatMap((s) => s.icons)]) {
      expect(existsSync(file(img.src)), img.src).toBe(true);
      if (img.sizes === 'any') continue;
      const buf = readFileSync(file(img.src));
      const [w, h] = img.type === 'image/jpeg' ? jpegSize(buf) : pngSize(buf);
      expect(`${w}x${h}`, img.src).toBe(img.sizes);
    }
  });

  it('has the icons a packager asks for: 192 + 512 any, a maskable 512, and a 1024', () => {
    const has = (size: string, purpose: string) =>
      m.icons.some((i) => i.sizes === size && (i.purpose ?? 'any').split(' ').includes(purpose));
    expect(has('192x192', 'any')).toBe(true);
    expect(has('512x512', 'any')).toBe(true);
    expect(has('512x512', 'maskable')).toBe(true);
    expect(has('1024x1024', 'any')).toBe(true);
  });

  it('screenshots are phone-shaped, labelled, and inside the install sheet\'s limits', () => {
    // Chrome's richer install UI ignores screenshots whose long side exceeds 2.3× the
    // short side, or either side outside 320–3840 px.
    expect(m.screenshots.length).toBeGreaterThanOrEqual(1);
    for (const s of m.screenshots) {
      const [w, h] = s.sizes.split('x').map(Number);
      expect(s.form_factor, s.src).toBe('narrow');
      expect(s.label?.length, s.src).toBeGreaterThan(0);
      expect(Math.min(w, h)).toBeGreaterThanOrEqual(320);
      expect(Math.max(w, h)).toBeLessThanOrEqual(3840);
      expect(Math.max(w, h) / Math.min(w, h)).toBeLessThanOrEqual(2.3);
    }
  });

  it('offers Hören as a home-screen shortcut, on the URL App.tsx opens it from', () => {
    const listen = m.shortcuts.find((s) => s.name === 'Listen');
    expect(listen?.url).toBe('./?listen');
    const app = readFileSync(join(pub, '..', 'src', 'App.tsx'), 'utf8');
    expect(app).toMatch(/URLSearchParams\(location\.search\)\.has\('listen'\)/);
    // The retired "Start a walk" shortcut lives on in home screens that pinned it.
    expect(app).toMatch(/URLSearchParams\(location\.search\)\.has\('walk'\)/);
  });
});
