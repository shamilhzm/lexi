// The sentence-builder shuffles a sentence into tiles, and German capitalises both
// the first word and every noun. So a capital carried two meanings — "I am a noun",
// which the learner needs, and "I was first", which is the answer. 3,912 of 6,020
// order drills (65%) opened with a word that is lowercase everywhere else.
import { describe, it, expect } from 'vitest';
import { citationTiles, sentenceCase, sameOrder } from './wordorder.ts';

describe('citation case removes the positional capital', () => {
  it('lowercases a function word that was only capitalised for being first', () => {
    expect(citationTiles(['Ich', 'treffe', 'meine', 'Freunde']))
      .toEqual(['ich', 'treffe', 'meine', 'Freunde']);
    expect(citationTiles(['Heute', 'ist', 'es', 'kalt']))
      .toEqual(['heute', 'ist', 'es', 'kalt']);
    expect(citationTiles(['Mein', 'Vater', 'arbeitet', 'in', 'Berlin']))
      .toEqual(['mein', 'Vater', 'arbeitet', 'in', 'Berlin']);
  });

  it('leaves nouns alone — their capital is not positional', () => {
    // German capitalises a noun wherever it stands, so nothing is given away.
    expect(citationTiles(['Peter', 'kommt', 'heute', 'nicht']))
      .toEqual(['Peter', 'kommt', 'heute', 'nicht']);
    expect(citationTiles(['Kinder', 'brauchen', 'viel', 'Schlaf']))
      .toEqual(['Kinder', 'brauchen', 'viel', 'Schlaf']);
  });

  it('leaves the formal Sie and Ihr alone — they are always capitalised', () => {
    // Nothing in the token separates formal *Sie* from lowercase *sie*, so the
    // list excludes them rather than guessing and writing bad German.
    expect(citationTiles(['Sie', 'sind', 'sehr', 'freundlich']))
      .toEqual(['Sie', 'sind', 'sehr', 'freundlich']);
    expect(citationTiles(['Ihre', 'Tochter', 'ist', 'krank']))
      .toEqual(['Ihre', 'Tochter', 'ist', 'krank']);
  });

  it('leaves it alone when the same word is capitalised later too', () => {
    // Two sentences joined by a dash: the later capital is another opener, so
    // lowercasing only the first would read as an error rather than a citation.
    expect(citationTiles(['Das', 'Konzert', 'fällt', 'aus.', '–', 'Das', 'ist', 'schade']))
      .toEqual(['Das', 'Konzert', 'fällt', 'aus.', '–', 'Das', 'ist', 'schade']);
  });

  it('lowercases the auxiliary or modal that opens a question', () => {
    // Found by playing the drill: «Habt ihr Hilfe angeboten?» rendered *Habt*
    // capitalised among lowercase tiles, which is the whole answer.
    expect(citationTiles(['Habt', 'ihr', 'Hilfe', 'angeboten']))
      .toEqual(['habt', 'ihr', 'Hilfe', 'angeboten']);
    expect(citationTiles(['Können', 'Sie', 'mir', 'helfen']))
      .toEqual(['können', 'Sie', 'mir', 'helfen']);
    expect(citationTiles(['Möchtest', 'du', 'einen', 'Kaffee']))
      .toEqual(['möchtest', 'du', 'einen', 'Kaffee']);
  });

  it('leaves a full verb alone — an open class this list cannot name', () => {
    // 23.7% of drills still open with something unnameable: imperatives, full
    // finite verbs, adjectives. Left leaking rather than guessed at, because
    // lowercasing a noun by mistake writes bad German.
    expect(citationTiles(['Kommst', 'du', 'morgen', 'mit']))
      .toEqual(['Kommst', 'du', 'morgen', 'mit']);
    expect(citationTiles(['Mach', 'bitte', 'die', 'Tür', 'zu']))
      .toEqual(['Mach', 'bitte', 'die', 'Tür', 'zu']);
  });

  it('survives the degenerate inputs', () => {
    expect(citationTiles([])).toEqual([]);
    expect(citationTiles(['ich', 'gehe'])).toEqual(['ich', 'gehe']);   // already lowercase
  });
});

describe('grading ignores case, because the learner never chose it', () => {
  it('matches regardless of how the tiles were cased', () => {
    expect(sameOrder(['ich', 'gehe', 'heute'], ['Ich', 'gehe', 'heute'])).toBe(true);
  });

  it('still rejects a different order', () => {
    expect(sameOrder(['heute', 'gehe', 'ich'], ['ich', 'gehe', 'heute'])).toBe(false);
  });

  it('rejects a different length', () => {
    expect(sameOrder(['ich', 'gehe'], ['ich', 'gehe', 'heute'])).toBe(false);
  });
});

describe('the answer line reads as a sentence', () => {
  it('restores the opening capital', () => {
    expect(sentenceCase('ich treffe meine Freunde')).toBe('Ich treffe meine Freunde');
  });
  it('leaves an already-capitalised opener', () => {
    expect(sentenceCase('Peter kommt heute')).toBe('Peter kommt heute');
  });
  it('survives an empty string', () => {
    expect(sentenceCase('')).toBe('');
  });
});
