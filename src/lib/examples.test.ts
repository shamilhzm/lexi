// Pins the real defective rows from the shipped corpus, not invented ones — and
// then asserts the sanitizer is inert on the other ~99.6% of the file, because a
// cleanup pass that quietly rewrites 16,000 good examples is worse than the bug.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanExample, cleanExamples, MAX_EXAMPLE_CHARS } from './examples.ts';
import type { Example, Word } from '../types.ts';

const ex = (de: string, en = '', lvl = 'A1'): Example => ({ de, en, lvl });
const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));

describe('cleanExample', () => {
  it('splits a German field that swallowed its own translation', () => {
    // voc:A1:täglich — the bug as reported.
    const out = cleanExample(ex(
      'Unser täglich Brot gib uns heute\nGive us today our daily bread',
      'Give us today our daily bread',
    ));
    expect(out).toEqual({ de: 'Unser täglich Brot gib uns heute', en: 'Give us today our daily bread', lvl: 'A1' });
  });

  it('strips a trailing translation even without a newline to split on', () => {
    const out = cleanExample(ex('Unser täglich Brot gib uns heute Give us today our daily bread',
      'Give us today our daily bread'));
    expect(out!.de).toBe('Unser täglich Brot gib uns heute');
  });

  it('drops the untranslated-quotation placeholder from the English', () => {
    // voc:B1:der Offizier
    const out = cleanExample(ex('Die acht kleineren Steine werden Bauern genannt.',
      '(please add an English translation of this quotation)'));
    expect(out!.de).toBe('Die acht kleineren Steine werden Bauern genannt.');
    expect(out!.en).toBe('');
  });

  it('rejects a bibliography line masquerading as a German sentence', () => {
    // voc:B1:überhaupt
    expect(cleanExample(ex(
      '1812, the Brothers Grimm, Kinder- und Haus-Märchen, Berlin, die Realschulbuchhandlung, page VIII',
      'One will easily notice besides…',
    ))).toBeNull();
  });

  it('recovers the German when a citation line precedes it', () => {
    // voc:B1:die Liebe — citation, newline, then the actual quotation.
    const out = cleanExample(ex(
      '1787, Johann Wolfgang von Goethe, Egmont\nUnd konnte ich fürchten, daß diese unglückliche Liebe…',
      'And could I imagine, that this unhappy love…',
    ));
    expect(out!.de).toBe('Und konnte ich fürchten, daß diese unglückliche Liebe…');
  });

  it('trims a leading elision marker', () => {
    const out = cleanExample(ex('[...] und manche beglückwünschten ihn zu seiner Genesung.', 'and some congratulated him'));
    expect(out!.de).toBe('und manche beglückwünschten ihn zu seiner Genesung.');
  });

  it('leaves an ordinary example completely untouched', () => {
    const good = ex('Mein Name ist Anna.', 'My name is Anna.', 'A1');
    expect(cleanExample(good)).toEqual(good);
  });

  it('keeps a date inside a sentence — the year rule is lead-anchored', () => {
    const good = ex('1990 fiel die Mauer, und alles änderte sich.', 'In 1990 the wall fell.');
    expect(cleanExample(good)).toEqual(good);
  });
});

describe('cleanExamples', () => {
  it('drops an over-long example when a usable one remains', () => {
    const out = cleanExamples([ex('A'.repeat(400)), ex('Kurz und gut.')]);
    expect(out).toHaveLength(1);
    expect(out[0].de).toBe('Kurz und gut.');
  });

  it('keeps the shortest rather than leaving a card with nothing', () => {
    const out = cleanExamples([ex('A'.repeat(500)), ex('B'.repeat(300))]);
    expect(out).toHaveLength(1);
    expect(out[0].de).toHaveLength(300);
  });

  it('handles a missing or empty list', () => {
    expect(cleanExamples(undefined)).toEqual([]);
    expect(cleanExamples([])).toEqual([]);
  });
});

// The sanitizer runs over every card at boot, so its blast radius is the thing to
// measure. These assert against the corpus as shipped; if a batch fixes rows in
// the JSON the counts fall, which is the point — so they are bounds, not equalities.
describe('against the shipped corpus', () => {
  const all = corpus.flatMap((w) => (w.ex ?? []).map((e) => ({ id: w.id, e })));

  it('touches only a small fraction of the file', () => {
    const changed = all.filter(({ e }) => {
      const c = cleanExample(e);
      return !c || c.de !== e.de || c.en !== (e.en ?? '');
    });
    expect(all.length).toBeGreaterThan(15_000);
    // ~0.4% today. A regex that starts matching ordinary German will blow this.
    expect(changed.length / all.length).toBeLessThan(0.02);
  });

  it('leaves no newline, cruft marker or self-duplicating field behind', () => {
    for (const w of corpus) {
      for (const e of cleanExamples(w.ex)) {
        expect(e.de, w.id).not.toMatch(/\n/);
        expect(e.en, w.id).not.toMatch(/\n/);
        expect(e.de, w.id).not.toMatch(/please add an English translation/i);
        expect(e.en, w.id).not.toMatch(/please add an English translation/i);
        if (e.en) expect(e.de.toLowerCase(), w.id).not.toBe(e.en.toLowerCase());
      }
    }
  });

  // The flip face shows ex[0], so the first example is the card. Cleared by
  // scripts/corpus/frontfix.ts — promoting a clean sibling where one existed and
  // authoring a lead for the 23 that had none. Pinned here because it is a
  // property of the shipped file, and the next imported batch will not know it.
  it('never leads a card with a fragment, a citation or a wall of text', () => {
    const bad = corpus
      .filter((w) => w.kind === 'word' && w.ex?.length)
      .map((w) => ({ id: w.id, de: w.ex![0].de.trim() }))
      .filter(({ de }) => {
        const close = de.search(/[“"«]/);
        const quoted = /^[„"»]/.test(de)
          && (/[“"«]\s*[–—-]\s*[„"»]/.test(de) || close === -1 || close > 30 || close >= de.length - 2);
        return !/[.!?…]$/.test(de) || de.length > 140 || quoted;
      });
    expect(bad.map((b) => b.id)).toEqual([]);
  });

  it('never empties a card that had a usable example', () => {
    const emptied = corpus.filter((w) => (w.ex?.length ?? 0) > 0 && cleanExamples(w.ex).length === 0);
    expect(emptied.map((w) => w.id)).toEqual([]);
  });

  it('caps every surviving example a card did not need to keep', () => {
    const over = corpus.flatMap((w) => {
      const out = cleanExamples(w.ex);
      return out.length > 1 ? out.filter((e) => e.de.length > MAX_EXAMPLE_CHARS).map(() => w.id) : [];
    });
    expect(over).toEqual([]);
  });
});
