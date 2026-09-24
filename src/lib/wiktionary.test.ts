import { describe, it, expect } from 'vitest';
import { kindFromCategories, missingLooksLikeName } from './wiktionary.ts';

describe('batched category classification', () => {
  const c = (...xs: string[]) => xs.map((x) => `Kategorie:${x} (Deutsch)`);
  it('calls a surname a name even when it also carries an ungendered Substantiv tag', () => {
    expect(kindFromCategories(c('Nachname', 'Substantiv', 'Grundformeintrag'), false)).toBe('name');
  });
  it('keeps a real noun a lemma', () => {
    expect(kindFromCategories(c('Substantiv', 'Substantiv f', 'Grundformeintrag'), false)).toBe('lemma');
  });
  it('does not call a word that is also a surname a name', () => {
    // *Koch* — a cook, and a surname.
    expect(kindFromCategories(c('Nachname', 'Substantiv m'), false)).toBe('lemma');
  });
  it('recognises inflected forms, and missing pages', () => {
    expect(kindFromCategories(c('Deklinierte Form'), false)).toBe('form');
    expect(kindFromCategories([], true)).toBe('missing');
  });
});

describe('a word the dictionary has no page for', () => {
  const known = (s: string) => ['aufsicht', 'agenda', 'forum', 'winter', 'dialog'].includes(s);
  it('is a name when short, mid-sentence-shaped and made of nothing the corpus knows', () => {
    expect(missingLooksLikeName('Klopp', known)).toBe(true);
    expect(missingLooksLikeName('Kaepernick', known)).toBe(true);
  });
  // The eight false names of the first version, measured on live articles.
  it('is vocabulary when it contains a word the corpus knows', () => {
    for (const t of ['Fachaufsicht', 'Reformagenda', 'Dialogforum', 'Winterrefugium']) {
      expect(missingLooksLikeName(t, known)).toBe(false);
    }
  });
  it('is vocabulary when it carries a productive noun suffix, or is a hyphen fragment', () => {
    for (const t of ['Energydrinks', 'Zeitenwende', 'Heiz-', 'Bürgerbeteiligung']) expect(missingLooksLikeName(t)).toBe(false);
  });
});
