// The shape of the thing, in MNI152 millimetres — the same space the atlas
// coordinates are quoted in, so a region never has to be converted to be placed.
//
// There is no mesh asset. The brain is assembled from five deformed ellipsoids
// merged at their seams, wrinkled by fbm noise, and carved by the three fissures
// that actually decide whether a silhouette reads as a brain: the longitudinal
// fissure between the hemispheres, the Sylvian fissure over the temporal lobe,
// and the central sulcus. That choice is not only about bundle size, though a
// decimated cortical surface would have cost more than three.js itself. It is
// the idea: this brain is not a model with your vocabulary painted onto it, it
// is *made of* your vocabulary, and every point in it is a card.
//
// Anatomical honesty stops at the silhouette and starts again at the
// coordinates. The hull is stylised; where the regions sit inside it is not.
import { fbm3, mulberry32, unitVector } from './noise.ts';

export type Vec3 = [number, number, number];

interface Part {
  id: string;
  center: Vec3;
  radii: Vec3;
  /** Share of the substrate points this part receives. */
  weight: number;
  /** Gyral wrinkle: spatial frequency (per mm) and amplitude (fraction of r). */
  fold: [freq: number, amp: number];
  /** Narrows the part toward its front and back poles. 0 = a plain ellipsoid. */
  taper: number;
  /** Lowers the roof toward both poles. Without it the cerebrum is a dome and
   *  the profile reads as a helmet rather than an ovoid. */
  domeDrop: number;
  /** Flattens the underside — the cerebrum sits on a skull base, it is not an egg. */
  flatten: number;
  /** Superellipsoid exponent. 2 is a plain ellipsoid, whose sides fall away as
   *  soon as they leave the equator — which drew the temporal lobes as ears
   *  stuck onto a mushroom cap, because the cerebrum had already narrowed to
   *  half-width by the height the lobes sit at. Above 2 the flanks stay vertical
   *  and the lateral surface runs flush from parietal down to temporal, which is
   *  what a brain actually does: its widest point *is* the temporal lobe. */
  exp: number;
}

// Overlap is the whole mechanism. Each part is sampled on its own surface, then
// any point falling *inside* another part is dropped, so what survives is the
// outer boundary of the union. A part that does not sit deep inside its
// neighbour cannot fuse with it — it just floats there.
//
// Two shapes were tried and thrown away, and both failures are instructive:
//   - a midline cerebrum with the temporal lobes and cerebellum merely *touching*
//     rendered as a mushroom — four separate bodies with visible daylight;
//   - splitting the cerebrum into two hemisphere blobs fixed the interhemispheric
//     fissure and broke everything below it, because the hemispheres then never
//     met at the midline and the cerebellum floated under a full-height canyon.
// Real hemispheres are joined under the corpus callosum. So: one cerebrum, and
// the longitudinal fissure is carved into its roof only.
const PARTS: Part[] = [
  { id: 'cerebrum',   center: [0, -14, 16],   radii: [66, 87, 60], weight: 0.62, fold: [0.055, 0.040], taper: 0.28, domeDrop: 0.22, flatten: 0.86, exp: 2.25 },
  { id: 'temporal-l', center: [-42, -10, -22], radii: [16, 44, 17], weight: 0.10, fold: [0.075, 0.034], taper: 0.28, domeDrop: 0.10, flatten: 0.95, exp: 2.2 },
  { id: 'temporal-r', center: [42, -10, -22],  radii: [16, 44, 17], weight: 0.10, fold: [0.075, 0.034], taper: 0.28, domeDrop: 0.10, flatten: 0.95, exp: 2.2 },
  // Cerebellar folia are far finer than cortical gyri, and rendering that
  // difference is most of what makes the back of the head read as a cerebellum.
  { id: 'cerebellum', center: [0, -64, -32],  radii: [40, 25, 21], weight: 0.15, fold: [0.190, 0.055], taper: 0.22, domeDrop: 0.10, flatten: 0.90, exp: 2.4 },
  { id: 'brainstem',  center: [0, -28, -46],  radii: [9, 12, 24],  weight: 0.03, fold: [0.100, 0.020], taper: 0.00, domeDrop: 0.00, flatten: 1.00, exp: 2.0 },
];

