// The sky's model — which stars there are, and how each one looks from the
// learner's state. Shared by `WordSky` (Fortschritt) and `MiniSky` (the session
// recap), so the two can never disagree about what a lit star means.
import { WORDS } from '../data/index.ts';
import { cardOf, statusOf, retention } from '../store.ts';
import { retrievability } from '../srs.ts';
import { freqRankOf } from '../lib/freq.ts';
import { sowingOrder, layout, type Star } from '../lib/sky.ts';
import type { Look } from './skyPaint.ts';
import type { Word } from '../types.ts';

export type Lens = 'memory' | 'level' | 'gender';

/** Stability, in days, at which a star reaches full size. */
const FULL_STABILITY = 365;

let geo: { key: number; order: Word[]; stars: Star[]; index: Map<string, number> } | null = null;

/** The sowing order and positions — fixed for a given lexicon, so computed once. */
export function skyGeometry() {
  if (!geo || geo.key !== WORDS.length) {
    const order = sowingOrder(WORDS.filter((w) => w.kind === 'word'), freqRankOf);
    geo = { key: WORDS.length, order, stars: layout(order), index: new Map(order.map((w, i) => [w.id, i])) };
  }
  return geo;
}

/** How every star looks today, through a lens. In the memory lens a known word is
 *  as bright as FSRS says you would recall it now and as large as how long it
 *  will last; a word still in learning is accent-blue. */
export function looksFor(order: Word[], lens: Lens): Look[] {
  const target = retention();
  const full = Math.log1p(FULL_STABILITY);
  return order.map((w) => {
    const st = statusOf(w.id);
    if (st === 'new') return { lit: false, ink: '--color-line', alpha: 1, fading: false, size: 1 };
    const c = cardOf(w.id);
    const r = c ? retrievability(c) ?? 1 : 1;
    const fading = st === 'known' && r < target;
    if (lens === 'level') return { lit: true, ink: `--color-${w.level.toLowerCase()}`, alpha: 0.95, fading: false, size: 1 };
    if (lens === 'gender') {
      return w.gender
        ? { lit: true, ink: `--color-${w.gender}`, alpha: 0.95, fading: false, size: 1 }
        : { lit: true, ink: '--color-dim', alpha: 0.45, fading: false, size: 0.9 };
    }
    if (st !== 'known') return { lit: true, ink: '--color-accent', alpha: 0.9, fading: false, size: 0.95 };
    const grow = c ? Math.min(1, Math.log1p(Math.max(0, c.stability)) / full) : 0;
    return { lit: true, ink: '--color-green', alpha: 0.3 + 0.7 * r, fading, size: 0.8 + 0.5 * grow };
  });
}
