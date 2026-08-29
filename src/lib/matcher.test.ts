import { describe, it, expect } from 'vitest';
import { buildMatcher, isCardinal, isNeutralWord, pluralForm } from './matcher.ts';
import type { Word } from '../types.ts';

const w = (over: Partial<Word>): Word => ({
  id: 'x', term: '', en: '', pos: 'noun', level: 'A1', gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...over,
});

const corpus: Word[] = [
  w({ id: 'v:tisch', term: 'der Tisch', pos: 'noun', gender: 'der', plural: 'die Tische' }),
  w({ id: 'v:gehen', term: 'gehen', pos: 'verb' }),
  w({ id: 'v:schnell', term: 'schnell', pos: 'adjective' }),
];
const m = buildMatcher(corpus);
const matched = (surface: string) => m.annotate(surface)[0]?.word?.term ?? null;

describe('buildMatcher — annotate', () => {
  it('matches an article-stripped headword', () => {
    expect(matched('Tisch')).toBe('der Tisch');
  });
  it('matches a plural to its lemma', () => {
    expect(matched('Tische')).toBe('der Tisch');
  });
  it('matches a dative-plural -n to the noun', () => {
    expect(matched('Tischen')).toBe('der Tisch');
  });
  it('matches a conjugated verb form to the infinitive', () => {
    expect(matched('ging')).toBe('gehen');   // Präteritum of gehen
    expect(matched('gegangen')).toBe('gehen'); // Partizip II
  });
  it('matches an inflected adjective by de-inflection', () => {
    expect(matched('schnelle')).toBe('schnell');
  });
  it('returns null for an unknown surface form', () => {
    expect(matched('xyzzy')).toBe(null);
  });
});

// The three defect classes the 2026-08-05 quality pass found, each of which made
// the matcher disagree with the corpus's own example sentences — and, since the
// comprehension meter is built on this, would have made its headline number wrong.
describe('buildMatcher — verbs in real sentences', () => {
  const c: Word[] = [
    w({ id: 'v:anrufen', term: 'anrufen', pos: 'verb' }),
    w({ id: 'v:rufen', term: 'rufen', pos: 'verb' }),
    w({ id: 'v:ruf', term: 'der Ruf', pos: 'noun', gender: 'der', plural: 'die Rufe' }),
    w({ id: 'v:geben', term: 'geben', pos: 'verb' }),
    w({ id: 'v:wissen', term: 'wissen', pos: 'verb' }),
    w({ id: 'v:weiss', term: 'weiß', pos: 'adjective' }),
    w({ id: 'v:sichern', term: 'sichern', pos: 'verb' }),
    w({ id: 'v:sicher', term: 'sicher', pos: 'adjective' }),
  ];
  const mm = buildMatcher(c);
  /** The card a given token resolves to, in the context of a whole sentence. */
  const inSentence = (sentence: string, token: string) =>
    mm.annotate(sentence).find((s) => s.isWord && s.text.toLowerCase() === token.toLowerCase())?.word?.term ?? null;

  it('reassembles a separable verb when the particle lands later in the clause', () => {
    // `conjugate` emits "rufe an" — a two-token string single-token lookup could
    // never reach, so every separable verb used to miss outright.
    expect(inSentence('Ich rufe dich später an.', 'rufe')).toBe('anrufen');
  });

  it('does not claim the separable verb when the particle is absent', () => {
    // Without "an" this is the simplex verb, and must stay so.
    expect(inSentence('Ich rufe laut.', 'rufe')).toBe('rufen');
  });

  it('does not reach across a sentence boundary for the particle', () => {
    expect(inSentence('Ich rufe laut. Fang an!', 'rufe')).toBe('rufen');
  });

  it('resolves the zu-infinitive of a separable verb', () => {
    expect(inSentence('Ich habe versucht, dich anzurufen.', 'anzurufen')).toBe('anrufen');
  });

  it('resolves an imperative', () => {
    // Imperatives are not in the conjugator's output at all.
    expect(inSentence('Gib mir das Buch.', 'Gib')).toBe('geben');
  });

  it('prefers the verb over a noun plural for a lowercase token', () => {
    // `die Rufe` is indexed before any verb form, so first-wins gave the noun.
    // German capitalises nouns, which is the tie-breaker.
    expect(inSentence('Ich rufe dich an.', 'rufe')).toBe('anrufen');
    expect(inSentence('Die Rufe waren laut.', 'Rufe')).toBe('der Ruf');
  });

  it('reads a verb-second homograph as the verb, and only there', () => {
    // *weiß* is both the colour and `wissen`'s 1st/3rd singular.
    expect(inSentence('Ich weiß es nicht.', 'weiß')).toBe('wissen');
    expect(inSentence('Die weiße Wand.', 'weiße')).toBe('weiß');
  });

  it('does not treat a predicate adjective as a verb just because a pronoun precedes it', () => {
    // The regression that made the position check necessary: in "Hier ist es
    // sicher" the pronoun is third and the adjective fourth, so this is not the
    // verb-second pattern and `sicher` must stay the adjective, not `sichern`.
    expect(inSentence('Hier ist es sicher.', 'sicher')).toBe('sicher');
  });
});