const PART_BY_ID = new Map(PARTS.map((p) => [p.id, p]));

/** Bounding box of the finished brain, for camera framing and 2D projection. */
export const BOUNDS = { x: 78, y: [-104, 76] as const, z: [-74, 78] as const };

/** Radius of `part` in unit direction `d`, before folding. */
function shapedRadius(part: Part, d: Vec3): Vec3 {
  const [, v, w] = d;
  const [rx, ry, rz] = part.radii;
  return [
    rx * (1 - part.taper * v * v),
    ry,
    rz * (w < 0 ? part.flatten : 1) * (1 - part.domeDrop * v * v),
  ];
}

/** Distance from `part`'s centre to its surface, along unit direction `d`. */
function radialScale(part: Part, d: Vec3): number {
  const [rx, ry, rz] = shapedRadius(part, d);
  const n = part.exp;
  const s = Math.abs(d[0] / rx) ** n + Math.abs(d[1] / ry) ** n + Math.abs(d[2] / rz) ** n;
  return s ** (-1 / n);
}

/** How far inside `part` a point is. < 1 is inside, 1 is the nominal surface. */
function depthIn(part: Part, p: Vec3): number {
  const dx = p[0] - part.center[0], dy = p[1] - part.center[1], dz = p[2] - part.center[2];
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return 0;
  return len / radialScale(part, [dx / len, dy / len, dz / len]);
}

/** Is this point inside the brain at all? `margin` < 1 asks for strictly inside. */
export function insideBrain(p: Vec3, margin = 1): boolean {
  for (const part of PARTS) if (depthIn(part, p) < margin) return true;
  return false;
}

// The fissures, as line segments in the left hemisphere. Points near one are
// pushed inward, which draws a groove with two walls rather than punching a hole.
const FISSURES: { a: Vec3; b: Vec3; reach: number; depth: number }[] = [
  { a: [-46, 26, -10], b: [-47, -50, 16], reach: 9, depth: 8 },  // Sylvian
  { a: [-16, -30, 66], b: [-56, -10, 24], reach: 6, depth: 6 },  // central sulcus
];

function distToSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const apx = p[0] - a[0], apy = p[1] - a[1], apz = p[2] - a[2];
  const len2 = abx * abx + aby * aby + abz * abz;
  const t = len2 ? Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / len2)) : 0;
  return Math.hypot(apx - abx * t, apy - aby * t, apz - abz * t);
}

/** Push a surface point into whichever fissure runs near it. Mirrored, so the
 *  right hemisphere is carved by the same lines. */
function carve(p: Vec3, part: Part): Vec3 {
  let pull = 0;
  const mirrored: Vec3 = [-p[0], p[1], p[2]];
  for (const f of FISSURES) {
    const d = Math.min(distToSegment(p, f.a, f.b), distToSegment(mirrored, f.a, f.b));
    if (d < f.reach) pull = Math.max(pull, f.depth * (1 - d / f.reach) ** 2);
  }
  if (!pull) return p;

  const dx = p[0] - part.center[0], dy = p[1] - part.center[1], dz = p[2] - part.center[2];
  const len = Math.hypot(dx, dy, dz) || 1;
  const k = Math.max(0, 1 - pull / len);
  return [part.center[0] + dx * k, part.center[1] + dy * k, part.center[2] + dz * k];
}

/** A point on one part's folded surface. */
function surfacePoint(part: Part, d: Vec3, seed: number): Vec3 {
  const t = radialScale(part, d);
  let p: Vec3 = [
    part.center[0] + d[0] * t,
    part.center[1] + d[1] * t,
    part.center[2] + d[2] * t,
  ];
  const [freq, amp] = part.fold;
  const n = fbm3(p[0] * freq, p[1] * freq, p[2] * freq, seed);
  const k = 1 + amp * n;
  p = [
    part.center[0] + (p[0] - part.center[0]) * k,
    part.center[1] + (p[1] - part.center[1]) * k,
    part.center[2] + (p[2] - part.center[2]) * k,
  ];
  return carve(p, part);
}

