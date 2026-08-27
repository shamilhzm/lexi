// The headword, reshaped into a dictionary key.
//
// `term` is written for a flashcard: it carries the article, and where two cards
// share a lemma it carries a sense disambiguator — `die Decke (Bett)` against the
// ceiling. Sent to de.wiktionary that is a 404, and **a 404 reports as "the source
// is missing this word", not as "you asked the wrong question"** (LESSONS class 9).
// Four plural gaps and two IPA gaps were filed as absences in wiktionary when the
// entries were fine and the key was wrong.
//
// Pinned because the failure mode is silence. Nothing throws, nothing turns red;
// a column just stays empty and looks like honest missing data.
import { describe, it, expect } from 'vitest';
import { lookupLemma } from './lib.ts';

describe('lookupLemma', () => {
  it.each([
    ['die Decke (Bett)', 'Decke'],       // the bug: fetched as "Decke (Bett)"
    ['die Heimat (Region)', 'Heimat'],
    ['verlieben (sich)', 'verlieben'],   // trailing reflexive marker
    ['sich verlieben', 'verlieben'],     // and the leading spelling
    ['das Haus', 'Haus'],
    ['der Eiserne Vorhang', 'Eiserne Vorhang'], // a phrase stays a phrase
  ])('%s → %s', (term, want) => expect(lookupLemma(term)).toBe(want));

  it('leaves an ordinary headword untouched', () => {
    for (const t of ['Haus', 'gehen', 'schnell']) expect(lookupLemma(t)).toBe(t);
  });

  // A parenthesis *inside* the headword is part of the word, not a disambiguator,
  // and only a trailing one is stripped — so nothing mid-string is eaten.
  it('only strips a trailing parenthetical', () => {
    expect(lookupLemma('die A(2)B Sache')).toBe('A(2)B Sache');
  });

  // Government notation is not a sense marker and must survive, so the callers'
  // `+` filter still sees it and skips the card rather than fetching nonsense.
  it('keeps government notation visible to the caller', () => {
    expect(lookupLemma('verzichten auf + A')).toContain('+');
  });
});
