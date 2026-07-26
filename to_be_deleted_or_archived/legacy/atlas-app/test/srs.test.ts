import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyCard, schedule, isDue, dueLabel, Rating, State } from '../src/srs.ts';

test('FSRS: a new card rated Good advances and gets a future due', () => {
  const now = new Date('2026-06-08T12:00:00Z');
  const c = emptyCard(now);
  assert.equal(c.state, State.New);
  assert.equal(c.reps, 0);
  const next = schedule(c, Rating.Good, now);
  assert.ok(next.reps >= 1);
  assert.ok(next.state !== State.New);
  assert.ok(new Date(next.due).getTime() > now.getTime());
});

test('FSRS: Again after Good keeps the card coming back soon', () => {
  const now = new Date('2026-06-08T12:00:00Z');
  let c = schedule(emptyCard(now), Rating.Good, now);
  const lapsed = schedule(c, Rating.Again, new Date(c.due));
  assert.ok(lapsed.reps >= c.reps);
  assert.ok(new Date(lapsed.due).getTime() - now.getTime() < 4 * 86400000);
});

test('isDue: future due is not due now, past due is', () => {
  const next = schedule(emptyCard(), Rating.Good);
  assert.equal(isDue(next, Date.now()), false);
  assert.equal(isDue(next, new Date(next.due).getTime() + 1), true);
});

test('dueLabel: new vs scheduled', () => {
  assert.equal(dueLabel(emptyCard()), 'new');
  assert.ok(/new|day|in|mo/.test(dueLabel(schedule(emptyCard(), Rating.Easy))));
});
