// First-visit tours, one per surface *(2026-10-11)*.
//
// Replaces two one-line coach marks (`lexi.coach.feed.v1`, `lexi.coach.session.v1`)
// that each named a gesture and nothing else: a brand-new learner met four tabs and
// was told what two drags did. A tour says what the screen is *for*, then points at
// the controls it has.
//
// **Not in the backup** (SETTING_KEYS), like the coach flags before it: nothing here
// was authored by the learner. A restore that brings a tour back costs one tap on
// "Skip", and every tour is an overlay, so it can never push the card under the bar
// the way the inline coach block once did.

export type TourId = 'feed' | 'session' | 'themen' | 'progress';

const KEY = 'lexi.hints.v1';

function read(): Set<string> {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    return new Set(Array.isArray(a) ? a : []);
  } catch { return new Set(); }
}

export function tourSeen(id: TourId): boolean { return read().has(id); }

export function markTourSeen(id: TourId) {
  const s = read();
  s.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* private mode */ }
}

/** Settings → "Show the tips again". */
export function resetTours() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
}

/** Asks one swipeable element to show its gesture: a nudge right, then left.
 *  An event on the element, not shared state, so only the thing the tour is
 *  pointing at moves — never the next slot down. */
export const DEMO_EVENT = 'lexi:demo-swipe';
export const DEMO_STOP = 'lexi:demo-stop';
