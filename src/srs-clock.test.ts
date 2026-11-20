// Persona pass, 2026-11-20 ("Jonas"): a card graded while the device clock was a
// year ahead, then the clock corrected. ts-fsrs throws on a negative elapsed time
// of a day or more, and the interval preview runs during render, so the session
// fell to its error boundary and the grade button could never advance the card.
import { describe, it, expect } from 'vitest';
import { schedule, previewInterval, retrievability, emptyCard, Rating } from './srs.ts';

describe('a review stamped in the future', () => {
  const ahead = new Date('2027-11-20T10:00:00Z');
  const now = new Date('2026-11-20T10:00:00Z');
  const graded = schedule(emptyCard(ahead), Rating.Good, ahead);

  it('schedules, previews and predicts from the corrected clock without throwing', () => {
    expect(() => schedule(graded, Rating.Good, now)).not.toThrow();
    expect(() => previewInterval(graded, Rating.Again)).not.toThrow();
    expect(() => retrievability(graded, now)).not.toThrow();
    const next = schedule(graded, Rating.Good, now);
    expect(new Date(next.due).getTime()).toBeGreaterThan(now.getTime());
    expect(new Date(next.last_review!).getTime()).toBe(now.getTime());
  });
});
