// The shape of the thing, in MNI152 millimetres — the same space the atlas
// coordinates are quoted in, so a region never has to be converted to be placed.
//
// There is no mesh asset. The brain is assembled from five deformed
// superellipsoids merged at their seams, wrinkled by anisotropic fbm noise, and
// carved by twelve named sulci plus the interhemispheric fissure. Each point
// carries a surface normal and its signed relief, so the renderer can light the
// cortex rather than scatter dots across it. That choice is not only about
// bundle size, though a decimated cortical surface would have cost more than
// three.js itself. It is the idea: this brain is not a model with your
// vocabulary painted onto it, it is *made of* your vocabulary, and every point
// in it is a card.
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
  { id: 'cerebellum', center: [0, -62, -29],  radii: [42, 24, 19], weight: 0.15, fold: [0.190, 0.055], taper: 0.22, domeDrop: 0.10, flatten: 0.90, exp: 2.4 },
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

// The named sulci, as polylines through the left hemisphere, mirrored onto the
// right. Points near one are pushed inward, which draws a groove with two walls
// rather than punching a hole through the surface.
//
// There were three of these and the cortex read as noise with a couple of
// scratches in it. Gyral folding alone cannot make a brain recognisable: what
// the eye identifies is the *named* pattern — a central sulcus separating two
// parallel gyri, a Sylvian fissure with the temporal lobe under it, the
// parieto-occipital notch. Those are drawn, not left to fbm.
interface Sulcus { path: Vec3[]; reach: number; depth: number }

const SULCI: Sulcus[] = [
  // The three that decide the silhouette.
  { path: [[-44, 30, -12], [-50, 8, -6], [-51, -18, 4], [-47, -44, 14]], reach: 10, depth: 9 },   // Sylvian
  { path: [[-12, -26, 70], [-30, -20, 58], [-46, -12, 38], [-56, -6, 20]], reach: 5.5, depth: 7 }, // central
  { path: [[-6, -62, 46], [-18, -70, 34], [-26, -78, 20]], reach: 5, depth: 7 },                   // parieto-occipital

  // Frontal.
  { path: [[-18, 58, 18], [-22, 40, 34], [-24, 18, 46], [-24, -2, 56]], reach: 4.5, depth: 5 },    // superior frontal
  { path: [[-38, 52, 2], [-44, 34, 12], [-48, 14, 22]], reach: 4.5, depth: 5 },                    // inferior frontal
  { path: [[-20, -10, 64], [-38, -4, 50], [-52, 2, 28]], reach: 4.5, depth: 5 },                   // precentral
  { path: [[-16, -40, 68], [-36, -34, 54], [-52, -26, 32]], reach: 4.5, depth: 5 },                // postcentral

  // Parietal and occipital.
  { path: [[-26, -46, 54], [-34, -60, 46], [-38, -74, 32]], reach: 4.5, depth: 5 },                // intraparietal
  { path: [[-8, -74, 12], [-16, -88, 6], [-24, -96, 0]], reach: 4, depth: 5 },                     // calcarine

  // Temporal — two long grooves running with the lobe, which is most of what
  // makes the underside read as temporal rather than as a lump.
  { path: [[-52, 12, -22], [-58, -12, -14], [-56, -38, -6]], reach: 5, depth: 6 },                 // superior temporal
  { path: [[-50, 6, -38], [-56, -16, -32], [-54, -40, -24]], reach: 4.5, depth: 5 },               // inferior temporal

  // Medial.
  { path: [[-8, 34, 4], [-8, 20, 26], [-9, -10, 38], [-9, -40, 34]], reach: 4, depth: 4 },         // cingulate
];

function distToPath(p: Vec3, path: Vec3[]): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
    const apx = p[0] - a[0], apy = p[1] - a[1], apz = p[2] - a[2];
    const len2 = abx * abx + aby * aby + abz * abz;
    const t = len2 ? Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / len2)) : 0;
    const d = Math.hypot(apx - abx * t, apy - aby * t, apz - abz * t);
    if (d < best) best = d;
  }
  return best;
}

