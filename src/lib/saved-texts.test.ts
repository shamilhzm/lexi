// Saved texts — BACKLOG Now #2 Phase 2.
//
// The body is stored rather than a list of unknown-word ids, and these tests pin
// that: a saved text must re-measure against *today's* state, because a snapshot of
// what was unknown last week is exactly the thing the live meter exists not to be.
import { describe, it, expect, beforeEach } from 'vitest';
import { coverageOf, resetCoverageIndex, type WordState } from './coverage.ts';
import { registerWords } from '../data/index.ts';
import type { Word } from '../types.ts';

const w = (o: Partial<Word> & { id: string; term: string }): Word =>
  ({ en: 'x', pos: 'noun', level: 'A1', kind: 'word', field: 'Test', ex: [], syn: [], ant: [] , ...o }) as Word;

const CARDS: Word[] = [
  w({ id: 'v:hund', term: 'der Hund', gender: 'der', plural: 'die Hunde' }),
  w({ id: 'v:katze', term: 'die Katze', gender: 'die', plural: 'die Katzen' }),
  w({ id: 'v:garten', term: 'der Garten', gender: 'der', plural: '¨-' }),
];

async function freshStore() {
  localStorage.clear();
  const store = await import('../store.ts');
  registerWords(CARDS);
  resetCoverageIndex();
  return store;
}

beforeEach(() => { localStorage.clear(); });

describe('saving a text', () => {
  it('keeps the body, so the figure can be recomputed later', async () => {
    const store = await freshStore();
    store.saveText('My article', 'Der Hund und die Katze im Garten.');
    const [t] = store.savedTexts();
    expect(t.body).toContain('Hund');
    expect(t.title).toBe('My article');
  });

  it('re-saving the same body updates it instead of duplicating', async () => {
    const store = await freshStore();
    store.saveText('First', 'Der Hund im Garten.');
    store.saveText('Renamed', 'Der Hund im Garten.');
    expect(store.savedTexts()).toHaveLength(1);
    expect(store.savedTexts()[0].title).toBe('Renamed');
  });

  it('lists newest first and removes by id', async () => {
    const store = await freshStore();
    store.saveText('One', 'Der Hund.');
    store.saveText('Two', 'Die Katze.');
    expect(store.savedTexts().map((t) => t.title)).toEqual(['Two', 'One']);
    store.removeText(store.savedTexts()[0].id);
    expect(store.savedTexts().map((t) => t.title)).toEqual(['One']);
  });

  it('refuses an empty body and survives corrupt storage', async () => {
    const store = await freshStore();
    expect(store.saveText('x', '   ')).toBeNull();
    localStorage.setItem('lexi.texts.v1', '{not json');
    expect(store.savedTexts()).toEqual([]);
  });
});

describe('the meter is live, not a snapshot', () => {
  it('the same saved body reports a higher figure once words are known', async () => {
    const store = await freshStore();
    store.saveText('Article', 'Der Hund und die Katze im Garten.');
    const body = store.savedTexts()[0].body;

    const nothingKnown = coverageOf(body, { stateOf: () => 'new' as WordState });
    expect(nothingKnown.ratio).toBe(0);

    // Study one word. Nothing about the stored text changes — only the state does.
    const oneKnown = coverageOf(body, {
      stateOf: (word) => (word.id === 'v:hund' ? 'known' : 'new'),
    });
    expect(oneKnown.ratio).toBeGreaterThan(nothingKnown.ratio);
    expect(store.savedTexts()[0].body).toBe(body); // the text itself is untouched

    const allKnown = coverageOf(body, { stateOf: () => 'known' as WordState });
    expect(allKnown.ratio).toBe(1);
  });
});
