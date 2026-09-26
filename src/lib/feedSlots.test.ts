// The feed's slot rules. Pure, so the properties that matter — the ready slot
// never promises more than the session it opens, never moves under a thumb, and
// the news offer waits for a reader — are pinned without a DOM.
import { describe, it, expect } from 'vitest';
import { readyFrom, nextReadyAt, topicAskAllowed, READY_AT, TOPIC_KNOWN_FLOOR } from './feedSlots.ts';

const isNew = (fresh: string[]) => (id: string) => fresh.includes(id);

describe('readyFrom', () => {
  it('puts saved words first, then due reviews, and skips the scheduler’s own fresh picks', () => {
    const r = readyFrom({ ids: ['d1', 'd2', 's1', 'w1', 's2'], due: 2 }, new Set(['s1', 's2']), isNew(['s1', 'w1', 's2']), 40);
    expect(r.ids).toEqual(['s1', 's2', 'd1', 'd2']);
    expect(r.saved).toBe(2);
    expect(r.due).toBe(2);
  });

  it('does not count a saved word that is already being studied', () => {
    // A due review that is also bookmarked is due, not "saved and waiting".
    const r = readyFrom({ ids: ['d1', 's1'], due: 1 }, new Set(['d1', 's1']), isNew([]), 40);
    expect(r.ids).toEqual(['d1']);
    expect(r).toMatchObject({ saved: 0, due: 1 });
  });

  it('never offers more than the session ceiling, and the parts add up to the whole', () => {
    const due = Array.from({ length: 60 }, (_, i) => `d${i}`);
    const r = readyFrom({ ids: [...due, 's1'], due: 60 }, new Set(['s1']), isNew(['s1']), 40);
    expect(r.ids).toHaveLength(40);
    expect(r.ids[0]).toBe('s1');
    expect(r.saved + r.due).toBe(40);
  });

  it('is empty when nothing is waiting', () => {
    expect(readyFrom({ ids: ['w1'], due: 0 }, new Set(), isNew(['w1']), 40).ids).toEqual([]);
  });
});

describe('nextReadyAt', () => {
  it('places a first slot ahead of the learner, never before READY_AT', () => {
    expect(nextReadyAt(null, 0, 5)).toBeGreaterThanOrEqual(READY_AT);
    expect(nextReadyAt(null, 20, 5)).toBeGreaterThan(20);
  });

  it('leaves a slot alone until the learner is a whole story interval past it', () => {
    expect(nextReadyAt(6, 8, 5)).toBe(6);
    expect(nextReadyAt(6, 11, 5)).toBeGreaterThan(11);
  });

  it('never lands directly after a story slot', () => {
    for (let reached = 0; reached < 60; reached++) {
      const at = nextReadyAt(null, reached, 5);
      expect((at + 1) % 5).not.toBe(0);
    }
  });
});

describe('topicAskAllowed', () => {
  it('waits for a reader: A2 placement or a real vocabulary', () => {
    expect(topicAskAllowed(null, 0)).toBe(false);
    expect(topicAskAllowed('A1', 50)).toBe(false);
    expect(topicAskAllowed('A2', 0)).toBe(true);
    expect(topicAskAllowed('B1', 0)).toBe(true);
    expect(topicAskAllowed(null, TOPIC_KNOWN_FLOOR)).toBe(true);
  });
});
