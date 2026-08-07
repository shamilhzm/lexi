// The field — one point of light per card, and where it sits.
//
// Two positions per neuron, fixed for the life of the lexicon:
//   `origin` — its seat in the hippocampus, where it starts
//   `home`   — its seat in the cortical region its meaning belongs to
// and one number that moves, `consolidation`, which slides it from one to the
// other. A word therefore has a *place*: it is in the same spot every time you
// open the app, and watching it leave the middle of the brain is watching the
// scheduler's stability estimate grow.
//
// Positions are derived from a hash of the card id, never from array order or
// `Math.random`. Two devices showing the same progress must draw the same brain,
// and a corpus rebuild that reorders `cards.json` must not shuffle the sky.
import { REGION_BY_ID, HIPPOCAMPUS, RESIDUAL, regionForCardId, REGIONS } from './atlas.ts';
import { clampInside, projectToShell, type Vec3 } from './geometry.ts';
import { hashString, mulberry32 } from './noise.ts';
import { consolidation, smoothstep } from './consolidation.ts';
import type { Word } from '../../types.ts';
import type { Card } from '../../srs.ts';

/** Roughly-normal jitter from three uniforms. Cheap, and the tails are short
 *  enough that a word rarely needs clamping back inside the skull. */
function jitter(rnd: () => number, scale: number): number {
  return (rnd() + rnd() + rnd() - 1.5) * scale;
}

/** A seat inside a region. `left` is carried in rather than drawn here so a
 *  word's hippocampal origin and its cortical home land in the same hemisphere
 *  — a word does not cross the midline as it consolidates. */
export function siteFor(regionId: string, left: boolean, seed: number): Vec3 {
  const r = REGION_BY_ID.get(regionId) ?? REGION_BY_ID.get(RESIDUAL)!;
  const rnd = mulberry32(seed);
  const sign = left ? 1 : -1; // atlas x is negative, i.e. already left

  let p: Vec3 = [
    r.mni[0] * sign + jitter(rnd, r.spread * 0.55),
    r.mni[1] + jitter(rnd, r.spread * 0.7),
    r.mni[2] + jitter(rnd, r.spread * 0.6),
  ];
  if (r.depth === 'surface') p = projectToShell(p, 0.94 + rnd() * 0.05);
  return clampInside(p);
}

export interface NeuronField {
  /** Card ids, index-aligned with every array below. */
  ids: string[];
  /** Index into `REGIONS`, so the renderer can colour by region without a map
   *  lookup per point per frame. */
  region: Uint8Array;
  /** xyz triples, MNI mm. */
  origin: Float32Array;
  home: Float32Array;
  index: Map<string, number>;
  /** Card count per region id — the number the rail shows. */
  counts: Map<string, number>;
}

const REGION_INDEX = new Map(REGIONS.map((r, i) => [r.id, i]));

/**
 * Build the static field for a lexicon.
 *
 * `fineGroupOf` is the sector → fine-corpus-group lookup. The app must pass
 * `SECTOR_FINEGROUP` from `src/data/index.ts` and *not* `SectorMeta.group`:
 * `GROUP_SUPER` mutates `group` in place at load into the ten coarse market
 * categories, and the atlas falls back on the sixteen fine ones.
 */
export function buildField(words: Word[], fineGroupOf?: (sector: string) => string | undefined): NeuronField {
  const n = words.length;
  const ids: string[] = new Array(n);
  const region = new Uint8Array(n);
  const origin = new Float32Array(n * 3);
  const home = new Float32Array(n * 3);
  const index = new Map<string, number>();
  const counts = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    const w = words[i];
    const rid = regionForCardId(w.id, w, fineGroupOf?.(w.field));
    const r = REGION_BY_ID.get(rid) ?? REGION_BY_ID.get(RESIDUAL)!;

    const seed = hashString(w.id);
    // One draw decides the hemisphere, then origin and home each get their own
    // stream so that changing one region's spread cannot reshuffle the other.
    const left = mulberry32(seed)() < r.lateralization;

    const o = siteFor(HIPPOCAMPUS, left, seed ^ 0x9e3779b9);
    const h = siteFor(rid, left, seed);

    ids[i] = w.id;
    region[i] = REGION_INDEX.get(rid) ?? REGION_INDEX.get(RESIDUAL)!;
    origin[i * 3] = o[0]; origin[i * 3 + 1] = o[1]; origin[i * 3 + 2] = o[2];
    home[i * 3] = h[0]; home[i * 3 + 1] = h[1]; home[i * 3 + 2] = h[2];
    index.set(w.id, i);
    counts.set(rid, (counts.get(rid) ?? 0) + 1);
  }

  return { ids, region, origin, home, index, counts };
}

/** Where neuron `i` is drawn right now, for a journey `t` in 0..1. */
export function positionAt(f: NeuronField, i: number, t: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const k = smoothstep(t);
  const j = i * 3;
  out[0] = f.origin[j] + (f.home[j] - f.origin[j]) * k;
  out[1] = f.origin[j + 1] + (f.home[j + 1] - f.origin[j + 1]) * k;
  out[2] = f.origin[j + 2] + (f.home[j + 2] - f.origin[j + 2]) * k;
  return out;
}

/** Fill `out` (3 floats per neuron) with current positions. One pass, no
 *  allocation — this runs on the store's version tick, not per frame. */
export function writePositions(f: NeuronField, out: Float32Array, cardOf: (id: string) => Card | undefined): void {
  for (let i = 0; i < f.ids.length; i++) {
    const k = smoothstep(consolidation(cardOf(f.ids[i])));
    const j = i * 3;
    out[j] = f.origin[j] + (f.home[j] - f.origin[j]) * k;
    out[j + 1] = f.origin[j + 1] + (f.home[j + 1] - f.origin[j + 1]) * k;
    out[j + 2] = f.origin[j + 2] + (f.home[j + 2] - f.origin[j + 2]) * k;
  }
}

/** Per-region progress, for the rail and for the post-session diff.
 *  `known` counts cards past halfway out of the hippocampus. */
export function regionProgress(f: NeuronField, cardOf: (id: string) => Card | undefined) {
  const out = new Map<string, { total: number; touched: number; known: number; sum: number }>();
  for (const r of REGIONS) out.set(r.id, { total: 0, touched: 0, known: 0, sum: 0 });

  for (let i = 0; i < f.ids.length; i++) {
    const rid = REGIONS[f.region[i]].id;
    const slot = out.get(rid)!;
    const t = consolidation(cardOf(f.ids[i]));
    slot.total++;
    if (t > 0) slot.touched++;
    if (t >= 0.5) slot.known++;
    slot.sum += t;
  }
  return out;
}
