// The A1 report, pinned. Each of these is a specific complaint from a learner three
// weeks in, and each fix is small enough that it would be easy to undo by accident.
import { describe, it, expect } from 'vitest';
import { parseList, matchList } from '../components/ClassListPicker.tsx';
import { previewInterval, emptyCard, Rating, schedule } from '../srs.ts';
import { registerWords } from '../data/index.ts';
import { resetSurfaceIndex } from './reader.ts';
import type { Word } from '../types.ts';

const w = (id: string, term: string, extra: Partial<Word> = {}): Word => ({
  id, term, en: 'x', pos: 'noun', level: 'A1', gender: 'der', plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...extra,
});

registerWords([
  w('voc:A1:der Hund', 'der Hund', { plural: 'die Hunde' }),
  w('voc:A1:die Katze', 'die Katze', { gender: 'die', plural: 'die Katzen' }),
  w('voc:A1:aufstehen', 'aufstehen', { pos: 'verb', gender: null }),
]);
resetSurfaceIndex();

// "No way to say: I'm in an A1 class, here's this week's chapter."
describe('class list', () => {
  it('takes a list however a worksheet happens to be pasted', () => {
    expect(parseList('der Hund\ndie Katze\naufstehen')).toEqual(['der Hund', 'die Katze', 'aufstehen']);
    expect(parseList('der Hund, die Katze; aufstehen')).toEqual(['der Hund', 'die Katze', 'aufstehen']);
    expect(parseList('1. der Hund\n2) die Katze\n- aufstehen')).toEqual(['der Hund', 'die Katze', 'aufstehen']);
  });

  it('strips the translation the learner wrote next to the word', () => {
    expect(parseList('der Hund – dog\ndie Katze — cat\naufstehen = to get up'))
      .toEqual(['der Hund', 'die Katze', 'aufstehen']);
    expect(parseList('der Hund\tdog')).toEqual(['der Hund']);
  });

  it('ignores blank lines and stray punctuation', () => {
    expect(parseList('\n\n der Hund \n\n—\n')).toEqual(['der Hund']);
  });

  it('matches through the article and through inflection', () => {
    expect(matchList(['der Hund']).words.map((x) => x.id)).toEqual(['voc:A1:der Hund']);
    expect(matchList(['Hund']).words.map((x) => x.id)).toEqual(['voc:A1:der Hund']);
    // A plural pasted off a worksheet still finds its card.
    expect(matchList(['die Hunde']).words.map((x) => x.id)).toEqual(['voc:A1:der Hund']);
  });

  it('keeps the learner’s order and de-duplicates', () => {
    const r = matchList(['die Katze', 'der Hund', 'Katze']);
    expect(r.words.map((x) => x.term)).toEqual(['die Katze', 'der Hund']);
  });

  it('names what it could not find rather than dropping it silently', () => {
    const r = matchList(['der Hund', 'Quatschwort', 'Blafasel']);
    expect(r.words).toHaveLength(1);
    // A list that quietly loses a third of its words is worse than one that says so.
    expect(r.missed).toEqual(['Quatschwort', 'Blafasel']);
  });
});

// "18 days on my second-ever review is mathematically right and psychologically
// wrong." The fix is not to cap a true number — it is to stop claiming a precision
// the model does not have after one data point.
describe('interval preview precision', () => {
  // Reviewed in the *past*, ascending: FSRS rejects a review dated before the
  // card's own last_review, so a card matured into the future can't be previewed.
  const mature = () => {
    let c = emptyCard(new Date(Date.now() - 60 * 86400e3));
    for (let i = 6; i > 0; i--) c = schedule(c, Rating.Good, new Date(Date.now() - i * 86400e3));
    return c;
  };

  it('hedges a long interval on a card with almost no history', () => {
    const label = previewInterval(emptyCard(), Rating.Easy);
    if (/week|month/.test(label)) expect(label.startsWith('~')).toBe(true);
    else expect(label).toMatch(/min|hr|days?/);   // short is fine, and stays exact
  });

  it('never hedges a short interval — those are the ones you must trust', () => {
    const label = previewInterval(emptyCard(), Rating.Again);
    expect(label).not.toContain('~');
    expect(label).toMatch(/min|hr/);
  });

  it('states an exact interval once the card has been answered enough to mean it', () => {
    const c = mature();
    expect(c.reps).toBeGreaterThanOrEqual(2);
    expect(previewInterval(c, Rating.Good)).not.toContain('~');
  });

  it('is never empty or unitless', () => {
    for (const card of [emptyCard(), mature()]) {
      for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const) {
        expect(previewInterval(card, r)).toMatch(/\d/);
        expect(previewInterval(card, r)).toMatch(/min|hr|day|week|month|mo|yr/);
      }
    }
  });
});
