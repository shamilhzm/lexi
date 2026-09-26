// The feed's non-word slots — the rules for *when* they appear, kept pure so they
// can be tested without a store, a DOM or a scroller.
//
// ## Why the feed needs a "ready" slot at all
//
// The loop is *browse → save → Üben teaches what you chose*, and the feed carried
// only the first two thirds of it. Saving a word said "Next session will teach
// this", and nothing on the surface said when that session was or offered a way
// into it: the one route was guessing that the graduation cap in the tab bar was
// it. A learner with a backlog was shown `0/5` — *save more* — above a pile of due
// reviews the feed never mentioned. (Panel review 2026-09-25, 02 finding 1.)
//
// The fix is a **slot**, not a room and not a home screen: it scrolls past like a
// story does, grades nothing, and the app still opens on a word. It says what is
// waiting — the words you saved, then the ones due back — and starts a session of
// exactly those, which returns to the same place in the feed.
import { ALL_LEVELS, type CEFR } from '../types.ts';

/** Where the ready slot sits when there is something ready at the moment the feed
 *  opens: after the seventh word. Late enough that the first screens are German
 *  rather than a to-do list, and clear of the story slot after the fifth. */
export const READY_AT = 6;

/** A known-word count past which the news is a reasonable offer even without a
 *  placement. A judgement, not a measurement: it is roughly where a learner has
 *  met the commonest A1 nouns and verbs, below which a Tagesschau paragraph is
 *  mostly words they cannot look past. */
export const TOPIC_KNOWN_FLOOR = 300;

export interface Ready {
  /** The session the slot starts — saved words first, then due reviews. */
  ids: string[];
  /** How many of `ids` are words the learner saved and has not studied yet. */
  saved: number;
  /** How many of `ids` are due reviews. */
  due: number;
}

/** What the ready slot offers, derived from the day's briefing rather than
 *  recomputed beside it — so it can never promise a word the scheduler would not
 *  serve. The briefing is `[...due, ...fresh]`; of the fresh picks only the saved
 *  ones count as *ready*, because "a word from your thinnest topic" is the
 *  scheduler's choice and the slot speaks for the learner's.
 *
 *  Saved words lead because they are the instruction; due reviews follow. The
 *  whole list is capped at the session ceiling, so the number on the slot is
 *  never larger than the session it opens. */
export function readyFrom(
  briefing: { ids: string[]; due: number },
  saved: ReadonlySet<string>,
  isNew: (id: string) => boolean,
  ceiling: number,
): Ready {
  const dueIds = briefing.ids.slice(0, briefing.due);
  const savedIds = briefing.ids.slice(briefing.due).filter((id) => saved.has(id) && isNew(id));
  const ids = [...savedIds, ...dueIds].slice(0, Math.max(0, ceiling));
  const nSaved = Math.min(savedIds.length, ids.length);
  return { ids, saved: nSaved, due: ids.length - nSaved };
}

/** Where the ready slot should be after the learner meets the day's save goal.
 *
 *  **It only ever moves forward, and only once it is well behind.** The feed's
 *  one inviolable rule is that nothing re-orders under a thumb, so the slot is
 *  never moved while it could be on screen: it is placed two slots ahead of the
 *  furthest word the learner has reached (below the viewport, where an insertion
 *  shifts nothing they are looking at), and left alone until they have scrolled a
 *  whole story interval past it. Never earlier than `READY_AT`, and never on a
 *  story's heels. */
export function nextReadyAt(current: number | null, reached: number, storyEvery: number): number {
  if (current !== null && reached < current + storyEvery) return current;
  let at = Math.max(READY_AT, reached + 2);
  if ((at + 1) % storyEvery === 0) at += 1;
  return at;
}

/** Whether the feed may ask a learner to pick news topics.
 *
 *  The question used to arrive at the fourth screen for everybody, including a
 *  visitor on their fourth German word — "Today's news, in German" is the right
 *  offer for a B1 reader and a promise the app cannot keep at A0. A placement at
 *  A2 or above, or a real vocabulary, earns it. Anyone can still choose topics in
 *  Profile; this only gates the unasked offer. */
export function topicAskAllowed(placed: CEFR | null, known: number): boolean {
  if (placed && ALL_LEVELS.indexOf(placed) >= ALL_LEVELS.indexOf('A2')) return true;
  return known >= TOPIC_KNOWN_FLOOR;
}
