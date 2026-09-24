// The sky's painter — canvas code for `WordSky.tsx`, kept apart so the component
// reads as behaviour and this reads as light.
//
// A frame is built in layers, back to front: a faint backdrop, the unlit seeds, a
// bloom (the lit stars again, drawn small and blurred, so a well-learned region
// reads as a glow and not as a denser pattern of dots), the lit stars with their
// halos, a hot core in the strongest ones, and the coverage rings. Everything is
// grouped by colour and alpha so a frame is a few dozen fills, not thousands.
import { ringAt, type Star } from '../lib/sky.ts';

export interface Look {
  lit: boolean;
  /** CSS colour token, resolved at paint time so a theme switch repaints true. */
  ink: string;
  alpha: number;
  /** Known, and recall has fallen below the retention target. */
  fading: boolean;
  /** Radius multiplier — in the memory lens, how long the word will last. */
  size: number;
}

export interface Scene {
  size: number;
  stars: Star[];
  looks: Look[];
  dark: boolean;
  rings: number[];
}

/** Where every star is drawn this frame, in CSS px. */
export interface Placed {
  xs: Float32Array;
  ys: Float32Array;
  c: number;
  R: number;
  dot: number;
  scale: number;
}

export function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}

/** `#rrggbb` → `rgba(…, a)`, for gradient stops. Anything else passes through. */
export function withAlpha(hex: string, a: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const h = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function place(size: number, stars: Star[], scale = 1, rot = 0, into?: Placed): Placed {
  const n = stars.length;
  const c = size / 2, R = size / 2 - 10;
  const xs = into && into.xs.length === n ? into.xs : new Float32Array(n);
  const ys = into && into.ys.length === n ? into.ys : new Float32Array(n);
  const cos = Math.cos(rot) * R * scale, sin = Math.sin(rot) * R * scale;
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    xs[i] = c + s.x * cos - s.y * sin;
    ys[i] = c + s.x * sin + s.y * cos;
  }
  const dot = Math.max(0.75, (R / Math.sqrt(Math.max(1, n))) * 0.42) * Math.sqrt(scale);
  return { xs, ys, c, R, dot, scale };
}

const canFilter = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;

