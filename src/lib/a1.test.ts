// The A1 report, pinned. Each of these is a specific complaint from a learner three
// weeks in, and each fix is small enough that it would be easy to undo by accident.
import { describe, it, expect } from 'vitest';
import { askablePlural, clozeExample, conjDrillable, drillExample, eligibleModes, matchInitialCase } from '../views/Fundamentals.tsx';
import { CAN_DO, coverageNote } from './candos.ts';
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

// B1. "Word order drills rebuild the card's own example sentence — once I've seen
// it, it's memory, not syntax." The flip face always shows ex[0], and an
// interleaved drill lands about three items later, so the sentence being
// reconstructed was the one just read.
describe('drill example selection', () => {
  const card = (ex: { de: string; en: string; lvl: string }[]): Word =>
    ({ ...w('voc:A1:x', 'der Tisch'), ex });

  it('prefers a sentence the flip face did not just show', () => {
    const c = card([
      { de: 'Der Tisch ist alt.', en: 'a', lvl: 'A1' },
      { de: 'Wir kaufen einen neuen Tisch.', en: 'b', lvl: 'A1' },
    ]);
    expect(clozeExample(c)?.de).toBe('Wir kaufen einen neuen Tisch.');
  });

  it('falls back to the first when it is the only usable one', () => {
    const c = card([{ de: 'Der Tisch ist alt.', en: 'a', lvl: 'A1' }]);
    expect(clozeExample(c)?.de).toBe('Der Tisch ist alt.');
  });

  it('skips a later example that does not satisfy the drill', () => {
    // ex[1] never says "Tisch", so a cloze cannot be built from it.
    const c = card([
      { de: 'Der Tisch ist alt.', en: 'a', lvl: 'A1' },
      { de: 'Das ist sehr schön.', en: 'b', lvl: 'A1' },
    ]);
    expect(clozeExample(c)?.de).toBe('Der Tisch ist alt.');
  });

  it('returns null when nothing qualifies, so eligibility and rendering agree', () => {
    const c = card([{ de: 'Das ist sehr schön.', en: 'b', lvl: 'A1' }]);
    expect(clozeExample(c)).toBeNull();
    expect(drillExample(c, () => false)).toBeNull();
  });

  it('is the same choice eligibility makes', () => {
    // If these could differ, a word could be declared drillable and render nothing.
    const c = card([
      { de: 'Der Tisch ist alt.', en: 'a', lvl: 'A1' },
      { de: 'Wir kaufen einen neuen Tisch.', en: 'b', lvl: 'A1' },
    ]);
    expect(eligibleModes(c).includes('cloze')).toBe(clozeExample(c) !== null);
  });
});

// A cloze whose blank is sentence-initial capitalises its answer, while the
// distractors are citation forms — so «_____ Mut.» offered dann / hier / auch /
// **Nur** and the only capital letter on screen was the answer. Found by playing
// the app on an iPhone; 261 of 5,684 cloze-eligible cards were affected, 70 of
// them at A1.
describe('cloze options do not leak the answer through capitalisation', () => {
  it('raises the distractors when the sentence raised the answer', () => {
    expect(matchInitialCase('Nur', 'nur', 'dann')).toBe('Dann');
    expect(matchInitialCase('Wo', 'wo', 'hier')).toBe('Hier');
  });

  it('leaves them alone mid-sentence, where nothing was raised', () => {
    expect(matchInitialCase('nur', 'nur', 'dann')).toBe('dann');
  });

  it('leaves nouns alone — their citation form is already capitalised', () => {
    // `der Mut` → citation "Mut", surface "Mut": nothing moved, so nothing to match.
    expect(matchInitialCase('Mut', 'Mut', 'Wut')).toBe('Wut');
    expect(matchInitialCase('Hund', 'Hund', 'Katze')).toBe('Katze');
  });

  it('survives the degenerate inputs rather than throwing mid-drill', () => {
    expect(matchInitialCase('', 'nur', 'dann')).toBe('dann');
    expect(matchInitialCase('Nur', 'nur', '')).toBe('');
  });
});