describe('buildMatcher — heuristics', () => {
  it('isNeutralWord flags function words, not content words', () => {
    expect(m.isNeutralWord('und')).toBe(true);
    expect(m.isNeutralWord('der')).toBe(true);
    expect(m.isNeutralWord('Tisch')).toBe(false);
  });
  it('isLikelyEntity flags 2+ capitals (acronyms/compounds), not common nouns', () => {
    expect(m.isLikelyEntity('EU')).toBe(true);
    expect(m.isLikelyEntity('Sachsen-Anhalt')).toBe(true);
    expect(m.isLikelyEntity('Tisch')).toBe(false);
  });
});

// ---- the 2026-08-11 denominator pass ---------------------------------------
// Measured over the telc B1 paper: 7.8% of content tokens were being counted
// against the learner for reasons that had nothing to do with vocabulary. The
// meter's whole claim is an honest number, so each of these is pinned.

describe('the coverage denominator', () => {
  it('does not count indefinite pronouns and quantifiers as vocabulary', () => {
    for (const t of ['etwas', 'alles', 'nichts', 'jeder', 'jeden', 'jemand', 'andere',
      'einige', 'solche', 'mehr', 'viele', 'beide', 'welche', 'dieser']) {
      expect(isNeutralWord(t), t).toBe(true);
    }
  });

  it('does not count inflected possessives — the bug was that only some were listed', () => {
    // `ihre` was in the set from the start and `ihren`/`ihrem`/`ihrer` were not,
    // so one word counted as known in one case and unknown in three.
    for (const t of ['ihre', 'ihren', 'ihrem', 'ihrer', 'ihres',
      'seinen', 'seinem', 'unsere', 'unserer', 'meinen', 'euren']) {
      expect(isNeutralWord(t), t).toBe(true);
    }
  });

  it('does not count spelled-out cardinals, which are an infinite set', () => {
    for (const t of ['fünfzehn', 'achtzig', 'zwanzig', 'einundzwanzig', 'zweihundert', 'dreitausend']) {
      expect(isCardinal(t), t).toBe(true);
      expect(isNeutralWord(t), t).toBe(true);
    }
  });

  it('still counts real vocabulary that merely looks numeric or grammatical', () => {
    for (const t of ['einladen', 'undicht', 'Zeitung', 'Meinung', 'Sechser']) {
      expect(isCardinal(t), t).toBe(false);
    }
    // `ein` and `und` are parts of every compound number and words in their own
    // right; a bare one must never be read as a numeral.
    expect(isCardinal('ein')).toBe(false);
    expect(isCardinal('und')).toBe(false);
  });
});

