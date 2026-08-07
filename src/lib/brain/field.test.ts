import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, fbm3, valueNoise3, unitVector } from './noise.ts';
import { sampleSurface, insideBrain, clampInside, projectToShell, BOUNDS, type Vec3 } from './geometry.ts';
import { consolidation, luminance, smoothstep, crossedStage } from './consolidation.ts';
import { buildField, positionAt, regionProgress } from './field.ts';
import { REGIONS, HIPPOCAMPUS } from './atlas.ts';
import { State, type Card } from '../../srs.ts';
import type { Word } from '../../types.ts';

const word = (id: string, field: string): Word => ({
  id, term: id, en: id, pos: 'noun', level: 'A1', gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field, kind: 'word',
});

const card = (over: Partial<Card>): Card => ({
  due: new Date(), stability: 0, difficulty: 5, elapsed_days: 0, scheduled_days: 0,
  learning_steps: 0, reps: 0, lapses: 0, state: State.Review, ...over,
} as Card);

describe('noise is seeded, never random', () => {
  it('gives the same stream for the same seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it('gives different streams for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('hashes strings stably', () => {
    expect(hashString('voc:A1:der Tisch')).toBe(hashString('voc:A1:der Tisch'));
    expect(hashString('voc:A1:der Tisch')).not.toBe(hashString('voc:A1:die Tür'));
  });

  it('keeps value noise in range and continuous', () => {
    for (let i = 0; i < 400; i++) {
      const v = valueNoise3(i * 0.37, i * 0.11, i * 0.53, 7);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    // Neighbouring samples must not jump, or the folding reads as static.
    const a = fbm3(1.0, 2.0, 3.0, 3);
    const b = fbm3(1.001, 2.0, 3.0, 3);
    expect(Math.abs(a - b)).toBeLessThan(0.02);
  });

  it('draws unit vectors', () => {
    const rnd = mulberry32(9);
    for (let i = 0; i < 200; i++) {
      const [x, y, z] = unitVector(rnd);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 6);
    }
  });
});

describe('the hull is a brain-shaped, deterministic point cloud', () => {
  const pts = sampleSurface(4000, 1);

  it('returns the count it was asked for', () => {
    expect(pts.length).toBe(4000 * 3);
  });

  it('is identical for the same seed', () => {
    expect(Array.from(sampleSurface(300, 5))).toEqual(Array.from(sampleSurface(300, 5)));
    expect(Array.from(sampleSurface(300, 5))).not.toEqual(Array.from(sampleSurface(300, 6)));
  });

  it('never leaves a point at the origin', () => {
    // A starved part used to leave a tail of zeroes, which draws as one very
    // bright dot in the dead centre of the brain.
    for (let i = 0; i < pts.length; i += 3) {
      expect(Math.hypot(pts[i], pts[i + 1], pts[i + 2])).toBeGreaterThan(1);
    }
  });

  it('stays inside a real head', () => {
    for (let i = 0; i < pts.length; i += 3) {
      expect(Math.abs(pts[i])).toBeLessThanOrEqual(BOUNDS.x);
      expect(pts[i + 1]).toBeGreaterThanOrEqual(BOUNDS.y[0]);
      expect(pts[i + 1]).toBeLessThanOrEqual(BOUNDS.y[1]);
      expect(pts[i + 2]).toBeGreaterThanOrEqual(BOUNDS.z[0]);
      expect(pts[i + 2]).toBeLessThanOrEqual(BOUNDS.z[1]);
    }
  });

  it('leaves the longitudinal fissure open', () => {
    // The gap between the hemispheres is what stops the silhouette reading as a
    // bean. If this fills in, the carving has stopped working.
    let inGap = 0;
    for (let i = 0; i < pts.length; i += 3) {
      if (pts[i + 2] > 30 && Math.abs(pts[i]) < 3) inGap++;
    }
    expect(inGap).toBe(0);
  });

  it('uses both hemispheres and the whole antero-posterior extent', () => {
    let left = 0, right = 0, front = 0, back = 0;
    for (let i = 0; i < pts.length; i += 3) {
      if (pts[i] < -10) left++;
      if (pts[i] > 10) right++;
      if (pts[i + 1] > 30) front++;
      if (pts[i + 1] < -70) back++;
    }
    for (const [n, label] of [[left, 'left'], [right, 'right'], [front, 'frontal'], [back, 'occipital']] as const) {
      expect(n, `${label} is empty`).toBeGreaterThan(50);
    }
  });

  it('clamps a stray point back inside and leaves an interior point alone', () => {
    expect(insideBrain(clampInside([200, 0, 0]))).toBe(true);
    expect(insideBrain(clampInside([0, -180, 0]))).toBe(true);
    const inner: Vec3 = [-20, -10, 10];
    expect(clampInside(inner)).toEqual(inner);
  });

  it('projects a point out to the shell without leaving the head', () => {
    const p = projectToShell([-30, -20, 10]);
    expect(insideBrain(p, 1.05)).toBe(true);
    expect(Math.hypot(...p)).toBeGreaterThan(Math.hypot(-30, -20, 10));
  });
});

describe('consolidation renders what the scheduler believes', () => {
  it('puts a new card in the hippocampus', () => {
    expect(consolidation(undefined)).toBe(0);
    expect(consolidation(card({ state: State.New }))).toBe(0);
  });

  it('barely moves a card still in learning', () => {
    const t = consolidation(card({ state: State.Learning, reps: 2 }));
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(0.12);
  });

  it('rises monotonically with stability, and is clamped', () => {
    let prev = -1;
    for (const stability of [0.5, 1, 2, 5, 15, 60, 200, 365, 5000]) {
      const t = consolidation(card({ stability }));
      expect(t).toBeGreaterThanOrEqual(prev);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
      prev = t;
    }
    expect(consolidation(card({ stability: 5000 }))).toBe(1);
  });

  it('is log-shaped, not linear', () => {
    // 1→8 days is the same amount of learning as 40→320. A linear ramp would
    // park everything the learner has met at the origin.
    const d1 = consolidation(card({ stability: 8 })) - consolidation(card({ stability: 1 }));
    const d2 = consolidation(card({ stability: 320 })) - consolidation(card({ stability: 40 }));
    expect(Math.abs(d1 - d2)).toBeLessThan(0.02);
  });

  it('dims a lapsing card but never puts it out', () => {
    expect(luminance(card({ stability: 30, lapses: 6 }))).toBeLessThan(luminance(card({ stability: 30, lapses: 0 })));
    for (const lapses of [0, 3, 10, 99]) {
      expect(luminance(card({ stability: 1, lapses }))).toBeGreaterThan(0.1);
    }
    expect(luminance(undefined)).toBeGreaterThan(0.1);
  });

  it('smoothstep stays in range and pins its ends', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(-5)).toBe(0);
    expect(smoothstep(5)).toBe(1);
  });

  it('notices a stage crossing and ignores a nudge', () => {
    expect(crossedStage(card({ state: State.New }), card({ state: State.Learning, reps: 1 }))).toBe(true);
    expect(crossedStage(card({ stability: 10 }), card({ stability: 40 }))).toBe(true);
    expect(crossedStage(card({ stability: 10 }), card({ stability: 10.05 }))).toBe(false);
  });
});

