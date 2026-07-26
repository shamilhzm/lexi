// Scheduler — FSRS via ts-fsrs (the brief mandates FSRS; do not hand-roll).
// Thin wrapper so the rest of the app stays decoupled from the library shape.
import { fsrs, createEmptyCard, Rating, State, type Card, type Grade } from 'ts-fsrs';

export { Rating, State };
export type { Card, Grade };

const engine = fsrs();

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

export function dueLabel(card: Card | undefined): string {
  if (!card || card.state === State.New) return 'new';
  const days = Math.round((new Date(card.due).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'due';
  if (days === 1) return 'in 1 day';
  if (days < 30) return `in ${days} days`;
  return `in ${Math.round(days / 30)} mo`;
}
