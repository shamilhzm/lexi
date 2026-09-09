// The matcher, without a microphone.
//
// Every case here is a *transcript* — the string a recogniser hands back — paired
// with the verdict a player would accept. The interesting ones are not the hits; they
// are the two failure directions, and they pull against each other:
//
//   too strict   a learner with an accent is told their own word is wrong
//   too loose    saying a different word entirely counts, and the game is a toy
//
// The file leans strict on the second and generous on the first, deliberately and in
// that order. See the header of `asr-match.ts`.
import { describe, it, expect } from 'vitest';
import {
  verdict, koelner, normalise, spokenForm, lemmaOf, similarity, alignment, FUZZY_FLOOR,
} from './asr-match.ts';

describe('what the learner is asked to say', () => {
  it('keeps the article, because that is what knowing a German noun means', () => {
    expect(spokenForm('der Tisch')).toBe('der Tisch');
    expect(spokenForm('das Zuhause')).toBe('das Zuhause');
  });

  it('drops the reflexive and the government, which nobody says aloud', () => {
    expect(spokenForm('sich erinnern an + A')).toBe('erinnern');
    expect(spokenForm('teilnehmen an + D')).toBe('teilnehmen');
  });

  it('offers the bare lemma separately, for counting rather than saying', () => {
    // `isPlayable` measures syllables and word count, and an article is neither.
    expect(lemmaOf('der Tisch')).toBe('Tisch');
    expect(lemmaOf('die Katze')).toBe('Katze');
  });

  it('takes one sense from a multi-sense headword', () => {
    // A card whose term carries a parenthetical or a second form is still one word
    // to say. Anything else would ask the learner to read a gloss aloud.
    expect(spokenForm('laufen (rennen)')).toBe('laufen');
  });
});

describe('normalisation folds what orthography, not speech, decides', () => {
  it('treats ß and ss as the same sound', () => {
    expect(normalise('Straße')).toBe(normalise('Strasse'));
  });
  it('folds umlauts, because a recogniser picks its own spelling', () => {
    expect(normalise('Bäcker')).toBe('backer');
  });
});

describe('the recogniser caught it', () => {
  it('exactly', () => {
    expect(verdict('das Haus', 'das Haus').caught).toBe('exact');
  });

  it('with different casing and punctuation, which are not sounds', () => {
    expect(verdict('die Straße', 'die strasse.').caught).toBe('exact');
  });

  it('when the article was said and the noun came through slightly off', () => {
    // The article earns its keep here: `die Katze` is a longer, more distinctive
    // target than `Katze`, so one mangled syllable of two still lands.
    expect(verdict('die Katze', 'die Katzen').caught).not.toBeNull();
  });

  // The case the whole `candidates` loop exists for.
  it('when it split a compound into two words', () => {
    expect(verdict('das Eichhörnchen', 'Eich Hörnchen').caught).not.toBeNull();
  });

  it('when the word is buried in a sentence the engine invented', () => {
    // Engines pad single words into plausible phrases. The word is still there.
    expect(verdict('die Sprache', 'die Sprache ist schön').caught).not.toBeNull();
  });

  it('as its second guess', () => {
    const v = verdict('die Prämisse', 'die Prämie', ['die Prämie', 'die Prämisse']);
    expect(v.caught).toBe('alternative');
  });

  it('on phonetics, when the spelling drifted but the sound did not', () => {
    // A recogniser writing what it heard rather than the dictionary form.
    expect(verdict('die Quellenkritik', 'die Kwellenkritik').caught).not.toBeNull();
  });
});

describe('the recogniser did not catch it', () => {
  it('when it heard a different word', () => {
    expect(verdict('die Argumentation', 'Automat').caught).toBeNull();
  });

  it('when it heard nothing', () => {
    expect(verdict('die Sprache', '').caught).toBeNull();
  });

  // The over-acceptance this file is most at risk of, named in the header of the
  // module: `Haus` and `aus` share a Kölner code because `h` is silent to the
  // algorithm. On a four-letter word that collision is common enough to be a bug.
  it('and a phonetic code alone is not enough on a short word', () => {
    expect(koelner('Haus')).toBe(koelner('aus'));  // the collision is real
    expect(verdict('Haus', 'aus').caught).toBeNull(); // and it is not a hit
  });

  it('while the same rule still helps on a long one', () => {
    // Long words do not collide by accident, so the code is doing real work there.
    // The article is in the heard string too: phonetics compares whole utterances,
    // so omitting it is a real difference rather than a spelling one.
    expect(verdict('die Verschlimmbesserung', 'die Ferschlimmbesserung').caught).toBe('phonetic');
  });
});

describe('what the game prints over the word', () => {
  it('is the closest thing the recogniser said, not the whole sentence', () => {
    // It has to be the token that competed, not everything the engine emitted.
    expect(verdict('Januar', 'ich sage Juni bitte').heard).toBe('Juni');
  });

  it('survives a transcript with nothing usable in it', () => {
    const v = verdict('die Sprache', '   ');
    expect(v.caught).toBeNull();
    expect(v.similarity).toBe(0);
  });
});

describe('the thresholds are stated, not hidden', () => {
  it('keeps the fuzzy floor where the probe left it', () => {
    // If this changes, `docs/SPEAKING.md` gate 1–3 has been answered and the change
    // should cite the transcripts that justify it.
    expect(FUZZY_FLOOR).toBe(0.8);
  });

  it('scores similarity the way the floor assumes', () => {
    expect(similarity('sprache', 'sprache')).toBe(1);
    expect(similarity('sprache', 'sprachen')).toBeGreaterThan(0.8);
    expect(similarity('sprache', 'kuchen')).toBeLessThan(0.8);
  });
});


// The replacement for the overlay — see the note on `alignment`.
describe('colouring the word by what survived', () => {
  it('marks every character when the word came through', () => {
    expect(alignment('die Katze', 'die Katze').every(Boolean)).toBe(true);
  });

  it('marks the part that survived and leaves the rest', () => {
    const a = alignment('die Katze', 'die Katz');
    expect(a.slice(0, 8).every(Boolean)).toBe(true);   // "die Katz"
    expect(a[8]).toBe(false);                          // the final "e"
  });

  it('never marks a space wrong, because a space is not a sound', () => {
    const a = alignment('die Katze', '');
    expect(a[3]).toBe(true);                    // the space between article and noun
    expect(a.filter(Boolean)).toHaveLength(1);  // and nothing else
  });

  it('says nothing at all when nothing was heard', () => {
    expect(alignment('rudern', '').some((x) => x)).toBe(false);
  });

  it('does not credit letters that arrived out of order', () => {
    // LCS is the right shape: a recogniser drops and inserts letters, it does not
    // shuffle them, so only the ones that survived *in order* count.
    const a = alignment('Katze', 'ezaKt');
    expect(a.filter(Boolean).length).toBeLessThan(5);
  });
});