describe('the field gives every card a fixed seat', () => {
  const words = [
    word('voc:A1:der Hund', 'Animals'),
    word('voc:A1:die Uhr', 'Time'),
    word('voc:A1:das Haus', 'Home'),
    word('voc:B1:die Politik', 'Politics'),
  ];
  const f = buildField(words);

  it('indexes every card exactly once', () => {
    expect(f.ids).toHaveLength(4);
    expect(f.index.get('voc:A1:der Hund')).toBe(0);
    expect([...f.counts.values()].reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('is deterministic across builds and independent of array order', () => {
    const again = buildField(words);
    expect(Array.from(again.home)).toEqual(Array.from(f.home));

    const shuffled = buildField([words[3], words[1], words[0], words[2]]);
    const i = shuffled.index.get('voc:A1:der Hund')!;
    for (let k = 0; k < 3; k++) expect(shuffled.home[i * 3 + k]).toBeCloseTo(f.home[k], 5);
  });

  it('files each card under the region its meaning earns', () => {
    const regionOf = (id: string) => REGIONS[f.region[f.index.get(id)!]].id;
    expect(regionOf('voc:A1:der Hund')).toBe('ffg');
    expect(regionOf('voc:A1:die Uhr')).toBe('ips');
    expect(regionOf('voc:A1:das Haus')).toBe('ppa');
    expect(regionOf('voc:B1:die Politik')).toBe('tpj');
  });

  it('keeps every seat inside the head', () => {
    for (let i = 0; i < f.ids.length; i++) {
      const h: Vec3 = [f.home[i * 3], f.home[i * 3 + 1], f.home[i * 3 + 2]];
      const o: Vec3 = [f.origin[i * 3], f.origin[i * 3 + 1], f.origin[i * 3 + 2]];
      expect(insideBrain(h, 1.02), `home of ${f.ids[i]}`).toBe(true);
      expect(insideBrain(o, 1.02), `origin of ${f.ids[i]}`).toBe(true);
    }
  });

  it('starts a word at the hippocampus and ends it at its region', () => {
    const i = f.index.get('voc:A1:der Hund')!;
    const at0 = positionAt(f, i, 0);
    const at1 = positionAt(f, i, 1);
    expect(at0).toEqual([f.origin[i * 3], f.origin[i * 3 + 1], f.origin[i * 3 + 2]]);
    expect(at1[0]).toBeCloseTo(f.home[i * 3], 4);
    // The journey has to be long enough to be worth watching.
    expect(Math.hypot(at1[0] - at0[0], at1[1] - at0[1], at1[2] - at0[2])).toBeGreaterThan(10);
  });

  it('never lets a word cross the midline as it consolidates', () => {
    // Origin and home are drawn in the same hemisphere on purpose: a word
    // consolidating should travel outward, not swap sides mid-flight.
    const many = buildField(Array.from({ length: 300 }, (_, i) => word(`voc:A1:w${i}`, 'Animals')));
    for (let i = 0; i < many.ids.length; i++) {
      expect(Math.sign(many.origin[i * 3]) === Math.sign(many.home[i * 3]), `${many.ids[i]} crosses`).toBe(true);
    }
  });

  it('lateralises language form and leaves meaning bilateral', () => {
    const share = (field: string) => {
      const g = buildField(Array.from({ length: 600 }, (_, i) => word(`voc:A1:${field}${i}`, field)));
      let left = 0;
      for (let i = 0; i < g.ids.length; i++) if (g.home[i * 3] < 0) left++;
      return left / g.ids.length;
    };
    expect(share('Grammar')).toBeGreaterThan(0.8);   // Broca's, left-dominant
    expect(share('Animals')).toBeGreaterThan(0.35);  // fusiform, bilateral
    expect(share('Animals')).toBeLessThan(0.65);
  });

  it('reports per-region progress the rail can render', () => {
    const cards = new Map<string, Card>([['voc:A1:der Hund', card({ stability: 200 })]]);
    const p = regionProgress(f, (id) => cards.get(id));
    expect(p.get('ffg')!.total).toBe(1);
    expect(p.get('ffg')!.known).toBe(1);
    expect(p.get('ips')!.known).toBe(0);
    expect(p.get(HIPPOCAMPUS)!.total).toBe(0); // nothing is filed there by meaning
  });
});
