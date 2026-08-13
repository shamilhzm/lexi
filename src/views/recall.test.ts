// The recall drill's gate, pinned.
//
// This is the one drill that asks for production, and the one whose failure mode
// is the thing this codebase never does: telling a learner that correct German is
// wrong. `recallSafe` is the whole defence, so every exclusion it makes has a test
// here — a future pass that loosens the gate to grow the pool should have to
// delete one of these deliberately.
import { describe, it, expect } from 'vitest';
import { registerWords, WORDS } from '../data/index.ts';
import { recallSafe, recallHints, articleMiss, eligibleModes, MODE_TAG, MODE_REMEDY } from './Fundamentals.tsx';
import type { Word } from '../types.ts';

const w = (id: string, term: string, en: string, extra: Partial<Word> = {}): Word => ({
  id, term, en, pos: 'noun', level: 'A1', gender: 'der', plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...extra,
});

registerWords([
  // Clean: one German card, one unambiguous English gloss.
  w('voc:A1:die Sprache', 'die Sprache', 'language', { gender: 'die' }),
  w('voc:A1:laufen', 'laufen', 'to run', { pos: 'verb', gender: null }),
  // Ambiguous: two cards answer "table". Neither may be drilled.
  w('voc:A1:der Tisch', 'der Tisch', 'table'),
  w('voc:B1:die Tabelle', 'die Tabelle', 'table', { gender: 'die', level: 'B1' }),
  // A gloss that is a list — the learner cannot know which word is wanted.
  w('voc:A1:der Bahnhof', 'der Bahnhof', 'station, depot, terminus'),
  w('voc:A1:die Art', 'die Art', 'kind or sort', { gender: 'die' }),
  // Transparent — tests confidence, not German.
  w('voc:A1:das Hotel', 'das Hotel', 'hotel', { gender: 'das' }),
  // A grammar card is never a vocabulary prompt.
  { ...w('gram:A1:Artikel', 'Artikel & Genus', 'the rule'), kind: 'grammar' },
]);

const byTerm = (t: string) => WORDS.find((x) => x.term === t)!;

describe('recallSafe — what may be asked in the productive direction', () => {
  it('admits a card whose gloss points back at exactly one German word', () => {
    expect(recallSafe(byTerm('die Sprache'))).toBe(true);
    expect(recallSafe(byTerm('laufen'))).toBe(true);
  });

  it('refuses a gloss two cards answer — der Tisch and die Tabelle are both "table"', () => {
    // The failure this prevents: prompting "table", the learner types "die
    // Tabelle", and the app calls correct German wrong.
    expect(recallSafe(byTerm('der Tisch'))).toBe(false);
    expect(recallSafe(byTerm('die Tabelle'))).toBe(false);
  });

  it('refuses a gloss that is a list, however it is punctuated', () => {
    expect(recallSafe(byTerm('der Bahnhof'))).toBe(false);  // commas
    expect(recallSafe(byTerm('die Art'))).toBe(false);      // the word "or"
  });

  it('refuses a transparent gloss — "hotel" tests nothing', () => {
    expect(recallSafe(byTerm('das Hotel'))).toBe(false);
  });

  it('refuses grammar cards and anything with no gloss', () => {
    expect(recallSafe(byTerm('Artikel & Genus'))).toBe(false);
    expect(recallSafe({ ...byTerm('die Sprache'), en: '' })).toBe(false);
  });
});

describe('recall is gated on the learner, not only on the card', () => {
  it('is not offered for a word the learner has not yet consolidated', () => {
    // No FSRS card exists for these ids in this test store, so statusOf is 'new'.
    // Production before recognition is a retrieval attempt on an unencoded item.
    expect(eligibleModes(byTerm('die Sprache'))).not.toContain('recall');
  });
});

describe('recallHints — the ladder names the gender first', () => {
  it('leads with the gender for a noun, without giving away the article', () => {
    const [first] = recallHints(byTerm('die Sprache'));
    expect(first).toContain('feminine');
    expect(first).not.toContain('die');
    // "Sprache" — the bare noun, not "die Sprache".
    expect(first).toContain('7 letters');
  });

  it('falls back to the part of speech when there is no gender', () => {
    expect(recallHints(byTerm('laufen'))[0]).toContain('verb');
  });

  it('never leaks the article in the later rungs either', () => {
    const [, second, third] = recallHints(byTerm('die Sprache'));
    expect(second).toBe('starts with “S”');
    expect(third).toBe('“Spra…”');
  });
});

describe('articleMiss — naming a gender error instead of just saying no', () => {
  const sprache = () => byTerm('die Sprache');

  it('names the bare noun as an article omission, not a vocabulary failure', () => {
    expect(articleMiss('Sprache', sprache())).toContain('The word is right');
    expect(articleMiss('Sprache', sprache())).toContain('die Sprache');
  });

  it('names the wrong article as a gender error and shows the right one', () => {
    const note = articleMiss('der Sprache', sprache())!;
    expect(note).toContain('wrong gender');
    expect(note).toContain('die Sprache');
  });

  it('stays silent for a genuinely wrong word, so nothing is excused', () => {
    expect(articleMiss('die Katze', sprache())).toBeNull();
    expect(articleMiss('', sprache())).toBeNull();
  });

  it('stays silent for a word with no gender at all', () => {
    expect(articleMiss('laufen', byTerm('laufen'))).toBeNull();
  });

  it('is umlaut- and case-tolerant, like every other typed grade', () => {
    // The learner who types the noun without its article should get the same
    // lesson whether or not their keyboard has umlauts.
    const hotel = { ...byTerm('das Hotel'), term: 'die Fakultät', gender: 'die' as const };
    expect(articleMiss('fakultaet', hotel)).toContain('needs the article');
  });
});

describe('mode registration', () => {
  it('is named and carries no remedy point, because production has no single rule', () => {
    expect(MODE_TAG.recall).toBe('Recall (English → German)');
    // Every other mode either teaches a grammatical system or explicitly has none.
    // Recall's one system is gender, which RecallItem opens per-card.
    expect(MODE_REMEDY.recall).toEqual([]);
  });
});