export function paintSky(ctx: CanvasRenderingContext2D, s: Scene, lit: (i: number) => boolean, p: Placed, bloom: HTMLCanvasElement | null) {
  const { size, looks, dark } = s;
  const n = s.stars.length;
  const { xs, ys, c, R, dot } = p;
  const edge = (R + 9) ** 2;
  const inside = (i: number) => (xs[i] - c) ** 2 + (ys[i] - c) ** 2 <= edge;
  const ink = new Map<string, string>();
  const inkOf = (name: string) => { let v = ink.get(name); if (!v) { v = token(name); ink.set(name, v); } return v; };

  ctx.save();
  // The backdrop: a window a shade apart from the page, fading out at the rim.
  const panel = inkOf('--color-panel');
  const g = ctx.createRadialGradient(c, c, 0, c, c, R + 9);
  g.addColorStop(0, withAlpha(panel, dark ? 0.9 : 0.95));
  g.addColorStop(0.7, withAlpha(panel, dark ? 0.55 : 0.6));
  g.addColorStop(1, withAlpha(panel, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(c, c, R + 9, 0, Math.PI * 2); ctx.fill();
  ctx.clip();

  // Unlit seeds — one path.
  ctx.fillStyle = inkOf('--color-line');
  ctx.globalAlpha = dark ? 0.85 : 1;
  ctx.beginPath();
  const ru = dot * 0.72;
  for (let i = 0; i < n; i++) {
    if (lit(i) || !inside(i)) continue;
    ctx.moveTo(xs[i] + ru, ys[i]); ctx.arc(xs[i], ys[i], ru, 0, Math.PI * 2);
  }
  ctx.fill();

  // Group the lit stars once; every layer below walks the groups.
  const groups = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const l = looks[i];
    if (!l.lit || !lit(i) || !inside(i)) continue;
    const key = `${l.ink}|${Math.round(l.alpha * 8)}|${Math.round(l.size * 4)}`;
    const arr = groups.get(key);
    if (arr) arr.push(i); else groups.set(key, [i]);
  }
  const parsed = [...groups].map(([key, idx]) => {
    const [name, a, z] = key.split('|');
    return { color: inkOf(name), a: Number(a) / 8, z: Number(z) / 4, idx };
  });

  // Bloom.
  if (bloom && parsed.length) {
    const bs = Math.max(16, Math.ceil(size / 4));
    if (bloom.width !== bs) { bloom.width = bs; bloom.height = bs; }
    const b = bloom.getContext('2d');
    if (b) {
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.clearRect(0, 0, bs, bs);
      b.setTransform(bs / size, 0, 0, bs / size, 0, 0);
      for (const gr of parsed) {
        b.fillStyle = gr.color;
        b.globalAlpha = gr.a;
        b.beginPath();
        const rb = dot * 2.4 * gr.z;
        for (const i of gr.idx) { b.moveTo(xs[i] + rb, ys[i]); b.arc(xs[i], ys[i], rb, 0, Math.PI * 2); }
        b.fill();
      }
      ctx.save();
      if (canFilter) ctx.filter = `blur(${Math.max(2, size / 90).toFixed(1)}px)`;
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      ctx.globalAlpha = dark ? 0.42 : 0.24;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bloom, 0, 0, bs, bs, 0, 0, size, size);
      ctx.restore();
    }
  }

  // Halos, then cores.
  if (dark) ctx.globalCompositeOperation = 'lighter';
  for (const gr of parsed) {
    ctx.fillStyle = gr.color;
    ctx.globalAlpha = gr.a * (dark ? 0.09 : 0.07);
    ctx.beginPath();
    const rh = dot * 2.1 * gr.z;
    for (const i of gr.idx) { ctx.moveTo(xs[i] + rh, ys[i]); ctx.arc(xs[i], ys[i], rh, 0, Math.PI * 2); }
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const gr of parsed) {
    ctx.fillStyle = gr.color;
    ctx.globalAlpha = gr.a;
    ctx.beginPath();
    const rc = dot * gr.z;
    for (const i of gr.idx) { ctx.moveTo(xs[i] + rc, ys[i]); ctx.arc(xs[i], ys[i], rc, 0, Math.PI * 2); }
    ctx.fill();
  }
  // A white-hot centre in the words that will last longest — at night only: on
  // paper a white centre reads as a hole, and the size already says it.
  if (dark && dot >= 1) {
    ctx.fillStyle = '#f4fbf1';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (const gr of parsed) {
      if (gr.z < 1.25 || gr.a < 0.86) continue;
      const rw = dot * 0.36 * gr.z;
      for (const i of gr.idx) { ctx.moveTo(xs[i] + rw, ys[i]); ctx.arc(xs[i], ys[i], rw, 0, Math.PI * 2); }
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Coverage rings: how many of the commonest k words are lit, as an arc that
  // closes when all of them are. Drawn over the stars so progress is never hidden.
  if (s.rings.length) {
    const maxK = Math.min(n, Math.max(...s.rings));
    const litUpTo = new Uint16Array(maxK + 1);
    let run = 0;
    for (let i = 0; i < maxK; i++) { if (looks[i].lit && lit(i)) run++; litUpTo[i + 1] = run; }
    const line = inkOf('--color-line'), green = inkOf('--color-green'), dim = inkOf('--color-dim'), bg = inkOf('--color-bg'), txt = inkOf('--color-txt');
    ctx.font = `600 9px ${token('--font-mono') || 'ui-monospace, monospace'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const k of s.rings) {
      if (k >= n) continue;
      const rr = ringAt(k, n) * R * p.scale;
      if (rr > R + 2 || rr < 6) continue;
      const cov = litUpTo[k] / k;
      ctx.lineWidth = 1;
      ctx.strokeStyle = line;
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(c, c, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (cov > 0) {
        // A dark keyline under a bright arc, so it reads over a lit region too.
        const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * cov;
        ctx.lineCap = 'round';
        ctx.strokeStyle = bg;
        ctx.lineWidth = 3.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(c, c, rr, a0, a1); ctx.stroke();
        ctx.strokeStyle = txt;
        ctx.lineWidth = 1.25;
        ctx.globalAlpha = 0.62;
        ctx.beginPath(); ctx.arc(c, c, rr, a0, a1); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const label = `${k >= 1000 ? `${k / 1000}k` : k} · ${Math.floor(cov * 100)}%`;
      const w = ctx.measureText(label).width + 10;
      ctx.fillStyle = withAlpha(bg, 0.88);
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(c - w / 2, c - rr - 7, w, 14, 7); else ctx.rect(c - w / 2, c - rr - 7, w, 14); ctx.fill();
      ctx.fillStyle = litUpTo[k] === k ? green : dim;
      ctx.fillText(label, c, c - rr);
    }
  }
  ctx.restore();
}
