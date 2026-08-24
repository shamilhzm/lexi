// Two examples that are one example, and typography no learner can read.
//
// A card must carry two examples, and 18 cards met that by carrying the *same
// sentence twice* — «Gerne.» / «Gerne!», «Aha!» / «Aha.», «Schreien Sie.» /
// «Schreien Sie!». The standard was satisfied and its purpose was not.
//
// The near-twins are deliberately NOT covered: 86 cards have a pair above 0.90
// character similarity and 147 have two examples with the same English, but that
// band holds pairs worth keeping — `der Kopf` teaches «Mein Kopf tut weh» beside
// «Mir tut der Kopf weh», which is the dative construction and the whole point.
// Only exact-after-normalisation is decidable, so only that gates.
import { describe, it, expect } from 'vitest';
import { exampleKey, PREMODERN_TYPOGRAPHY } from './lib.ts';

describe('exampleKey — when are two examples one example', () => {
  it('folds the pairs that actually shipped', () => {
    for (const [a, b] of [
      ['Gerne.', 'Gerne!'],
      ['Aha!', 'Aha.'],
      ['Hallo Welt!', 'Hallo, Welt!'],
      ['Schreien Sie.', 'Schreien Sie!'],
      ['Ihr zufolge kommt er nicht.', 'Ihr zufolge, kommt er nicht.'],
      ['Bleib, solange du willst!', 'Bleib, solange du willst.'],
    ]) expect(exampleKey(a), `${a} vs ${b}`).toBe(exampleKey(b));
  });

  it('keeps a real second example distinct', () => {
    // The replacements written for these cards, against what they replaced.
    expect(exampleKey('Gerne.')).not.toBe(exampleKey('Ich helfe dir gerne beim Umzug.'));
    expect(exampleKey('Aha!')).not.toBe(exampleKey('Aha, jetzt verstehe ich das Problem.'));
  });

  it('does not fold a pair that differs by one word', () => {
    // The near-twin band, which is a reading list and not a check: these must
    // stay *different*, or the gate would start deleting deliberate minimal pairs.
    expect(exampleKey('Mein Kopf tut weh.')).not.toBe(exampleKey('Mir tut der Kopf weh.'));
    expect(exampleKey('Ich bin Berliner.')).not.toBe(exampleKey('Ich bin ein Berliner.'));
    expect(exampleKey('Ich brauche eine Ausrede.')).not.toBe(exampleKey('Ich brauche keine Ausrede.'));
  });

  it('folds umlauts and ß, so a spelling variant is still the same sentence', () => {
    expect(exampleKey('Das ist süß!')).toBe(exampleKey('Das ist suss.'));
  });
});

describe('PREMODERN_TYPOGRAPHY', () => {
  it('catches the two that shipped', () => {
    expect(PREMODERN_TYPOGRAPHY.test('Alſo auff der andern ſeiten')).toBe(true);
    expect(PREMODERN_TYPOGRAPHY.test('gegen mitter⸗nacht ſollen auch zwenzig bret ſtehen')).toBe(true);
  });

  it('leaves modern German alone, ß and hyphens included', () => {
    for (const de of [
      'Um Mitternacht gehen wir nach Hause.',
      'Die Straße ist groß und weiß.',
      'Das ist ein E-Mail-Postfach.',
      'Er war augenscheinlich müde.',
    ]) expect(PREMODERN_TYPOGRAPHY.test(de), de).toBe(false);
  });
});
