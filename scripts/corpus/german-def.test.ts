// `isGermanDefinition` — the guard that keeps German out of the English `def`
// field, and the English words that look German to it.
//
// The rule has been written three times (see lib.ts) and this is the first time it
// has had tests. It earned them by failing on a definition authored 2026-08-16:
// **"To die in an accident or a disaster."** was reported as German and failed the
// build. `die` is an ordinary English verb *and* a German article, and the rule's
// two-signal test — a German marker, plus an article or an umlaut — was satisfied
// twice over by that one word.
//
// The fix is narrow on purpose. `die` counts as an article only where it behaves
// like one, immediately before a capitalised noun. Loosening further would start
// letting real German through, and that is the regression the guard exists for:
// 367 cards once shipped a German definition inside `def`.
import { describe, it, expect } from 'vitest';
import { isGermanDefinition } from './lib.ts';

describe('isGermanDefinition', () => {
  it('does not mistake the English verb "die" for the German article', () => {
    expect(isGermanDefinition('To die in an accident or a disaster.', 'to perish')).toBe(false);
    expect(isGermanDefinition('A person who is about to die.', 'dying')).toBe(false);
    expect(isGermanDefinition('Cells that die and are replaced.', 'apoptosis')).toBe(false);
  });

  it('still catches a genuinely German definition', () => {
    // Real `defDe` values from the corpus. Each must stay detectable, because the
    // whole point of the rule is that these belong in `defDe` and not in `def`.
    for (const de of [
      'an einen Zugang montierte Schließvorrichtung',
      'die Handlung des Verlierens',
      'Muttertier des Hausrinds',
      'eine Gruppe, die sich nach der Anzahl der Mitglieder unterscheidet',
      'jemand, der Texte von der einen in die andere Sprache überträgt',
      'Raum in einem Haus oder einer Wohnung, der zum Schlafen gedacht ist',
    ]) {
      expect(isGermanDefinition(de, 'x'), de).toBe(true);
    }
  });

  it('still reads "die" as an article before a capitalised noun', () => {
    // German capitalises every noun, so this is the shape the narrowed rule keeps.
    expect(isGermanDefinition('die Handlung, etwas zu zerstören', 'destruction')).toBe(true);
  });

  it('leaves an ordinary English definition alone', () => {
    for (const en of [
      'A grand country house or palace; also the mechanism that fastens a door.',
      'The calendar day on which something falls; in the plural, collected facts and figures.',
      'One of the two soft edges of the mouth.',
      'Of the male sex — the box you tick on a form, and the grammatical gender that takes a masculine article.',
    ]) {
      expect(isGermanDefinition(en, 'x'), en).toBe(false);
    }
  });

  it('exempts an English annotation that quotes German behind a label', () => {
    expect(isGermanDefinition('female: die Kellnerin', 'waitress')).toBe(false);
    expect(isGermanDefinition('separable: der Zug fährt ab', 'to depart')).toBe(false);
  });

  it('exempts German quoted inside parentheses', () => {
    expect(isGermanDefinition('The sea (feminine, die See) as opposed to the lake.', 'sea')).toBe(false);
  });

  it('does not flag a card whose gloss is itself German', () => {
    expect(isGermanDefinition('etwas, das man nicht kennt', 'das Unbekannte')).toBe(false);
  });
});