describe('inflections that were silently missing', () => {
  const big: Word[] = [
    w({ id: 'v:lehrer', term: 'der Lehrer', pos: 'noun', gender: 'der', plural: 'die Lehrer' }),
    w({ id: 'v:kunde', term: 'der Kunde', pos: 'noun', gender: 'der', plural: 'die Kunden' }),
    w({ id: 'v:arzt', term: 'der Arzt', pos: 'noun', gender: 'der', plural: 'die Ärzte' }),
    w({ id: 'v:kurs', term: 'der Kurs', pos: 'noun', gender: 'der', plural: 'die Kurse' }),
    w({ id: 'v:haus', term: 'das Haus', pos: 'noun', gender: 'das', plural: 'die Häuser' }),
    w({ id: 'v:montag', term: 'der Montag', pos: 'noun', gender: 'der', plural: null }),
    w({ id: 'v:fest', term: 'das Fest', pos: 'noun', gender: 'das', plural: 'die Feste' }),
    w({ id: 'v:lesen', term: 'lesen', pos: 'verb' }),
  ];
  const mm = buildMatcher(big);
  const hit = (s: string) => mm.annotate(s)[0]?.word?.term ?? null;

  it('derives the feminine -in and -innen from the masculine card', () => {
    expect(hit('Lehrerin')).toBe('der Lehrer');
    expect(hit('Lehrerinnen')).toBe('der Lehrer');
    expect(hit('Kundin')).toBe('der Kunde');       // schwa dropped
    expect(hit('Ärztin')).toBe('der Arzt');        // and umlauted
  });

  it('resolves the genitive singular', () => {
    expect(hit('Kurses')).toBe('der Kurs');
    expect(hit('Hauses')).toBe('das Haus');
  });

  it('resolves the adverbial -s on time nouns', () => {
    expect(hit('montags')).toBe('der Montag');
  });

  it('resolves the dative -e that survives in fixed phrases', () => {
    expect(hit('Hause')).toBe('das Haus');         // "zu Hause"
  });

  it('does not hand an inflected adjective to a same-spelled noun', () => {
    // `festes` in "ein festes Programm" is the adjective `fest`, which this
    // corpus does not carry. Claiming `das Fest` for it would be a wrong lemma,
    // and a wrong lemma is worse than a miss because nothing surfaces it.
    expect(hit('festes')).toBe(null);
  });

  it('does not strip a verb form into a noun', () => {
    expect(hit('liest')).toBe('lesen');
  });

  it('lets a real feminine card beat the derived one', () => {
    // The derivation is generated last for this reason. Run inside the base-form
    // loop it stole `die Freundin` from itself whenever `der Freund` came first in
    // corpus order, and took `Freundinnen` off that card's own plural — which is
    // how it surfaced: corpus:validate's reader probe dropped 168/200 to 165/200.
    const both = buildMatcher([
      w({ id: 'v:freund', term: 'der Freund', pos: 'noun', gender: 'der', plural: 'die Freunde' }),
      w({ id: 'v:freundin', term: 'die Freundin', pos: 'noun', gender: 'die', plural: 'die Freundinnen' }),
    ]);
    const h = (s: string) => both.annotate(s)[0]?.word?.term ?? null;
    expect(h('Freundin')).toBe('die Freundin');
    expect(h('Freundinnen')).toBe('die Freundin');
    expect(h('Freund')).toBe('der Freund');
  });
});

// The corpus writes plurals **six** ways and `buildMatcher` used to index only one
// of them, adding the rest to the index verbatim: a card reading `¨-e` contributed
// the literal key "¨-e" while `Vorschläge` — the form a reader actually meets — was
// never indexed. 390 cards were affected. Measured over the six exam papers,
// `Vorschläge`, `Höfe`, `Läden`, `Einwände` and `Patienten` all failed to resolve
// against cards the corpus already teaches, which is the worst direction for a
// coverage meter to be wrong in.
//
// One case per notation, because the repeated failure here is an *incomplete
// enumeration* — the same shape as the gender audit learning three notations one at
// a time, and as the entrance guard listing two of three animations.
describe('plural notations — every one the corpus actually uses', () => {
  const cases: [string, string | null, string | null][] = [
    ['das Wort', 'die Wörter', 'Wörter'],          // full form
    ['der Patient', '-en', 'Patienten'],           // append
    ['der Grenzwert', '-e', 'Grenzwerte'],
    ['das Handy', '-s', 'Handys'],
    ['der Vorschlag', '¨-e', 'Vorschläge'],        // umlaut, then append
    ['der Rock', '¨-e', 'Röcke'],
    ['das Buch', '¨-er', 'Bücher'],
    ['der Mantel', '¨-', 'Mäntel'],                // umlaut, nothing appended
    ['der Einwand', '-wände', 'Einwände'],         // splice on the overlap
    ['der Werdegang', '-gänge', 'Werdegänge'],
    ['der Pullover', '-', 'Pullover'],             // unchanged plural
    ['das Gemüse', 'nur Singular', null],          // assertions: no form at all
    ['die Möbel', 'nur Plural', null],
    ['der Regen', '—', null],
    ['der Laden', null, null],
  ];
  for (const [term, plural, want] of cases) {
    it(`${term} [${plural ?? 'none'}] -> ${want ?? 'no plural'}`, () => {
      expect(pluralForm(term, plural)).toBe(want);
    });
  }

  // The capital matters: umlautStem matched [aou] only, so a noun whose sole back
  // vowel is its capitalised initial came back unchanged — *Angst* produced the
  // plural *Angste*. German capitalises every noun, so this was not an edge case.
  it('umlauts a capitalised initial vowel', () => {
    expect(pluralForm('die Angst', '¨-e')).toBe('Ängste');
    expect(pluralForm('der Arzt', '¨-e')).toBe('Ärzte');
  });

  it('an assertion never becomes an index key', () => {
    const mm = buildMatcher([
      w({ id: 'v:gemuese', term: 'das Gemüse', pos: 'noun', gender: 'das', plural: 'nur Singular' }),
      w({ id: 'v:vorschlag', term: 'der Vorschlag', pos: 'noun', gender: 'der', plural: '¨-e' }),
    ]);
    expect(mm.annotate('nur')[0]?.word ?? null).toBeNull();
    expect(mm.annotate('Vorschläge')[0]?.word?.term).toBe('der Vorschlag');
  });
});

