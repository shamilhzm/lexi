// The typing race — German at your level, against a pace you can see.
//
// ## What this is for, said plainly, because the number lies if it isn't
//
// Typing speed is not a language skill, and it is tested in **none** of the six
// papers Lexi ships: the Schreiben module is handwritten. So the WPM figure here
// is motivation, not a diagnostic, and the UI says so on its face — the same rule
// the exam results screen already follows when it refuses to pretend a
// self-assessment is a machine's judgement.
//
// What *is* real is what you have to type to make the number move. German
// spelling punishes exactly the things a race forces you to stop guessing about:
//
//   - **noun capitalisation** — every noun, every time, and a race makes the
//     habit automatic in a way a multiple-choice drill never does
//   - **umlauts and ß** — the characters an English keyboard does not have, and
//     the ones a learner quietly avoids for months
//   - **word order**, because you are reproducing a whole sentence rather than
//     filling a slot in one
//
// The text is drawn from the corpus's own verified example sentences at the
// learner's level, so a race is also 60 seconds of correct German read closely.
// Nothing here is invented prose.
//
// ## The umlaut compromise
//
// Refusing `ae` for `ä` outright makes the first race miserable on a US keyboard.
// Silently accepting it makes the feature pointless, since avoiding umlauts is
// the exact habit it exists to break. So a digraph is accepted — it does not
// break the streak or stop the race — and it is **counted**, and the finish
// screen names it: *you typed 7 umlauts as ae/oe/ue; on the exam each is a
// spelling error*. Correct without being punitive, honest without being useless.
import type { CEFR, Word } from '../types.ts';

/** Words-per-minute, the standard five-characters-to-a-word convention.
 *
 *  Worth stating because German makes it flattering-looking in one direction and
 *  brutal in the other: *Geschwindigkeitsbegrenzung* is one word and 5.4 "words"
 *  of typing. Every racer on screen is measured the same way, so the comparison
 *  is fair even though the absolute number is not comparable to an English test. */
export const wpm = (chars: number, ms: number) => (ms <= 0 ? 0 : (chars / 5) / (ms / 60000));

/** Accepted stand-ins for the characters an English keyboard lacks. */
const DIGRAPH: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue', 'ß': 'ss' };

export interface Racer {
  id: string;
  label: string;
  /** Fixed pace. A pace-setter, not an opponent that reacts — a bot that rubber-
   *  bands to the learner is a lie about how fast they are going. */
  wpm: number;
}

export interface RaceText {
  /** What the learner types, exactly. */
  text: string;
  /** Where each sentence came from, for the finish screen. Never shown during. */
  sources: string[];
  level: CEFR;
}

/** Deterministic RNG, so a race can be replayed from its seed. */
function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Every character a learner can produce on an ordinary keyboard, plus the four
 *  German ones this whole feature exists to make them stop avoiding. */