// A bounding sphere per sulcus, so a point that is nowhere near one costs a
// single squared-distance test instead of walking its segments. `sulcalDepth`
// runs three times per generated point (once for the point, twice for the finite
// differences behind its normal) across twelve sulci and both hemispheres, which
// made it comfortably the most expensive thing in the generator.
const SULCUS_BOUNDS = SULCI.map((s) => {
  const c: Vec3 = [0, 0, 0];
  for (const q of s.path) { c[0] += q[0]; c[1] += q[1]; c[2] += q[2]; }
  c[0] /= s.path.length; c[1] /= s.path.length; c[2] /= s.path.length;
  let r = 0;
  for (const q of s.path) r = Math.max(r, Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]));
  const reach = r + s.reach;
  return { c, r2: reach * reach };
});

/** How deep into a sulcus this point sits, in millimetres. Mirrored, so the
 *  right hemisphere is carved by the same lines. */
function sulcalDepth(p: Vec3): number {
  let pull = 0;
  const mx = -p[0];
  for (let i = 0; i < SULCI.length; i++) {
    const s = SULCI[i], b = SULCUS_BOUNDS[i];
    const dy = p[1] - b.c[1], dz = p[2] - b.c[2];
    const near = (p[0] - b.c[0]) ** 2 + dy * dy + dz * dz < b.r2;
    const nearMirror = (mx - b.c[0]) ** 2 + dy * dy + dz * dz < b.r2;
    if (!near && !nearMirror) continue;

    let d = Infinity;
    if (near) d = distToPath(p, s.path);
    if (nearMirror) d = Math.min(d, distToPath([mx, p[1], p[2]], s.path));
    if (d < s.reach) pull = Math.max(pull, s.depth * (1 - d / s.reach) ** 2);
  }
  return pull;
}

/** Gyral displacement at a point, as a fraction of radius. Negative is a sulcus.
 *
 *  The noise is sampled through a *stretched* coordinate. Isotropic fbm produces
 *  round bumps, and a cortex covered in round bumps reads as static; real gyri
 *  are elongated ridges. Compressing the antero-posterior axis of the lookup
 *  stretches the features along it, which is the difference between orange peel
 *  and something with a grain. */
function foldAt(part: Part, p: Vec3, seed: number): number {
  const [freq] = part.fold;
  return fbm3(p[0] * freq, p[1] * freq * 0.42, p[2] * freq * 0.85, seed);
}

/** A point on one part's folded, carved surface, with the signed relief that put
 *  it there. Curvature is handed back rather than recomputed: it is the same
 *  number the displacement already used, and the renderer darkens sulci with it. */
function surfacePoint(part: Part, d: Vec3, seed: number, out?: { curv: number }): Vec3 {
  const t = radialScale(part, d);
  const base: Vec3 = [
    part.center[0] + d[0] * t,
    part.center[1] + d[1] * t,
    part.center[2] + d[2] * t,
  ];
  const [, amp] = part.fold;
  const n = foldAt(part, base, seed);
  const k = 1 + amp * n;
  const p: Vec3 = [
    part.center[0] + (base[0] - part.center[0]) * k,
    part.center[1] + (base[1] - part.center[1]) * k,
    part.center[2] + (base[2] - part.center[2]) * k,
  ];

  const pull = sulcalDepth(p);
  if (out) {
    // Both sources of relief, on one scale: a named sulcus counts for much more
    // than a noise trough, because anatomically it is much deeper.
    out.curv = n - pull * 0.42;
  }
  if (!pull) return p;

  const dx = p[0] - part.center[0], dy = p[1] - part.center[1], dz = p[2] - part.center[2];
  const len = Math.hypot(dx, dy, dz) || 1;
  const s = Math.max(0, 1 - pull / len);
  return [part.center[0] + dx * s, part.center[1] + dy * s, part.center[2] + dz * s];
}

