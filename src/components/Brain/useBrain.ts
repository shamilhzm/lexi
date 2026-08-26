// The state behind the brain: the static field, the live positions, and the
// flares fired by grading a card.
//
// Split out of the view because two surfaces render the same brain at two sizes
// — the hero on Today and the room at `#/brain` — and because everything here is
// testable arithmetic while none of it is markup.
import { useEffect, useMemo, useRef, useState } from 'react';
import { WORDS, SECTOR_FINEGROUP, BY_ID } from '../../data/index.ts';
import { cardOf, onCardEvent } from '../../store.ts';
import { useStore } from '../../useStore.ts';
import { buildField, writePositions, regionProgress, fromCards, type Consolidation } from '../../lib/brain/field.ts';
import { consolidation, luminance, crossedStage, simulatedConsolidation } from '../../lib/brain/consolidation.ts';
import { sampleSurface, type Substrate } from '../../lib/brain/geometry.ts';
import { regionForCardId } from '../../lib/brain/atlas.ts';

/** How much tissue each surface draws. The hero is a 240px strip on the app's
 *  first-paint screen, so it takes the cheap cloud; the room gets the dense one
 *  a full-bleed surface can carry. */
export const SUBSTRATE_COUNT = { hero: 34000, room: 130000 } as const;

/** How long a graded neuron stays lit, in ms. Long enough to notice on the
 *  surface you are looking at, short enough not to still be burning when the
 *  next card is graded. */
const FLARE_MS = 1400;

/**
 * @param simulate  Fraction of the lexicon to *pretend* is consolidated, 0..1,
 *   or null for the truth. Read-only: it substitutes the consolidation function
 *   and never touches the store, so scrubbing it cannot damage real progress.
 */
