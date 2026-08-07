// The 2D renderer — the same brain, drawn with a plain canvas and no dependency.
//
// It exists three times over, which is why it is worth its weight:
//   1. It paints the hero on the *first* frame, while `three` is still being
//      fetched in the background. Today is the app's first paint and the boot
//      budget has been fought for; the brain may not hold it up, and an empty
//      box that fills in half a second later is worse than no brain at all.
//   2. It is the whole renderer where WebGL is unavailable or the context is
//      lost — no apology, no missing feature, just fewer frames.
//   3. It draws the single static frame under `prefers-reduced-motion`.
//
// Same point set and same projection as the 3D scene, so the two never disagree
// about where a word lives.
import { REGION_COLOR, SUBSTRATE, VOID, type Rgb } from './palette.ts';
import { REGIONS } from './atlas.ts';

/** Rotate a brain-space point into view space.
 *
 *  Returns `[screenX, depth, screenY]`. Brain space is MNI: +x right, +y
 *  anterior, +z superior. Depth grows toward the viewer, so a larger value is
 *  nearer and gets drawn brighter. */
export function project(
  x: number, y: number, z: number,
  yaw: number, pitch: number,
  out: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rx = x * cy - y * sy;
  const ry = x * sy + y * cy;
  out[0] = rx;
  out[1] = ry * cp - z * sp;
  out[2] = ry * sp + z * cp;
  return out;
}

/** Scale that fits the brain's ~150mm span into the box with a little air. */
export function fitScale(width: number, height: number): number {
  return Math.min(width / 190, height / 150);
}

export interface FlatScene {
  /** Substrate points, xyz triples in MNI mm. The 2D renderer uses positions
   *  only — no lighting, which is part of why it is the lesser picture. */
  substrate: Float32Array;
  /** Current neuron positions, xyz triples. */
  positions: Float32Array;
  /** Index into `REGIONS`, one per neuron. */
  region: Uint8Array;
  /** 0..1 brightness, one per neuron. */
  lum: Float32Array;
  yaw: number;
  pitch: number;
  /** Device pixel ratio the canvas was sized at. A point is one *physical*
   *  pixel, so on a 2× display the same cloud is spread over four times the
   *  pixels and washes out to nothing — the stamp has to grow with it. */
  dpr?: number;
  /** Extra brightness for neurons that just fired, one per neuron. 0 normally. */
  flare?: Float32Array;
}

const COLORS = REGIONS.map((r) => REGION_COLOR[r.id] ?? SUBSTRATE);

/**
 * Paint one frame.
 *
 * Additive accumulation into an ImageData buffer rather than thousands of
 * `arc()` calls: at 45,000 substrate points the per-path overhead is the whole
 * frame budget, while a typed-array add is a few nanoseconds. The glow is a 3×3
 * falloff stamped per neuron — cheap, and enough bloom at these point sizes that
 * a real blur pass would not earn its cost.
 */
export function paintFlat(ctx: CanvasRenderingContext2D, w: number, h: number, s: FlatScene): void {
  const img = ctx.createImageData(w, h);
  const buf = img.data;

  // Background first, so the accumulation below is a true add over a known base.
  const bg = [parseInt(VOID.slice(1, 3), 16), parseInt(VOID.slice(3, 5), 16), parseInt(VOID.slice(5, 7), 16)];
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = bg[0]; buf[i + 1] = bg[1]; buf[i + 2] = bg[2]; buf[i + 3] = 255;
  }

  const scale = fitScale(w, h);
  const ox = w / 2, oy = h / 2;
  const p: [number, number, number] = [0, 0, 0];

  const px1 = Math.max(1, Math.round(s.dpr ?? 1));

  const add = (px: number, py: number, c: Rgb, gain: number) => {
    if (px < 0 || px >= w || py < 0 || py >= h) return;
    const k = (py * w + px) * 4;
    buf[k] = Math.min(255, buf[k] + c.r * gain);
    buf[k + 1] = Math.min(255, buf[k + 1] + c.g * gain);
    buf[k + 2] = Math.min(255, buf[k + 2] + c.b * gain);
  };

  /** One mark, `px1` physical pixels square, so density holds at any dpr. */
  const stamp = (px: number, py: number, c: Rgb, gain: number) => {
    for (let dy = 0; dy < px1; dy++) for (let dx = 0; dx < px1; dx++) add(px + dx, py + dy, c, gain);
  };

  // Depth runs about ±115mm; near points are brighter. The exponent is what
  // turns a flat scatter into something with a front and a back.
  const fade = (d: number) => Math.max(0.22, Math.min(1, (d + 118) / 236)) ** 1.5;

  for (let i = 0; i < s.substrate.length; i += 3) {
    project(s.substrate[i], s.substrate[i + 1], s.substrate[i + 2], s.yaw, s.pitch, p);
    stamp(Math.round(ox + p[0] * scale), Math.round(oy - p[2] * scale), SUBSTRATE, 118 * fade(p[1]));
  }

  const n = s.lum.length;
  for (let i = 0; i < n; i++) {
    const lum = s.lum[i];
    if (lum <= 0) continue;
    const j = i * 3;
    project(s.positions[j], s.positions[j + 1], s.positions[j + 2], s.yaw, s.pitch, p);
    const px = Math.round(ox + p[0] * scale), py = Math.round(oy - p[2] * scale);
    const c = COLORS[s.region[i]];
    const gain = (330 + 260 * (s.flare?.[i] ?? 0)) * lum * fade(p[1]);
    const g = px1;

    stamp(px, py, c, gain);
    // A cross rather than a full 3×3: the diagonals add cost and almost no glow.
    stamp(px - g, py, c, gain * 0.34);
    stamp(px + g, py, c, gain * 0.34);
    stamp(px, py - g, c, gain * 0.34);
    stamp(px, py + g, c, gain * 0.34);
    if (gain > 260) {
      stamp(px - g * 2, py, c, gain * 0.12);
      stamp(px + g * 2, py, c, gain * 0.12);
      stamp(px, py - g * 2, c, gain * 0.12);
      stamp(px, py + g * 2, c, gain * 0.12);
    }
  }

  ctx.putImageData(img, 0, 0);
}
