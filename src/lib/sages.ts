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
// ## One clock for the run, and none for the word
//
// The first version gave every word its own deadline and let it go past when the
// deadline passed. That is the meme's shape and it is the wrong shape for this app:
// a word that expires is the recogniser's failure charged to the learner, and it is
// the one thing this game must never do.
//
// So the pressure moved up a level. **The run has a clock; a word does not.** A word
// stays until it is caught, the goal is how many you can clear before the run ends,
// and a word that will not be caught costs you time rather than a mark against it.
// The difference is the whole ethic of the thing: you are racing a clock, never
// failing a word.
//
// `skip` is free and clears nothing. Charging time for it would charge the learner
// for the recogniser refusing a word, which is the same error wearing a different
// coat.
import { verdict, spokenForm, type Caught } from './asr-match.ts';
import type { Word } from '../types.ts';

/** How long a run lasts. **A guess, and marked as one** — long enough that the
 *  microphone's warm-up is not most of it, short enough to want another go. Tune it
 *  when `npm run probe:asr` has answered gate 1. */
export const RUN_MS = 60_000;

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
  /** 0..1, the closest the recogniser has come on this word so far.
   *
   *  A **high-water mark**, not the latest reading. A bar that falls back when the
   *  learner says a second thing is reporting noise as failure, and the honest claim
   *  is "this is the closest it got", which only ever goes up. It drives the fill on
   *  the word itself — the only feedback the learner gets while a word is live. */
  closeness: number;
}

export interface Run {
  slots: Slot[];
  index: number;
  /** When the run's clock started — which is when the microphone opened, not when
   *  the learner pressed Start. See `startClock`. */
  startedAt: number;
  /** `startedAt + RUN_MS`. Held at `Infinity` until the clock starts. */
  endsAt: number;
  /** Words caught. The score, and the only number the game keeps. */
  cleared: number;
  done: boolean;
}

export function startRun(words: Word[], now: number): Run {
  return {
    slots: words.map((w) => ({
      word: w, say: spokenForm(w.term), state: 'waiting', heard: '', caught: null, closeness: 0,
    })),
    index: 0,
    startedAt: now,
    // Not running yet. The clock starts when audio arrives, so the permission
    // dialogs cannot eat the run — see `startClock`.
    endsAt: Infinity,
    cleared: 0,
    done: words.length === 0,
  };
}

const current = (r: Run): Slot | undefined => r.slots[r.index];

/** Advance to the next word, recording how the current one ended. */
function advance(run: Run, state: 'caught' | 'missed'): Run {
  const slots = run.slots.slice();
  const slot = slots[run.index];
  if (!slot) return run;
  slots[run.index] = { ...slot, state };
  const index = run.index + 1;
  return {
    ...run,
    slots,
    index,
    cleared: run.cleared + (state === 'caught' ? 1 : 0),
    // Running out of *words* ends the run too. The pool is deliberately much longer
    // than anyone clears in a minute, so this is a floor rather than a rule.
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
export function heard(run: Run, text: string, alternatives: string[]): Run {
  const slot = current(run);
  if (!slot || run.done) return run;
  const v = verdict(slot.say, text, alternatives);
  const slots = run.slots.slice();
  slots[run.index] = {
    ...slot,
    heard: v.heard,
    caught: v.caught,
    // A hit is a full bar whatever the string distance says: `alternative` and
    // `phonetic` can both land well under the fuzzy floor, and a word that counted
    // must not show as three-quarters right.
    closeness: v.caught ? 1 : Math.max(slot.closeness, v.similarity),
  };
  const next = { ...run, slots };
  return v.caught ? advance(next, 'caught') : next;
}

/** The clock moved. Only the run can run out; a word never does. */
export function tick(run: Run, now: number): Run {
  if (run.done || now < run.endsAt) return run;
  return { ...run, done: true };
}

/** The learner asked to move on. Free, and it clears nothing — see the header. */
export function skip(run: Run): Run {
  return run.done ? run : advance(run, 'missed');
}

/** Start the run's clock.
 *
 *  Called when audio actually arrives, not when the learner presses Start. Between
 *  the two, iOS shows up to **two** system dialogs — Speech Recognition, then
 *  Microphone — and a run whose clock is already going spends itself while the
 *  learner reads them. Measured on the Simulator before this existed: a twelve-word
 *  run was on word 8 by the time the second dialog was answered. See `asr.ts`'s
 *  `onOpen`. */
export function startClock(run: Run, now: number): Run {
  return run.done ? run : { ...run, startedAt: now, endsAt: now + RUN_MS };
}

/** 0..1 through the run. `0` before the clock starts. */
export function progress(run: Run, now: number): number {
  if (run.done) return 1;
  if (run.endsAt === Infinity) return 0;
  return Math.min(1, Math.max(0, (now - run.startedAt) / RUN_MS));
}

/** Whole seconds left, for the one number on screen. */
export function secondsLeft(run: Run, now: number): number {
  if (run.endsAt === Infinity) return Math.round(RUN_MS / 1000);
  return Math.max(0, Math.ceil((run.endsAt - now) / 1000));
}

/** What the run amounted to. **Counts, never a percentage** — a rate presented as a
 *  result reads as a mark for the learner's mouth, and this game does not give one.
 *  `attempted` is words reached, not words in the pool: the pool is deliberately far
 *  longer than a minute. */
export interface Tally { cleared: number; skipped: number; attempted: number }
export function tally(run: Run): Tally {
  return {
    cleared: run.slots.filter((s) => s.state === 'caught').length,
    skipped: run.slots.filter((s) => s.state === 'missed').length,
    attempted: run.index,
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
