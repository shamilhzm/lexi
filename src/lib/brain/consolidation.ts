// How far a word has travelled out of the hippocampus.
//
// This is the one place where the visualisation stops being an illustration and
// starts rendering something the app already computes. Complementary Learning
// Systems theory says a new memory is initially hippocampal and becomes
// neocortical through repeated, spaced reactivation — the hippocampus teaches
// the cortex slowly enough not to overwrite what the cortex already knows
// (McClelland, McNaughton & O'Reilly 1995). For novel *words* specifically, a
// newly learned form behaves like an episodic memory on the first day and like
// lexical knowledge after sleep-mediated consolidation (Davis & Gaskell 2009).
//
// FSRS `stability` is the number of days until recall probability decays to the
// retention target. It is not a measurement of anyone's hippocampus. But it is a
// monotone estimate of how well-consolidated a memory is, derived from the same
// spacing effect the theory is about — so mapping it to the journey from
// hippocampus to cortex renders the scheduler's own belief rather than inventing
// a new one.
import { State, type Card } from '../../srs.ts';
import { hashString } from './noise.ts';

/** Stability, in days, at which a word is treated as having just left the
 *  hippocampus. One day: it survived a night. */
const S0 = 1;

/** Stability at which the journey is complete. A year is the point past which
 *  the difference between "known" and "very well known" stops being legible on
 *  screen — and where FSRS itself is extrapolating hard. */
const SMAX = 365;

const LOG_SPAN = Math.log(SMAX / S0);

/** Learning cards have left New but have no meaningful stability yet, so they
 *  ramp on reps instead. They stay visibly *at* the hippocampus — this is a
 *  twitch off the origin, not a journey. */
const LEARNING_CEILING = 0.12;

/** 0 = in the hippocampus, 1 = fully consolidated into its cortical region.
 *
 *  Log rather than linear because stability is log-distributed: the gap between
 *  1 and 8 days is the same amount of learning as the gap between 40 and 320,
 *  and a linear ramp would park every word the learner has ever met at the
 *  hippocampus while a handful of mature cards sat alone out at the rim. Same
 *  reasoning `makeHeatScale` in `src/lib/ui.ts` applies to coverage. */
export function consolidation(card: Card | undefined): number {
  if (!card || card.state === State.New) return 0;

  if (card.state === State.Learning || card.state === State.Relearning) {
    return Math.min(LEARNING_CEILING, card.reps * 0.04);
  }

  const s = Math.max(S0, card.stability || S0);
  return Math.max(0, Math.min(1, Math.log(s / S0) / LOG_SPAN));
}

/** What the brain would look like with `fraction` of the lexicon consolidated.
 *
 *  A preview, and deliberately a *pure function of the card id* — it never reads
 *  or writes the store, so scrubbing it cannot touch anyone's real progress. The
 *  same id always occupies the same rank, so raising the fraction only ever adds
 *  words: scrubbing up and back down is stable rather than reshuffling the sky.
 *
 *  Words near the threshold come out barely consolidated and words well inside
 *  it come out fully so, which is what makes the scrub read as a migration out
 *  of the hippocampus rather than a light switch. */
/** A card's place in the queue, uniform in [0, 1).
 *
 *  FNV-1a alone is not flat enough here: over ids that differ in only a few
 *  characters its output clusters, and the quartiles came out at 0.24 / 0.53 /
 *  0.74 rather than 0.25 / 0.50 / 0.75 — which showed up as the slider's count
 *  drifting three points from the number under it. The extra avalanche step is
 *  applied *here* rather than inside `hashString`, which seeds every word's
 *  position and must never change: doing it there would move the entire lexicon. */
function rankOf(id: string): number {
  let h = hashString(id);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function simulatedConsolidation(id: string, fraction: number): number {
  if (fraction <= 0) return 0;
  const rank = rankOf(id);                    // stable in [0, 1)

  if (rank < fraction) {
    // Everything under the threshold is genuinely consolidated — at or above the
    // 0.5 that `regionProgress` counts as known.
    //
    // The first version ramped these from 0 to 1, which made the readout lie:
    // the slider said 7,394 while the regions summed to about 60% of that,
    // because the lower half of the ramp fell below the counting threshold. A
    // control whose number disagrees with the panel next to it is worse than no
    // control.
    const depth = 1 - rank / fraction;        // 0 at the threshold, 1 at the front
    return 0.5 + 0.5 * depth ** 0.7;
  }

  // A learning frontier just past the threshold, so the hippocampus is never
  // empty and the migration outward stays visible. These are *not* counted as
  // consolidated, which is exactly why they sit below 0.5.
  const edge = (rank - fraction) / LEARNING_BAND;
  if (edge >= 1) return 0;
  return 0.45 * (1 - edge) ** 1.5;
}

/** How much of the unlearned remainder shows as in-transit in the preview. */
const LEARNING_BAND = 0.08;

/** Ease the journey so words bunch at the two ends rather than smearing evenly
 *  along the path. A word is mostly *somewhere* — arriving is the event. */
export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** How brightly a word burns. Lapses dim it: a card you keep forgetting is
 *  genuinely less yours, and the map should not flatter you.
 *
 *  Floored well above zero so that a struggling word is dim but never invisible
 *  — the same reasoning as DESIGN.md §7's rule that nothing the learner needs to
 *  see may depend on a value that can reach zero. */
export function luminance(card: Card | undefined): number {
  if (!card || card.state === State.New) return 0.14;
  const t = consolidation(card);
  const penalty = 1 - Math.min(0.4, (card.lapses ?? 0) * 0.08);
  return Math.max(0.2, (0.35 + 0.65 * t) * penalty);
}

/** True when a grade moved a card across a boundary the map can show — the
 *  moment worth animating rather than merely redrawing. */
export function crossedStage(before: Card | undefined, after: Card | undefined): boolean {
  const a = before?.state ?? State.New;
  const b = after?.state ?? State.New;
  if (a !== b) return true;
  return Math.abs(consolidation(after) - consolidation(before)) > 0.04;
}
