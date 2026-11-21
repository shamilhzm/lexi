// Hören — Lexi in the background, for while you do something else.
//
// The owner asked for it on 2026-10-02, after walk mode: "I'm more looking for the
// audio to just run in the background while I do other things, not necessarily
// requiring me to engage with it, but a way for me to still absorb the content
// without having to have my headphones in or clicking anything." So this is not
// walk mode with the grading switched off; it is a different shape:
//
//   · **Nothing to answer.** Each word is heard German · English · German · a
//     sentence. There is no pause to speak into and no tone asking for a turn —
//     a listener who is cooking is not taking a test.
//   · **It comes back.** A word returns about 1, 4, 10 and 20 minutes after its
//     first hearing. Spacing is the strongest lever there is on whether a word
//     heard in passing is still there tomorrow, and it costs nothing to apply.
//   · **The English fades.** A returning word is heard in German only, with its
//     sentence. Support first, then withdrawn — the learner supplies the meaning
//     silently, which is as much retrieval as a speaker on a kitchen counter can
//     honestly ask for.
//   · **It never grades, and records nothing.** Same rule as the feed, pushed one
//     step further: not even a dwell. Playback is not interest, and counting it
//     would corrupt "you kept stopping on this", which the scheduler acts on.
//
// Everything here is pure: what plays, in what order. `walk.ts` lays it on the
// clock and `walkAudio.ts` renders it, exactly as for walk mode, because a single
// file already playing is the one thing a locked phone lets continue.
import { EST_SECONDS, type Presentation, type Placed, type WalkItem } from './walk.ts';

/** Program lengths offered, in minutes. */
export const LISTEN_DURATIONS = [15, 30, 60] as const;
export const DEFAULT_MINUTES = 30;

/** When a word returns, in seconds after its first hearing: about 1, 4, 10 and
 *  20 minutes — an expanding schedule inside one program. */
export const RETURNS_AT = [60, 240, 600, 1200] as const;

/** Which words Hören plays, best first: the saved words, the day's fresh words,
 *  the words reviewed today, then the feed's order. **Never a word with a card
 *  that is due**, its own or a drill's (`gym:gender:…`), until Üben has asked it.
 *
 *  It used to play the briefing as built, which is saved, then *due*, then fresh,
 *  so a learner listening over breakfast heard the answer minutes before Üben
 *  asked for it, and FSRS credited the borrowed memory with a longer interval
 *  (PANEL-2026-10-04). New words have no schedule to corrupt, and hearing them
 *  first is real learning, so they stay. A due word comes back the moment it is
 *  reviewed: it is then a word reviewed today. `held` counts what waited, so an
 *  empty programme can say why. */
export function listenOrder(
  briefing: readonly string[], feed: readonly string[],
  o: { due: ReadonlySet<string>; saved: (id: string) => boolean; reviewedToday: readonly string[]; max: number },
): { ids: string[]; held: number } {
  const ids: string[] = [];
  const seen = new Set<string>();
  const held = new Set<string>();
  const take = (id: string) => {
    if (seen.has(id) || ids.length >= o.max) return;
    if (o.due.has(id)) { held.add(id); return; }
    seen.add(id); ids.push(id);
  };
  for (const id of briefing) if (o.saved(id)) take(id);
  for (const id of briefing) take(id);
  for (const id of o.reviewedToday) take(id);
  for (const id of feed) { if (ids.length >= o.max) break; take(id); }
  return { ids, held: held.size };
}

/** Order a program. `items` is the queue, best first (see `listenOrder`); the
 *  program takes as many as fit.
 *
 *  Time is estimated from `EST_SECONDS`, so a return lands *about* when it is
 *  meant to — the real clock comes from `walk.layout` once the clips exist.
 *  The `hear`/`again` estimates were set from a real render: on the iPhone
 *  simulator (2026-10-02) 60 words came out at 21 minutes against estimates of
 *  11 s and 6 s, so they are 7 s and 4 s — about 23 s a word, all returns in. */
export function listenProgram(items: WalkItem[], minutes: number): Presentation[] {
  const budget = minutes * 60;
  const out: Presentation[] = [];
  const returns: { due: number; item: number }[] = [];
  let t = 0;
  let next = 0;

  const push = (item: number, mode: 'hear' | 'again') => {
    out.push({ item, lane: 'listen', mode });
    t += EST_SECONDS[mode];
  };

  while (t < budget) {
    returns.sort((a, b) => a.due - b.due || a.item - b.item);
    if (returns.length && returns[0].due <= t) {
      push(returns.shift()!.item, 'again');
    } else if (next < items.length) {
      const i = next++;
      const heardAt = t;
      push(i, 'hear');
      for (const gap of RETURNS_AT) returns.push({ due: heardAt + gap, item: i });
    } else if (returns.length) {
      // Nothing new left to introduce: bring the next return forward rather than
      // fall silent. A short queue becomes a denser review, not dead air.
      push(returns.shift()!.item, 'again');
    } else break;
  }
  return out;
}

/** The presentation playing at `t` seconds, or -1 before the first. */
export function indexAt(placed: Placed[], t: number): number {
  let k = -1;
  for (let i = 0; i < placed.length; i++) {
    if (placed[i].start <= t) k = i; else break;
  }
  return k;
}

/** Where "next" goes from `t`: the start of the following word, or null at the
 *  end of the program. */
export function skipTarget(placed: Placed[], t: number): number | null {
  const i = indexAt(placed, t);
  return i + 1 < placed.length ? placed[i + 1].start : null;
}

/** Where "previous" goes from `t`. Like a music player: the start of the word
 *  playing, unless it began less than two seconds ago, then the one before. */
export function replayTarget(placed: Placed[], t: number): number {
  const i = indexAt(placed, t);
  if (i < 0) return 0;
  if (t - placed[i].start < 2 && i > 0) return placed[i - 1].start;
  return placed[i].start;
}

/** How many distinct words a program teaches. */
export function wordsIn(pres: Presentation[]): number {
  return new Set(pres.map((p) => p.item)).size;
}