describe('a capitalised noun form does not lose to a lowercase verb', () => {
  // The collision is real in both directions and only one of them had a rule.
  // `lügen` is a verb lemma; `Lügen` is only ever `die Lüge`'s plural. Whichever
  // card reaches the index first owns the key, so `pluralOnly` (rule 4) helps only
  // when the noun won that race — and where the verb won it there was no way back.
  // `corpus:matcher-gaps` measured 200 of 214 unresolved forms in that state.
  const both = buildMatcher([
    w({ id: 'v:luegen', term: 'lügen', pos: 'verb' }),
    w({ id: 'v:luege', term: 'die Lüge', pos: 'noun', gender: 'die', plural: 'die Lügen' }),
    w({ id: 'v:zahlen', term: 'zahlen', pos: 'verb' }),
    w({ id: 'v:zahl', term: 'die Zahl', pos: 'noun', gender: 'die', plural: 'die Zahlen' }),
    w({ id: 'v:haus', term: 'das Haus', pos: 'noun', gender: 'das', plural: 'die Häuser' }),
    w({ id: 'v:kommen', term: 'kommen', pos: 'verb' }),
    w({ id: 'v:sein', term: 'sein', pos: 'verb' }),
  ]);
  const at = (text: string, tok: string) =>
    both.annotate(text).find((s) => s.text === tok)?.word?.term ?? null;

  it('reads a capitalised plural mid-sentence as the noun', () => {
    expect(at('Mit Lügen kommt man nicht weit.', 'Lügen')).toBe('die Lüge');
    expect(at('Ihre Zahlen sind falsch.', 'Zahlen')).toBe('die Zahl');
  });

  it('reads a capitalised dative plural as the noun', () => {
    // The class that was worst: 112 of the 214, every one of this shape.
    expect(at('In diesen Häusern wohnt niemand.', 'Häusern')).toBe('das Haus');
  });

  it('reads a citation form as the noun, and its lowercase twin as the verb', () => {
    // Quoted alone there is no sentence to be initial in, and German writes the
    // noun with its capital and the verb without one. That is the whole signal.
    expect(both.annotate('Lügen')[0]?.word?.term).toBe('die Lüge');
    expect(both.annotate('lügen')[0]?.word?.term).toBe('lügen');
  });

  it('still lets the verb win sentence-initially, where the capital means nothing', () => {
    // «Zahlen Sie bitte» is an imperative. A sentence-initial word is capitalised
    // whatever its class, so the rule must not fire there — this is the guard, and
    // without it the fix would trade 200 quiet errors for a noisier set.
    expect(at('Zahlen Sie bitte an der Kasse.', 'Zahlen')).toBe('zahlen');
  });

  it('still lets a lowercase form win, which is rule 4 and must not regress', () => {
    expect(at('Sie lügen doch alle.', 'lügen')).toBe('lügen');
  });
});