/** The interhemispheric gap, cut into the roof only. Without it the top of the
 *  brain is one unbroken dome and the whole thing reads as a bean; cut all the
 *  way down instead and the hemispheres stop being joined, which is worse. */
function inLongitudinalFissure(p: Vec3, seed: number): boolean {
  if (p[2] < 30) return false;
  const wobble = 1.8 * fbm3(p[1] * 0.05, p[2] * 0.05, seed * 0.001, seed, 2);
  // Widen with height so the slot opens out at the vertex instead of reading as
  // a rectangular notch punched through the roof.
  return Math.abs(p[0]) < (2.2 + (p[2] - 30) * 0.075) + wobble;
}

/** The substrate: `count` points scattered over the cortical shell.
 *
 *  Deterministic in `seed` — the same brain every reload, on every device. The
 *  seam test is what makes the five parts read as one organ: a candidate that
 *  falls well inside a *different* part is dropped, so the temporal lobes merge
 *  into the cerebrum instead of intersecting it like two crossing eggshells. */
export function sampleSurface(count: number, seed = 1): Float32Array {
  const out = new Float32Array(count * 3);
  const rnd = mulberry32(seed);
  let n = 0;

  for (let i = 0; i < PARTS.length && n < count; i++) {
    const part = PARTS[i];
    const target = i === PARTS.length - 1
      ? count - n                                   // last part takes the remainder
      : Math.min(count - n, Math.round(count * part.weight));

    let made = 0, guard = 0;
    while (made < target && guard < target * 40) {
      guard++;
      const p = surfacePoint(part, unitVector(rnd), seed);
      if (inLongitudinalFissure(p, seed)) continue;

      // Inside *any* other part means this point is interior to the union, not
      // on its surface. An earlier draft used 0.88 here, which kept a band of
      // points sitting just inside a neighbour and drew the parts as
      // intersecting eggshells instead of one organ.
      let buried = false;
      for (const other of PARTS) {
        if (other === part) continue;
        if (depthIn(other, p) < 0.99) { buried = true; break; }
      }
      if (buried) continue;

      out[n * 3] = p[0]; out[n * 3 + 1] = p[1]; out[n * 3 + 2] = p[2];
      n++; made++;
    }
  }

  // A starved part (over-tight seams after a tuning change) would otherwise leave
  // a tail of zeroes at the origin — a bright dot in the middle of the brain.
  return n === count ? out : out.slice(0, n * 3);
}

/** Nearest part to a point, for projecting and clamping. */
function nearestPart(p: Vec3): Part {
  let best = PARTS[0], bestD = Infinity;
  for (const part of PARTS) {
    const d = depthIn(part, p);
    if (d < bestD) { bestD = d; best = part; }
  }
  return best;
}

/** Move a point out to just under the cortical surface of whichever part it
 *  belongs to. Used for the regions the literature places in cortex; the deep
 *  structures are left where they are and seen through it. */
export function projectToShell(p: Vec3, frac = 0.96, seed = 1): Vec3 {
  const part = nearestPart(p);
  const dx = p[0] - part.center[0], dy = p[1] - part.center[1], dz = p[2] - part.center[2];
  const len = Math.hypot(dx, dy, dz) || 1;
  const d: Vec3 = [dx / len, dy / len, dz / len];
  const s = surfacePoint(part, d, seed);
  return [
    part.center[0] + (s[0] - part.center[0]) * frac,
    part.center[1] + (s[1] - part.center[1]) * frac,
    part.center[2] + (s[2] - part.center[2]) * frac,
  ];
}

/** Pull a stray point back inside the volume, along the ray to its nearest
 *  part's centre. Jitter around a region coordinate can otherwise leave a word
 *  hanging in the air outside the skull. */
export function clampInside(p: Vec3, margin = 0.97): Vec3 {
  const part = nearestPart(p);
  const d = depthIn(part, p);
  if (d <= margin) return p;
  const k = margin / d;
  return [
    part.center[0] + (p[0] - part.center[0]) * k,
    part.center[1] + (p[1] - part.center[1]) * k,
    part.center[2] + (p[2] - part.center[2]) * k,
  ];
}

export const partIds = () => [...PART_BY_ID.keys()];