/** Two unit vectors orthogonal to `d` and to each other. */
function tangents(d: Vec3): [Vec3, Vec3] {
  const up: Vec3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let t1: Vec3 = [
    d[1] * up[2] - d[2] * up[1],
    d[2] * up[0] - d[0] * up[2],
    d[0] * up[1] - d[1] * up[0],
  ];
  const l1 = Math.hypot(...t1) || 1;
  t1 = [t1[0] / l1, t1[1] / l1, t1[2] / l1];
  const t2: Vec3 = [
    d[1] * t1[2] - d[2] * t1[1],
    d[2] * t1[0] - d[0] * t1[2],
    d[0] * t1[1] - d[1] * t1[0],
  ];
  return [t1, t2];
}

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Surface normal at `d`, by finite differences across the folded surface.
 *
 *  Two extra surface evaluations per point, which is the whole reason the
 *  substrate is generated in slices — but without it every point on the cortex
 *  is lit identically, no gyrus catches the light, and the brain reads as a
 *  cloud of dots rather than as a surface with a front and a back. */
function surfaceNormal(part: Part, d: Vec3, seed: number, p0: Vec3): Vec3 {
  const eps = 0.045;
  const [t1, t2] = tangents(d);
  const p1 = surfacePoint(part, norm([d[0] + t1[0] * eps, d[1] + t1[1] * eps, d[2] + t1[2] * eps]), seed);
  const p2 = surfacePoint(part, norm([d[0] + t2[0] * eps, d[1] + t2[1] * eps, d[2] + t2[2] * eps]), seed);

  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
  const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  const n = norm([ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]);

  // The cross product's sign follows the tangent basis, which flips over the
  // sphere. Force it to point away from the part's centre.
  const dot = n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
  return dot < 0 ? [-n[0], -n[1], -n[2]] : n;
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

/** A slab of cortex: positions, surface normals and signed relief. */
export interface Substrate {
  position: Float32Array;  // 3 per point, MNI mm
  normal: Float32Array;    // 3 per point, unit
  curv: Float32Array;      // 1 per point; negative is a sulcus
  count: number;
}

/** The substrate: `count` points scattered over the cortical shell.
 *
 *  Deterministic in `seed` — the same brain every reload, on every device. The
 *  seam test is what makes the five parts read as one organ: a candidate that
 *  falls well inside a *different* part is dropped, so the temporal lobes merge
 *  into the cerebrum instead of intersecting it like two crossing eggshells.
 *
 *  `stream` varies the *sampling* without touching the shape: the fold and the
 *  sulci stay keyed to `seed`, so two batches with different streams are two
 *  draws from the same brain and can simply be concatenated. That is what lets
 *  the renderer build density up in slices instead of blocking on one long
 *  synchronous pass. */
export function sampleSurface(count: number, seed = 1, stream = 0): Substrate {
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const curv = new Float32Array(count);
  const rnd = mulberry32(seed + stream * 7919);
  const relief = { curv: 0 };
  let n = 0;

  for (let i = 0; i < PARTS.length && n < count; i++) {
    const part = PARTS[i];
    const target = i === PARTS.length - 1
      ? count - n                                   // last part takes the remainder
      : Math.min(count - n, Math.round(count * part.weight));

    let made = 0, guard = 0;
    while (made < target && guard < target * 40) {
      guard++;
      const d = unitVector(rnd);
      const p = surfacePoint(part, d, seed, relief);
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

      const nv = surfaceNormal(part, d, seed, p);
      position[n * 3] = p[0]; position[n * 3 + 1] = p[1]; position[n * 3 + 2] = p[2];
      normal[n * 3] = nv[0]; normal[n * 3 + 1] = nv[1]; normal[n * 3 + 2] = nv[2];
      curv[n] = relief.curv;
      n++; made++;
    }
  }

  // A starved part (over-tight seams after a tuning change) would otherwise leave
  // a tail of zeroes at the origin — a bright dot in the middle of the brain.
  if (n === count) return { position, normal, curv, count: n };
  return {
    position: position.slice(0, n * 3),
    normal: normal.slice(0, n * 3),
    curv: curv.slice(0, n),
    count: n,
  };
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
