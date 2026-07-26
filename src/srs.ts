// Scheduler — FSRS via ts-fsrs (same engine Praxis uses; not hand-rolled).
// Thin wrapper so the rest of the app stays decoupled from the library shape.
import { fsrs, createEmptyCard, Rating, State, type Card, type Grade } from 'ts-fsrs';

export { Rating, State };
export type { Card, Grade };

let engine = fsrs();

/** Set the FSRS desired-retention target (0..1). Higher = more reviews, higher
 *  recall. Rebuilds the engine so all subsequent scheduling uses the new target. */
export function setRetention(request_retention: number) {
  engine = fsrs({ request_retention });
}

export function emptyCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

// localStorage round-trips dates to ISO strings; revive them before use.
export function reviveCard(c: any): Card {
  c.due = new Date(c.due);
  if (c.last_review) c.last_review = new Date(c.last_review);
  return c as Card;
}

export function schedule(card: Card, rating: Grade, now: Date = new Date()): Card {
  return engine.next(card, now, rating).card;
}

export function isDue(card: Card, now: number = Date.now()): boolean {
  return new Date(card.due).getTime() <= now;
}

/** Reviews a card needs before its interval estimate is worth stating precisely. */
const CONFIDENT_REPS = 2;

/** Human label for when a grade will next surface the card (preview on buttons).
 *
 *  A learner on their second-ever review of a word they cannot yet spell was shown
 *  "18 days", which reads as a promise the app has no business making. The
 *  temptation is to cap it — and that would be a lie, so it isn't what this does.
 *
 *  The real defect is *false precision*. After one review FSRS is extrapolating
 *  from a single data point; the model genuinely does not know 18 days from 21, and
 *  printing a round number implies it does. So an early estimate is stated at the
 *  precision it actually has — "~3 weeks" — and becomes exact once the card has
 *  been answered enough times to mean it. Short intervals stay precise at every
 *  age: "10 min" is a real claim about the next few minutes, and it is also the
 *  one a learner most needs to trust. */
export function previewInterval(card: Card, rating: Grade): string {
  const next = engine.next(card, new Date(), rating).card;
  const days = (new Date(next.due).getTime() - Date.now()) / 86_400_000;
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))} min`;
  if (days < 1) return `${Math.round(days * 24)} hr`;

  if (card.reps < CONFIDENT_REPS && days >= 7) {
    if (days < 60) return `~${Math.round(days / 7)} weeks`;
    return `~${Math.round(days / 30)} months`;
  }

  if (days < 30) return `${Math.round(days)} ${Math.round(days) === 1 ? 'day' : 'days'}`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} yr`;
}