const TYPEABLE = /^[A-Za-zÄÖÜäöüß0-9 .,!?'"()\-:;/%]+$/;

/** Typography the corpus uses and a keyboard cannot.
 *
 *  This was found by racing: the first passage drawn at A1 contained *langweilig
 *  – lass*, with an en dash, and there is no key for it. The race was literally
 *  unwinnable and nothing in the type system or the tests knew. 48 sentences
 *  carry German quotation marks, 23 an en dash, and a handful a no-break space
 *  that looks exactly like a space and is not. All of those have an unambiguous
 *  ASCII equivalent, so they are rewritten rather than thrown away. */
function normalise(de: string): string {
  return de
    .replace(/[„“”»«]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[\u00a0\u202f\u2009]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A sentence is raceable if it is a real sentence and not a fragment, a citation
 *  or something with markup in it — and if, once normalised, every character in
 *  it is one the learner can actually reach. `é`, `₂`, `ō` and `Å` all occur in
 *  the corpus and none of them has a key; those sentences are simply not raced. */
function usable(de: string): boolean {
  if (de.length < 18 || de.length > 110) return false;
  if (!/[.!?]$/.test(de.trim())) return false;
  if (/[<>[\]{}|_*]|\.\.\.|…/.test(de)) return false;
  if (!TYPEABLE.test(de)) return false;
  if ((de.match(/"/g) ?? []).length % 2) return false;      // an unbalanced quote
  return true;
}

/**
 * Build a race passage from the corpus at a level.
 *
 * Draws from the example sentences already on the cards — verified German that a
 * learner at this level has either met or will. Falls back down a level when a
 * level is thin (C2 has 196 cards), because a race that cannot start is worse
 * than one that is slightly easy.
 */
export function buildRace(corpus: Word[], level: CEFR, seed: number, sentences = 3): RaceText {
  const ORDER: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const at = ORDER.indexOf(level);
  const r = rng(seed);

  const pool: { de: string; from: string }[] = [];
  // Widen downward until there is enough to choose from, never upward: a race
  // above your level is a typing test with a dictionary attached.
  for (let i = at; i >= 0 && pool.length < 40; i--) {
    for (const w of corpus) {
      if (w.level !== ORDER[i] || w.kind !== 'word') continue;
      for (const ex of w.ex ?? []) {
        const de = normalise(ex.de);
        if (usable(de)) pool.push({ de, from: w.term });
      }
    }
  }
  if (!pool.length) return { text: '', sources: [], level };

  // Sample without replacement so one card cannot supply the whole race.
  const picked: { de: string; from: string }[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (picked.length < sentences && guard++ < 500) {
    const cand = pool[Math.floor(r() * pool.length)];
    if (seen.has(cand.from) || picked.some((p) => p.de === cand.de)) continue;
    seen.add(cand.from);
    picked.push(cand);
  }

  return {
    text: picked.map((p) => p.de).join(' '),
    sources: picked.map((p) => p.from),
    level,
  };
}

export interface Typed {
  /** Index of the next character expected. */
  at: number;
  /** Characters typed correctly, for WPM. Digraphs count as the one character
   *  they stand for, so substituting does not inflate the score. */
  correct: number;
  /** Wrong keystrokes, all of them, including ones immediately corrected. */
  errors: number;
  /** Umlauts and ß typed as ae/oe/ue/ss. Not errors; reported at the finish. */
  digraphs: number;
  done: boolean;
}

export const freshTyped = (): Typed => ({ at: 0, correct: 0, errors: 0, digraphs: 0, done: false });

/**
 * Apply one keystroke.
 *
 * Deliberately **not** free-form: the race advances only on the right character,
 * so a learner cannot outrun the text and finish with a scrambled sentence. A
 * wrong key is counted and ignored, which is how a real typing trainer behaves
 * and what keeps the position honest.
 *
 * Returns the next state, plus `pending` when a keystroke opened a digraph — the
 * `a` of `ae` is not yet right or wrong, and the caller carries it to the next
 * key. Case is significant throughout: German capitalises its nouns and a race
 * that shrugged at that would be teaching the wrong habit on the one screen
 * where the habit forms.
 */
export function keystroke(text: string, t: Typed, key: string, pending: string): { next: Typed; pending: string } {
  if (t.done) return { next: t, pending: '' };
  const want = text[t.at];
  if (want === undefined) return { next: { ...t, done: true }, pending: '' };

  const digraph = DIGRAPH[want];

  // Mid-digraph: the previous key matched the first half, so this key decides.
  if (pending) {
    if (digraph && pending + key === digraph) {
      const at = t.at + 1;
      return {
        next: { ...t, at, correct: t.correct + 1, digraphs: t.digraphs + 1, done: at >= text.length },
        pending: '',
      };
    }
    // The opener was not part of a digraph after all — charge one error and
    // re-judge this key from scratch, so "a" then "n" in front of "ä" costs one
    // mistake rather than swallowing the second key silently.
    return keystroke(text, { ...t, errors: t.errors + 1 }, key, '');
  }

  if (key === want) {
    const at = t.at + 1;
    return { next: { ...t, at, correct: t.correct + 1, done: at >= text.length }, pending: '' };
  }
  if (digraph && key === digraph[0]) return { next: t, pending: key };
  return { next: { ...t, errors: t.errors + 1 }, pending: '' };
}

/** Where a fixed-pace racer is, 0..1, after `ms` at `racer.wpm`. */
export function paceAt(racer: Racer, ms: number, textLength: number): number {
  if (textLength <= 0) return 0;
  const chars = (racer.wpm * 5) * (ms / 60000);
  return Math.max(0, Math.min(1, chars / textLength));
}

/** Accuracy as a share of all keystrokes that landed. */
export const accuracy = (t: Typed) =>
  (t.correct + t.errors === 0 ? 1 : t.correct / (t.correct + t.errors));

/** The fastest a pace-setter may be asked to go.
 *
 *  A rival is only useful if catching it is imaginable. The world record for
 *  sustained English typing is around 150 WPM and German is slower, so a pacer
 *  above this is not a challenge, it is scenery — and once one bad reading is in
 *  the record it would be scenery *forever*, because the record only goes up.
 *
 *  This was found by playing: a scripted run recorded 305 WPM and the next race
 *  opened with rivals at 244 and 351, permanently unbeatable, with no way for a
 *  learner to clear it. Clamping the *basis* rather than the record keeps a real
 *  personal best honest while stopping it from wrecking the race it feeds. */
const PACER_CEILING = 120;

/**
 * The two pace-setters, chosen from the learner's own best.
 *
 * One just below and one just above, because a race you always win and a race
 * you never win are the same race. A learner with no history gets 25/37, which
 * is roughly a beginner's two-finger pace and a comfortable touch-typist's — the
 * point is to have something moving, not to model anybody.
 */
export function pacers(best: number | null): Racer[] {
  const raw = best && best > 10 ? best : 32;
  const b = Math.min(raw, PACER_CEILING);
  return [
    { id: 'schnecke', label: 'Schnecke', wpm: Math.max(12, Math.round(b * 0.8)) },
    { id: 'hase', label: 'Hase', wpm: Math.round(b * 1.15) },
  ];
}
