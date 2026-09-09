// The round, as a reducer. No audio, no React, no clock of its own.
//
// Everything the game *decides* lives here: which word is up, when a word has run
// out of track, what the overlay says, and when the run is over. It takes transcript
// events and clock ticks and returns a new state, so the rules can be driven from a
// test with a script of fake transcripts and proved without anybody speaking.
//
// That split is the whole reason the game could be built before the recogniser was
// measured (`docs/SPEAKING.md`, gates 1–3): the parts that depend on real speech are
// two files, and this is not one of them.
//
// ## The track is the timer
//
// In the source clip the words arrive on a moving road with the next one already on
// screen. That is not decoration — it is what lets the game feel fast on a recogniser
// that is not. A per-word timer that starts when the previous word resolves makes the
// learner wait on the machine; a track that never stops means the machine is racing
// *them*. So a word has a deadline from the moment it becomes current, and the queue
// is public state that the UI draws ahead of the play head.
import { verdict, spokenForm, type Caught } from './asr-match.ts';
import type { Word } from '../types.ts';

/** How long a word is on the track before it goes past.
 *
 *  **A guess, and marked as one.** It has to cover the recogniser's warm-up plus a
 *  learner's reaction plus the utterance, and the first of those three is gate 1 and
 *  unmeasured. Erring long: a deadline that is too short reads as "you were too slow"
 *  on a delay the learner did not cause, which is the one thing this game must never
 *  say. Tune it when `npm run probe:asr` has run. */
export const WORD_MS = 5000;

/** How many words are visible ahead of the current one. Two, because the clip shows
 *  one-and-a-bit and a third is off the edge on a 375px phone. */
export const LOOKAHEAD = 2;

/** A slot's own state. There is no `current` here on purpose: which word is current
 *  is `run.index`, and carrying it twice is two things that can disagree. */
export type SlotState = 'waiting' | 'caught' | 'missed';

export interface Slot {
  word: Word;
  /** What the learner is asked to say — the headword without its article. */
  say: string;
  state: SlotState;
  /** The closest thing the recogniser offered. Printed over the word. */
  heard: string;
  caught: Caught;
}

export interface Run {
  slots: Slot[];
  index: number;
  /** When the current word became current, on the caller's clock. */
  startedAt: number;
  streak: number;
  best: number;
  done: boolean;
}

export function startRun(words: Word[], now: number): Run {
  return {
    slots: words.map((w) => ({
      word: w, say: spokenForm(w.term), state: 'waiting', heard: '', caught: null,
    })),
    index: 0,
    startedAt: now,
    streak: 0,
    best: 0,
    done: words.length === 0,
  };
}

const current = (r: Run): Slot | undefined => r.slots[r.index];

/** Advance to the next word, recording how the current one ended. */
function advance(run: Run, state: 'caught' | 'missed', now: number): Run {
  const slots = run.slots.slice();
  const slot = slots[run.index];
  if (!slot) return run;
  slots[run.index] = { ...slot, state };
  const streak = state === 'caught' ? run.streak + 1 : 0;
  const index = run.index + 1;
  return {
    ...run,
    slots,
    index,
    startedAt: now,
    streak,
    best: Math.max(run.best, streak),
    done: index >= slots.length,
  };
}

/**
 * A transcript arrived.
 *
 * **Interim results settle the word.** Waiting for `isFinal` costs the pace the game
 * is made of, and an interim that already contains the word is not going to stop
 * containing it. The cost is that a learner who says the word and then keeps talking
 * has already been counted — which is the right trade for a game whose subject is the
 * first thing out of your mouth.
 */
export function heard(run: Run, text: string, alternatives: string[], now: number): Run {
  const slot = current(run);
  if (!slot || run.done) return run;
  const v = verdict(slot.say, text, alternatives);
  const slots = run.slots.slice();
  slots[run.index] = { ...slot, heard: v.heard, caught: v.caught };
  const next = { ...run, slots };
  return v.caught ? advance(next, 'caught', now) : next;
}

/** The clock moved. A word past its deadline goes by — it is not a failure event, it
 *  is the track doing what a track does. */
export function tick(run: Run, now: number): Run {
  if (run.done) return run;
  if (now - run.startedAt < WORD_MS) return run;
  return advance(run, 'missed', now);
}

/** The learner asked to move on. Recorded as a miss, because a skipped word was not
 *  caught — but never surfaced as one: `docs/SPEAKING.md`. */
export function skip(run: Run, now: number): Run {
  return run.done ? run : advance(run, 'missed', now);
}

/** Put the current word back at the start of its track.
 *
 *  For one thing only: the run is built before the microphone is open, because the
 *  words have to be on screen behind the permission dialogs for the learner to know
 *  what they agreed to. The deadline may not start until audio is actually arriving.
 *  See `asr.ts`'s `onOpen`. */
export function resetDeadline(run: Run, now: number): Run {
  return run.done ? run : { ...run, startedAt: now };
}

/** 0..1 through the current word's track. The UI's only animation input. */
export function progress(run: Run, now: number): number {
  if (run.done) return 1;
  return Math.min(1, Math.max(0, (now - run.startedAt) / WORD_MS));
}

/** What the run amounted to. **Counts, not a score** — see the ruling in
 *  `docs/SPEAKING.md`: this game reports what the recogniser did, and a percentage
 *  presented as a result reads as a mark for the learner's mouth. */
export interface Tally { total: number; caught: number; best: number }
export function tally(run: Run): Tally {
  return {
    total: run.slots.length,
    caught: run.slots.filter((s) => s.state === 'caught').length,
    best: run.best,
  };
}

/** Cards this game can honestly ask for.
 *
 *  Not a CEFR band. Measured over the corpus on 2026-09-09: **313 of 1,170 A1 cards
 *  are one syllable and 129 are function words** — `so`, `nur`, `ab`, `auch`. A
 *  monosyllabic function word said alone is a coin flip for any recogniser, and it is
 *  unplayable for reasons that have nothing to do with the learner. Two syllables of
 *  content word is the rule, and it leaves **5,691 of 6,844 cards** playable with both
 *  ends of the range well stocked.
 *
 *  Note what this deliberately does *not* do: filter by what a recogniser is known to
 *  catch. That would let Apple's and Google's language models choose Lexi's
 *  curriculum. A word that cannot be caught is a fact about the recogniser. */
const FUNCTION_POS = new Set(['adverb', 'preposition', 'conjunction', 'pronoun',
  'article', 'interjection', 'particle', 'numeral', 'determiner']);

export function syllables(word: string): number {
  return (word.toLowerCase().match(/[aeiouyäöü]+/g) ?? []).length;
}

export function isPlayable(w: Word): boolean {
  if (w.kind !== 'word' || FUNCTION_POS.has(w.pos)) return false;
  const say = spokenForm(w.term);
  // **One word.** Found on the phone at word 3 of a run: the lookahead was showing
  // *Ich kann lange schlafen.* — a pattern card, whose term is a whole sentence.
  // `spokenForm` strips an article and a government and has no reason to strip a
  // clause. The overlay prints one transcript across one word and the deadline is
  // sized for one utterance; a sentence fails both and would read to the learner as
  // their own failure.
  if (/\s/.test(say)) return false;
  return syllables(say) >= 2;
}