// `plural` is a display field holding five shapes, and the drill's gate used to be
// "is it truthy". So «choose the plural» was asked of `das Obst` with the answer
// "nur Singular", against three real `die …` phrases — pickable on shape alone.
// 399 of 3,200 noun cards. Only a full form is a question.
describe('only a real plural is askable', () => {
  const noun = (term: string, plural: string | null): Word =>
    ({ ...w('voc:A1:x', term), plural });

  it('accepts a full "die …" form', () => {
    expect(askablePlural(noun('der Hund', 'die Hunde'))).toBe('die Hunde');
    expect(askablePlural(noun('das Kind', 'die Kinder'))).toBe('die Kinder');
  });

  it('refuses a marker, which states there is no plural to ask for', () => {
    expect(askablePlural(noun('das Obst', 'nur Singular'))).toBeNull();
    expect(askablePlural(noun('die Eltern', 'nur Plural'))).toBeNull();
    expect(askablePlural(noun('Ostern', '—'))).toBeNull();
    expect(askablePlural(noun('das Umland', 'die –'))).toBeNull();
  });

  it('refuses shorthand — "-s" is not what the learner has to produce', () => {
    expect(askablePlural(noun('das Handy', '-s'))).toBeNull();
    expect(askablePlural(noun('die Speisekarte', '-n'))).toBeNull();
    expect(askablePlural(noun('der Baum', '¨-e'))).toBeNull();
  });

  it('refuses a bare stem missing its article', () => {
    expect(askablePlural(noun('das Thema', 'Themen'))).toBeNull();
  });

  it('refuses absent and empty, without throwing', () => {
    expect(askablePlural(noun('der Mut', null))).toBeNull();
    expect(askablePlural(noun('der Mut', '   '))).toBeNull();
  });

  it('is the gate eligibility uses, so the pool and the item cannot disagree', () => {
    expect(eligibleModes(noun('der Hund', 'die Hunde'))).toContain('plural');
    expect(eligibleModes(noun('das Obst', 'nur Singular'))).not.toContain('plural');
    expect(eligibleModes(noun('das Handy', '-s'))).not.toContain('plural');
  });
});

// The conjugation drill printed invented German as the correct answer, because
// `canConjugate` asks whether the engine *can* inflect a string, not whether the
// string is a lemma it is entitled to inflect. A term is not always a lemma —
// the same root cause matcher.ts fixed for pattern cards on 2026-08-20.
describe('the conjugation drill only takes a lemma it can print verbatim', () => {
  it('takes an ordinary infinitive', () => {
    expect(conjDrillable('machen')).toBe(true);
    expect(conjDrillable('gehen')).toBe(true);
  });

  it('refuses a phrase — this is the class that printed «gelten als + t»', () => {
    expect(conjDrillable('gelten als + N')).toBe(false);
    expect(conjDrillable('sich etwas vorstellen')).toBe(false);   // «geetwas vorstellt»
    expect(conjDrillable('sich wenden an')).toBe(false);          // «gewenden at»
  });

  it('refuses a reflexive, whose pronoun is obligatory and would be dropped', () => {
    // `conjugate` strips `sich`, so this returned the bare «fühle» at ich —
    // real German, but not what the learner has to produce. ReflexiveItem owns these.
    expect(conjDrillable('sich fühlen')).toBe(false);
    expect(conjDrillable('sich erinnern')).toBe(false);
  });

  it('is the gate eligibility uses, so the pool and the item cannot disagree', () => {
    const verb = (term: string): Word => ({ ...w('voc:A1:v', term), pos: 'verb', gender: null });
    expect(eligibleModes(verb('machen'))).toContain('conj');
    expect(eligibleModes(verb('sich fühlen'))).not.toContain('conj');
    expect(eligibleModes(verb('gelten als + N'))).not.toContain('conj');
  });
});

// "Progress shows what I know, never what I can do." The descriptors say what a
// level *is*; the copy must never claim the learner has got there on a word count.
describe('can-do descriptors', () => {
  it('covers every level', () => {
    for (const lv of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const) {
      expect(CAN_DO[lv].length, lv).toBeGreaterThanOrEqual(3);
    }
  });

  it('never claims the learner can do them', () => {
    // The whole point: coverage measures words met, not competence.
    for (const pct of [0, 10, 30, 70, 95, 100]) {
      const note = coverageNote(pct);
      expect(note.toLowerCase(), `${pct}%`).not.toMatch(/you can|you're able|you are able/);
      expect(note.toLowerCase(), `${pct}%`).toContain('vocabulary');
    }
  });

  it('says something for every coverage value', () => {
    for (let p = 0; p <= 100; p += 5) expect(coverageNote(p).length).toBeGreaterThan(10);
  });
});
