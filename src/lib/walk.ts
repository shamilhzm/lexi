// Walk mode — Lexi as audio, for a walk or a run with the phone in a pocket.
//
// The owner asked for it in so many words: "I am not actually speaking or hearing
// the words out loud; I want to go for a 5, 10, 15, 20, 30 minute or hour-long walk
// or run and still interact with Lexi, hearing the cards and speaking them back and
// it count towards my progress." The panel review (2026-09-25) shaped the answer:
//
//   · **Anticipation, not dictation.** The English plays, a short tone says "your
//     turn", the learner says the German *aloud* into the pause, then hears it. That
//     is retrieval practice in audio — the Pimsleur shape — and it is production,
//     which a flip card is not.
//   · **Only a deliberate press grades.** Headphone *next track* (AirPods and
//     EarPods: double-press) means "knew it", *previous track* (triple-press) means
//     "didn't". Silence grades nothing. Speech is never machine-marked — VISION
//     refuses it, and a microphone would stop the moment the phone locks anyway.
//     The same rule as the feed: scrolling is not evidence, and neither is walking.
//   · **New words come back inside the walk.** A word met for the first time is
//     taught (German, English, German, example) and then *tested* about 40 s, 2 min
//     and 5 min later — expanding retrieval, so a grade on it is recall, not echo.
//   · **Leftover time is a listening lane that never grades.** A press there saves
//     the word, which is the feed's one honest signal, carried into the pocket.
//
// Everything here is pure: what to play, in what order, and — once the clips have
// durations — where each one sits on the timeline. `walkAudio.ts` renders it.

/** `hear` and `again` are Hören's (lib/listen.ts): a word's first hearing, and
 *  the shorter return of it later in the program, with the English faded out. */
export type WalkMode = 'teach' | 'test' | 'listen' | 'hear' | 'again';

export interface WalkItem {
  id: string;
  /** What is spoken as the German answer — the headword, article included. */
  de: string;
  /** What is spoken as the English prompt — the first sense of the gloss. */
  en: string;
  /** One German example sentence, spoken when a word is taught or listened to. */
  example?: string;
  /** No schedule yet: taught before it is tested. */
  isNew: boolean;
}

export interface Presentation {
  item: number;
  lane: 'practice' | 'listen';
  mode: WalkMode;
}

/** Rough seconds per presentation, for planning before the clips exist. Measured
 *  against the layout below with typical clip lengths; the real total comes from
 *  `layout`, which is what the walk is actually as long as. */
export const EST_SECONDS: Record<WalkMode, number> = { teach: 12, test: 11, listen: 9, hear: 7, again: 4 };

/** When a new word is tested again, in presentations after it was taught. At the
 *  estimates above: ~40 s, ~2 min, ~5 min. */
const NEW_RETESTS = [3, 9, 25];
/** A review card is tested once, and once more later if the walk runs long. */
const REVIEW_RETEST = 14;
/** Listening items are cycled rather than drawn without end: a second pass over
 *  a word is worth more than a thirtieth new one, and every unique item is three
 *  clips to synthesise on the phone before the walk can start. */
export const MAX_LISTEN = 30;

export const DURATIONS = [5, 10, 15, 20, 30, 60] as const;

/** Order the walk. `practice` is the day's queue (due reviews, then chosen new
 *  words); `listen` is what fills the time after it. */
export function schedule(practice: WalkItem[], listen: WalkItem[], minutes: number): Presentation[] {
  const budget = minutes * 60;
  const out: Presentation[] = [];
  const pending: { due: number; item: number }[] = [];
  const listenPool = listen.slice(0, MAX_LISTEN);
  let t = 0;
  let next = 0;
  let li = 0;

  const push = (p: Presentation) => { out.push(p); t += EST_SECONDS[p.mode]; };

  while (t < budget) {
    pending.sort((a, b) => a.due - b.due);
    if (pending.length && pending[0].due <= out.length) {
      push({ item: pending.shift()!.item, lane: 'practice', mode: 'test' });
    } else if (next < practice.length) {
      const i = next++;
      if (practice[i].isNew) {
        push({ item: i, lane: 'practice', mode: 'teach' });
        for (const gap of NEW_RETESTS) pending.push({ due: out.length + gap - 1, item: i });
      } else {
        push({ item: i, lane: 'practice', mode: 'test' });
        pending.push({ due: out.length + REVIEW_RETEST - 1, item: i });
      }
    } else if (pending.length && pending[0].due - out.length <= 2) {
      // Nothing new left to introduce; close a short gap rather than filler.
      push({ item: pending.shift()!.item, lane: 'practice', mode: 'test' });
    } else if (listenPool.length) {
      push({ item: li % listenPool.length, lane: 'listen', mode: 'listen' });
      li++;
    } else if (pending.length) {
      push({ item: pending.shift()!.item, lane: 'practice', mode: 'test' });
    } else break;
  }
  return out;
}

