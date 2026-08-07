// Seeded, deterministic noise. Hand-rolled for the same reason `lib/treemap.ts`
// is: it is forty lines of pure arithmetic, and a dependency would cost more to
// audit than to write.
//
// Determinism is the requirement, not statistical purity. A word has to land in
// the same place every time the brain is drawn — across reloads, across the 2D
// and 3D renderers, and across two devices showing the same progress. Nothing
// here may read `Math.random`.

/** Fast, well-distributed 32-bit PRNG. Returns a function, so a caller can hold
 *  its own independent stream. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over a string. Turns a card id into a stable seed. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Integer lattice hash → [0, 1). */
function hash3(x: number, y: number, z: number, seed: number): number {
  let h = seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), h | 1);
  h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Trilinearly interpolated value noise, in [-1, 1]. */
export function valueNoise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);

  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), xf);
  const x10 = lerp(c(0, 1, 0), c(1, 1, 0), xf);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), xf);
  const x11 = lerp(c(0, 1, 1), c(1, 1, 1), xf);

  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf) * 2 - 1;
}

/** Fractal sum. Four octaves is where gyral folding stops getting better and
 *  starts costing frames — the surface sampler runs this per candidate point. */
export function fbm3(x: number, y: number, z: number, seed = 0, octaves = 4): number {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise3(x * freq, y * freq, z * freq, seed + i * 1013) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03; // not exactly 2: integer-lattice noise lines up on itself otherwise
  }
  return sum / norm;
}

/** A point on the unit sphere, from a stream. Marsaglia — no trig, no rejection
 *  bias at the poles. */
export function unitVector(rnd: () => number): [number, number, number] {
  for (;;) {
    const a = rnd() * 2 - 1, b = rnd() * 2 - 1;
    const s = a * a + b * b;
    if (s >= 1 || s === 0) continue;
    const k = 2 * Math.sqrt(1 - s);
    return [a * k, b * k, 1 - 2 * s];
  }
}