export function useBrainField(simulate: number | null = null) {
  const v = useStore();

  // The field is static: it depends on the lexicon, not on progress. Rebuilding
  // it on every review would recompute one surface projection per card for nothing.
  const field = useMemo(
    () => buildField(WORDS, (s) => SECTOR_FINEGROUP.get(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [WORDS.length],
  );

  // Recomputed on the store version, not per frame: one log() per card every
  // frame would be most of the budget, and the values only move when a card is
  // graded. Same shape as the `useMemo(..., [v])` pattern the rest of the app
  // uses for store-derived data.
  //
  // Fresh arrays each time rather than writing into ones held across renders.
  // Mutating a value produced by an earlier render is not safe under concurrent
  // React and the compiler rejects it outright; ~120KB per grade is a cheaper
  // price than a torn frame.
  const tOf: Consolidation = useMemo(
    () => (simulate === null ? fromCards(cardOf) : (id: string) => simulatedConsolidation(id, simulate)),
    [simulate],
  );

  const { positions, lum } = useMemo(() => {
    const pos = new Float32Array(field.ids.length * 3);
    const light = new Float32Array(field.ids.length);
    writePositions(field, pos, tOf);
    for (let i = 0; i < field.ids.length; i++) {
      // In preview the synthetic journey *is* the brightness — there are no
      // lapses to dim a word that does not exist.
      light[i] = simulate === null
        ? luminance(cardOf(field.ids[i]))
        : Math.max(0.14, 0.35 + 0.65 * tOf(field.ids[i]));
    }
    return { positions: pos, lum: light };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, v, tOf, simulate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const progress = useMemo(() => regionProgress(field, tOf), [field, v, tOf]);

  return { field, positions, lum, progress, revision: v };
}

export interface Flare { index: number; at: number; moved: boolean }

// ---- what the session changed --------------------------------------------
// A session is a full-bleed early return: the brain is not mounted while you
// study, so every flare fired during a session would be fired at nobody. This
// module-level log is subscribed once, for the life of the tab, and replayed the
// next time a brain mounts — which is how coming back to Today shows you what
// you just did rather than a brain that has silently changed behind your back.
//
// This is DESIGN.md §7 "Data change": *a number or area that changed because the
// learner did something animates from its old value.*
interface Change { id: string; at: number; moved: boolean }

const changes: Change[] = [];
/** Anything older than this is not "what you just did" any more. */
const REPLAY_WINDOW_MS = 20 * 60_000;
/** A whole session's worth, and no more — the ignition should read as a burst. */
const REPLAY_MAX = 120;
/** Gap between neurons in the replay sequence. */
const REPLAY_STAGGER_MS = 26;

if (typeof window !== 'undefined') {
  onCardEvent((e) => {
    if (e.undo) {
      // A rewound review did not happen, so it is not something to celebrate on
      // the way back to Today either.
      const i = changes.findIndex((c) => c.id === e.id);
      if (i >= 0) changes.splice(i, 1);
      return;
    }
    changes.push({ id: e.id, at: e.at, moved: crossedStage(e.before, e.after) });
    if (changes.length > 400) changes.shift();
  });
}

/** Which regions this session touched, most-touched first — *without* draining.
 *
 *  The recap runs before any brain mounts, so it reads the same log the ignition
 *  will later replay. Peeking rather than draining is deliberate: the recap says
 *  where the work landed, and then Today shows it landing. Two views of one fact,
 *  in the order they happen.
 *
 *  `fineGroupOf` is threaded in for the same reason as everywhere else — the
 *  atlas needs the *fine* corpus group, not the coarse market category. */
export function peekChangedRegions(): { id: string; n: number }[] {
  const cutoff = Date.now() - REPLAY_WINDOW_MS;
  const tally = new Map<string, number>();
  for (const c of changes) {
    if (c.at < cutoff) continue;
    const w = BY_ID.get(c.id);
    const rid = regionForCardId(c.id, w, w ? SECTOR_FINEGROUP.get(w.field) : undefined);
    tally.set(rid, (tally.get(rid) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([id, n]) => ({ id, n }))
    .sort((a, b) => b.n - a.n);
}

/** Take the recent changes and clear them, so the ignition plays once. */
function drainChanges(): Change[] {
  const cutoff = Date.now() - REPLAY_WINDOW_MS;
  const fresh = changes.filter((c) => c.at >= cutoff);
  changes.length = 0;
  return fresh.slice(-REPLAY_MAX);
}

/** Listens for graded cards and hands back a live flare buffer.
 *
 *  `flares` is mutated in place and read by the renderer each frame — returning
 *  new state per flare would re-render the tree on every grade, which is exactly
 *  what a canvas is for avoiding. */
export function useFlares(field: { index: Map<string, number>; ids: string[] }) {
  const flares = useRef(new Float32Array(field.ids.length));
  const active = useRef<Flare[]>([]);

  useEffect(() => {
    flares.current = new Float32Array(field.ids.length);
    active.current = [];
  }, [field]);

  // The ignition. On mount, replay whatever changed while no brain was on
  // screen, staggered so it reads as a sequence of things lighting up rather
  // than one flat flash.
  useEffect(() => {
    const now = performance.now();
    let n = 0;
    for (const c of drainChanges()) {
      const i = field.index.get(c.id);
      if (i === undefined) continue;
      active.current.push({ index: i, at: now + n * REPLAY_STAGGER_MS, moved: c.moved });
      n++;
    }
  }, [field]);

  useEffect(() => onCardEvent((e) => {
    const i = field.index.get(e.id);
    if (i === undefined) return;
    if (e.undo) {
      // A rewound review did not happen. Drop its flare rather than let it burn
      // out on its own, or an undo leaves a light on for a card that moved back.
      active.current = active.current.filter((f) => f.index !== i);
      flares.current[i] = 0;
      return;
    }
    active.current.push({ index: i, at: performance.now(), moved: crossedStage(e.before, e.after) });
  }), [field]);

  /** Advance the buffer to `now`. Returns true while anything is still lit, so
   *  the caller can stop animating when the brain is at rest. */
  const step = (now: number): boolean => {
    if (!active.current.length) return false;
    flares.current.fill(0);
    // A replayed flare is scheduled in the *future* so the burst staggers, so a
    // flare is only finished once it has both started and burned out.
    active.current = active.current.filter((f) => now - f.at < FLARE_MS);
    for (const f of active.current) {
      const age = now - f.at;
      if (age < 0) continue;                       // scheduled, not yet lit
      const t = 1 - age / FLARE_MS;
      // Snap up, decay slow — a flare should read as a firing, not a fade-in.
      flares.current[f.index] = Math.max(flares.current[f.index], t ** 2 * (f.moved ? 1 : 0.55));
    }
    return active.current.length > 0;
  };

  return { flares, step, hasFlares: () => active.current.length > 0 };
}

/** Points generated per slice. Each slice is a full, independent draw from the
 *  *same* brain — the fold and the sulci are keyed to the seed, only the sampling
 *  stream varies — so slices can simply be concatenated. */
const SLICE = 15000;

function concat(a: Substrate, b: Substrate): Substrate {
  const out: Substrate = {
    position: new Float32Array(a.position.length + b.position.length),
    normal: new Float32Array(a.normal.length + b.normal.length),
    curv: new Float32Array(a.curv.length + b.curv.length),
    count: a.count + b.count,
  };
  out.position.set(a.position); out.position.set(b.position, a.position.length);
  out.normal.set(a.normal); out.normal.set(b.normal, a.normal.length);
  out.curv.set(a.curv); out.curv.set(b.curv, a.curv.length);
  return out;
}

/** The substrate cloud. Generated once per size and cached across mounts, so
 *  moving between the hero and the room does not pay for it twice. */
const substrateCache = new Map<number, Substrate>();

export function useSubstrate(count: number) {
  const [cloud, setCloud] = useState<Substrate | null>(() => substrateCache.get(count) ?? null);

  useEffect(() => {
    const hit = substrateCache.get(count);
    if (hit) { setCloud(hit); return; }

    // Generated in slices, and handed over after each one, so density builds up
    // instead of the main thread stalling on a single long pass. Each point now
    // costs three surface evaluations rather than one — the two extra are the
    // finite differences behind its normal, which is what lets the cortex be lit
    // — so a 46k room at one go would block for most of a second.
    //
    // `setTimeout`, not `requestAnimationFrame`. rAF does not fire in a
    // backgrounded tab, so gating *initialisation* on it meant a brain opened in
    // a background tab never built its substrate and the canvas stayed black
    // forever — the same defect class as DESIGN.md §7's stalled entrances:
    // nothing the learner needs to see may depend on an animation frame.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let acc: Substrate | null = null;
    let stream = 0;

    const slice = () => {
      if (cancelled) return;
      const want = Math.min(SLICE, count - (acc?.count ?? 0));
      const batch = sampleSurface(want, 1, stream++);
      acc = acc ? concat(acc, batch) : batch;
      substrateCache.set(count, acc);
      setCloud(acc);
      if (acc.count < count) timer = setTimeout(slice, 0);
    };
    timer = setTimeout(slice, 0);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [count]);

  return cloud;
}

/** Total consolidation across the lexicon, 0..1 — the one number the hero says
 *  out loud. */
export function lexiconMass(field: { ids: string[] }): { touched: number; consolidated: number } {
  let touched = 0, consolidated = 0;
  for (const id of field.ids) {
    const t = consolidation(cardOf(id));
    if (t > 0) touched++;
    if (t >= 0.5) consolidated++;
  }
  return { touched, consolidated };
}