// ---- what is said ------------------------------------------------------------

/** The English prompt: the gloss's first sense, without asides. "to manage, to
 *  get done; to create" → "to manage, to get done". A walk prompt has to be
 *  sayable in a breath, and the first sense is the one the card is about. */
export function promptOf(en: string): string {
  const first = en.split(';')[0].replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  return first || en.trim();
}

/** The German answer as it should be *heard*: notation removed. "warten auf + A"
 *  → "warten auf"; "der/die Erwachsene" → "der Erwachsene". */
export function answerOf(term: string): string {
  return term
    .replace(/\s*\+\s*[ADGN]\b/g, '')
    .replace(/^der\/die\s+/, 'der ')
    .replace(/\s*…\s*/g, ' ')
    .trim();
}

// ---- the timeline ------------------------------------------------------------

export interface Segment {
  /** Seconds from the start of the walk. */
  at: number;
  /** A clip key — `de:<text>` or `en:<text>` — or a cue tone. */
  clip?: string;
  tone?: boolean;
}

export interface Placed extends Presentation {
  start: number;
  /** When the German answer starts. A press grades the latest presentation whose
   *  answer has begun — so "knew it" pressed while the next English prompt is
   *  already playing still lands on the word just answered. */
  answerAt: number;
  end: number;
}

export const TONE_SECONDS = 0.12;
/** The silence the learner speaks into. Long enough for a two-word answer said
 *  while breathing hard; short enough that a walk does not feel like waiting. */
export const SAY_SECONDS = 3.4;
const LEAD_IN = 1.0;

export const deKey = (text: string) => `de:${text}`;
export const enKey = (text: string) => `en:${text}`;

/** Every clip a plan needs, once. */
export function clipsFor(pres: Presentation[], practice: WalkItem[], listen: WalkItem[]): string[] {
  const keys = new Set<string>();
  for (const p of pres) {
    const it = (p.lane === 'practice' ? practice : listen)[p.item];
    keys.add(deKey(it.de));
    // A returning word is heard in German only: the support fades (lib/listen.ts).
    if (p.mode !== 'again') keys.add(enKey(it.en));
    if (it.example && p.mode !== 'test') keys.add(deKey(it.example));
  }
  return [...keys];
}

/** Put every clip on the clock. `dur` returns a clip's length in seconds. */
export function layout(pres: Presentation[], practice: WalkItem[], listen: WalkItem[],
                       dur: (key: string) => number): { segments: Segment[]; placed: Placed[]; total: number } {
  const segments: Segment[] = [];
  const placed: Placed[] = [];
  let t = LEAD_IN;
  const say = (key: string, gapAfter: number) => {
    segments.push({ at: t, clip: key });
    t += dur(key) + gapAfter;
  };

  for (const p of pres) {
    const it = (p.lane === 'practice' ? practice : listen)[p.item];
    const start = t;
    let answerAt = t;
    if (p.mode === 'test') {
      say(enKey(it.en), 0.25);
      segments.push({ at: t, tone: true });
      t += TONE_SECONDS + SAY_SECONDS;
      answerAt = t;
      say(deKey(it.de), 0.7);
      say(deKey(it.de), 2.2);
    } else if (p.mode === 'teach') {
      answerAt = t;
      say(deKey(it.de), 0.6);
      say(enKey(it.en), 0.6);
      say(deKey(it.de), it.example ? 0.8 : 1.4);
      if (it.example) say(deKey(it.example), 1.4);
    } else if (p.mode === 'hear') {
      // German, English, German again, then the word in a sentence.
      answerAt = t;
      say(deKey(it.de), 0.6);
      say(enKey(it.en), 0.6);
      say(deKey(it.de), it.example ? 0.8 : 1.8);
      if (it.example) say(deKey(it.example), 1.8);
    } else if (p.mode === 'again') {
      // The return: German only. Meaning is now the listener's job, gently.
      answerAt = t;
      say(deKey(it.de), it.example ? 0.8 : 1.8);
      if (it.example) say(deKey(it.example), 1.8);
    } else {
      answerAt = t;
      say(deKey(it.de), 0.6);
      say(enKey(it.en), it.example ? 0.8 : 1.4);
      if (it.example) say(deKey(it.example), 1.4);
    }
    placed.push({ ...p, start, answerAt, end: t });
  }
  return { segments, placed, total: t + 0.5 };
}

/** Which presentation a press at `t` seconds is about, or -1. Tests are graded
 *  from the moment their answer begins until the next test's answer begins;
 *  listening items (for saving) from their start. Teaching is never graded. */
export function pressTarget(placed: Placed[], t: number): number {
  for (let i = placed.length - 1; i >= 0; i--) {
    const p = placed[i];
    if (p.mode === 'teach') continue;
    const from = p.mode === 'test' ? p.answerAt : p.start;
    if (from <= t) return i;
  }
  return -1;
}
