// The detector behind `corpus:forms` and the collision check in `corpus:validate`.
//
// LESSONS: *before you finish a pass that drives something to zero, write the check
// that keeps it there — then prove the check fires.* These tests are that proof.
// Injecting the defect and watching the detector see it is the part that cannot be
// skipped: a check that cannot fail is worse than no check, because it is trusted.
import { describe, it, expect } from 'vitest';
import { findFormCollisions, pairKey, FORM_RULINGS } from './form-rulings.ts';
import type { Word } from '../../src/types.ts';

const card = (over: Partial<Word> & { id: string; term: string }): Word => ({
  en: '', pos: 'noun', level: 'A1', gender: null, plural: null, ipa: null, def: null,
  syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...over,
});

describe('findFormCollisions', () => {
  it('sees a plural filed as its own card', () => {
    const hits = findFormCollisions([
      card({ id: 'voc:A1:der Schuh', term: 'der Schuh', gender: 'der', plural: 'die Schuhe' }),
      card({ id: 'voc:B1:die Schuhe', term: 'die Schuhe', gender: 'die', plural: 'die Schuhe', level: 'B1' }),
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0].shape).toBe('plural');
    expect(hits[0].form.id).toBe('voc:B1:die Schuhe');
    expect(hits[0].lemma.id).toBe('voc:A1:der Schuh');
  });

  it('sees an invariant plural, where the two headwords are one string', () => {
    // `der Stiefel` pluralises to `die Stiefel`, so the plural branch cannot find
    // it — the form equals the singular. The article branch is what catches it.
    const hits = findFormCollisions([
      card({ id: 'voc:A2:der Stiefel', term: 'der Stiefel', gender: 'der', plural: 'die Stiefel', level: 'A2' }),
      card({ id: 'voc:A2:die Stiefel', term: 'die Stiefel', gender: 'die', plural: 'die Stiefel', level: 'A2' }),
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0].shape).toBe('article');
  });

  it('expands the corpus plural notations rather than matching them literally', () => {
    // `die Emission` writes its plural "-en", not "die Emissionen". A detector that
    // compared the field verbatim would report nothing here.
    const hits = findFormCollisions([
      card({ id: 'voc:B2:die Emission', term: 'die Emission', gender: 'die', plural: '-en', level: 'B2' }),
      card({ id: 'voc:B2:die Emissionen', term: 'die Emissionen', gender: 'die', level: 'B2' }),
    ]);
    expect(hits).toHaveLength(1);
  });

  it('does not report a verb that happens to look like a noun plural', () => {
    // *fragen* is not the plural of *die Frage*. Counting these is what made the
    // first measurement of this defect nearly three times too high.
    const hits = findFormCollisions([
      card({ id: 'voc:A1:die Frage', term: 'die Frage', gender: 'die', plural: 'die Fragen' }),
      card({ id: 'voc:A1:fragen', term: 'fragen', pos: 'verb' }),
    ]);
    expect(hits).toEqual([]);
  });

  it('does not report a noun whose plural is its own singular', () => {
    const hits = findFormCollisions([
      card({ id: 'voc:A2:der Stiefel', term: 'der Stiefel', gender: 'der', plural: 'die Stiefel', level: 'A2' }),
    ]);
    expect(hits).toEqual([]);
  });

  it('reports a pair once, however it was discovered', () => {
    // The article branch walks every noun, so it meets each pair from both ends.
    const hits = findFormCollisions([
      card({ id: 'voc:A1:der Joghurt', term: 'der Joghurt', gender: 'der', plural: 'die Joghurts' }),
      card({ id: 'voc:A2:das Joghurt', term: 'das Joghurt', gender: 'das', plural: 'die Joghurts', level: 'A2' }),
    ]);
    expect(hits).toHaveLength(1);
  });
});

describe('FORM_RULINGS', () => {
  it('rules each pair once', () => {
    const keys = FORM_RULINGS.map((r) => pairKey(r.form, r.lemma));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every ruling a reason', () => {
    for (const r of FORM_RULINGS) expect(r.why.length).toBeGreaterThan(40);
  });

  it('declares a level on every merge and none on a keep', () => {
    for (const r of FORM_RULINGS) {
      if (r.rule === 'merge') expect(r.level, r.form).toBeTruthy();
      else expect(r.level, r.form).toBeUndefined();
    }
  });

  it('never retires a card into itself', () => {
    for (const r of FORM_RULINGS) expect(r.form).not.toBe(r.lemma);
  });
});
