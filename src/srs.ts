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

/** Human label for when a grade will next surface the card (preview on buttons). */
export function previewInterval(card: Card, rating: Grade): string {
  const next = engine.next(card, new Date(), rating).card;
  const days = (new Date(next.due).getTime() - Date.now()) / 86_400_000;
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))} min`;
  if (days < 1) return `${Math.round(days * 24)} hr`;
  if (days < 30) return `${Math.round(days)} ${Math.round(days) === 1 ? 'day' : 'days'}`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} yr`;
}
