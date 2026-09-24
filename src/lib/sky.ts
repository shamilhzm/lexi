// The sky — the geometry and history behind `components/WordSky.tsx`.
//
// Every word Lexi teaches is a point. They are laid out the way a sunflower lays
// out its seeds (Vogel's phyllotaxis: the golden angle, radius ∝ √i), in order of
// how common the word is — so the centre is the German you meet in every sentence
// and the edge is the German you meet once a year. A learner's sky fills from the
// middle outward, which is both what good vocabulary learning looks like and what
// the scheduler is built to do.
//
// Pure: no DOM, no store. The component supplies the words, the ranks, the FSRS
// state and the review ledger; this turns them into positions, a timeline and a
// memory curve. Tested in `sky.test.ts`.
import { emptyCard, schedule, retrievability, State, type Card, type Grade } from '../srs.ts';
import type { ReviewEvent } from './ledger.ts';
import type { CEFR, Word } from '../types.ts';

/** The golden angle, in radians. Consecutive seeds turn by this much, which is
 *  what makes the spiral fill evenly with no gaps and no radial spokes. */
export const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const LEVEL_ORDER: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface Star {
  id: string;
  /** Unit-disk coordinates, −1..1. */
  x: number;
  y: number;
  /** 0 at the centre, 1 at the edge — also the seed's order in the sky. */
  r: number;
}

/** The order the sky is sown in: ranked words by rank, then unranked words by
 *  level and corpus order. Unranked words are real vocabulary that the frequency
 *  list does not reach — they belong at the edge, not scattered through the core. */
export function sowingOrder(words: Word[], rankOf: (id: string) => number | null): Word[] {
  const ranked: { w: Word; k: number }[] = [];
  const rest: { w: Word; i: number }[] = [];
  words.forEach((w, i) => {
    const k = rankOf(w.id);
    if (k != null) ranked.push({ w, k }); else rest.push({ w, i });
  });
  ranked.sort((a, b) => a.k - b.k);
  rest.sort((a, b) => (LEVEL_ORDER.indexOf(a.w.level) - LEVEL_ORDER.indexOf(b.w.level)) || a.i - b.i);
  return [...ranked.map((e) => e.w), ...rest.map((e) => e.w)];
}

/** Positions in the unit disk. Seed `i` of `n` sits at radius √((i+½)/n), so equal
 *  counts of words occupy equal areas — the density is uniform and a ring's area
 *  is honest about how many words it holds. */
export function layout(order: { id: string }[]): Star[] {
  const n = order.length;
  return order.map((w, i) => {
    const r = Math.sqrt((i + 0.5) / n);
    const a = i * GOLDEN;
    return { id: w.id, x: r * Math.cos(a), y: r * Math.sin(a), r };
  });
}

/** The radius that encloses the first `k` seeds — where to draw "the 500 commonest". */
export const ringAt = (k: number, n: number) => Math.sqrt(Math.min(k, n) / n);

// ---- history ------------------------------------------------------------------

/** When each word was first lit: its earliest review in the ledger, or — for a
 *  word the ledger does not reach (pruned, or scheduled before the ledger
 *  existed) — its last review. Sorted oldest first. Words never reviewed are
 *  absent: they have not been lit. */
export function firstLight(events: ReviewEvent[], cards: Map<string, Card>, ids: Set<string>): { id: string; at: number }[] {
  const first = new Map<string, number>();
  for (const e of events) {
    if (!ids.has(e.id)) continue;
    const cur = first.get(e.id);
    if (cur === undefined || e.at < cur) first.set(e.id, e.at);
  }
  for (const [id, c] of cards) {
    if (!ids.has(id) || first.has(id) || c.state === State.New) continue;
    const at = c.last_review ? new Date(c.last_review).getTime() : NaN;
    if (Number.isFinite(at)) first.set(id, at);
  }
  return [...first].map(([id, at]) => ({ id, at })).sort((a, b) => a.at - b.at);
}

// ---- one word's memory ------------------------------------------------------------

export interface CurvePoint { t: number; r: number }
export interface MemoryCurve {
  /** The retrievability curve, sampled: it falls between reviews and jumps to 1
   *  at each. */
  points: CurvePoint[];
  /** The reviews, as they happened. */
  reviews: { t: number; g: Grade }[];
  /** Stability after each review, in days — how slowly the next fall will be. */
  stabilities: number[];
}

const DAY = 86_400_000;

/** Reconstruct a word's memory curve from its reviews.
 *
 *  Replays the ledger through the same scheduler the app uses, so the curve is
 *  what FSRS believed at each moment — *reconstructed with today's parameters*,
 *  which the caller should say. Between reviews the curve is the forgetting curve
 *  for the stability the last review left; at each review it returns to 1. */
export function memoryCurve(events: ReviewEvent[], now = Date.now(), samplesPerGap = 24): MemoryCurve {
  const evs = [...events].sort((a, b) => a.at - b.at);
  const points: CurvePoint[] = [];
  const reviews: { t: number; g: Grade }[] = [];
  const stabilities: number[] = [];
  if (!evs.length) return { points, reviews, stabilities };
  let card: Card = emptyCard(new Date(evs[0].at));
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i];
    card = schedule(card, e.g, new Date(e.at));
    reviews.push({ t: e.at, g: e.g });
    stabilities.push(card.stability);
    const end = i + 1 < evs.length ? evs[i + 1].at : Math.max(now, e.at + DAY);
    for (let s = 0; s <= samplesPerGap; s++) {
      const t = e.at + ((end - e.at) * s) / samplesPerGap;
      const r = s === 0 ? 1 : retrievability(card, new Date(t)) ?? 1;
      points.push({ t, r: Math.max(0, Math.min(1, r)) });
    }
  }
  return { points, reviews, stabilities };
}

// ---- the replay's camera ------------------------------------------------------------

/** How far out a sky reaches as it fills: for each of `steps + 1` points along the
 *  lighting order, the radius that holds `q` of the stars lit so far. The replay
 *  frames its camera on this, so the view starts close on the first words and
 *  widens as the vocabulary does. A quantile, not the maximum, so that one rare
 *  word met early does not throw the camera out to the rim. */
export function reachCurve(radii: number[], steps = 100, q = 0.92): number[] {
  const out: number[] = [];
  if (!radii.length) return out;
  for (let j = 0; j <= steps; j++) {
    const k = Math.max(1, Math.ceil((j / steps) * radii.length));
    const sorted = radii.slice(0, k).sort((a, b) => a - b);
    out.push(sorted[Math.floor(q * (k - 1))]);
  }
  return out;
}
