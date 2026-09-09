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
import { verdict, koelner, normalise, spokenForm, similarity, FUZZY_FLOOR } from './asr-match.ts';

describe('what the learner is asked to say', () => {
  it('drops the article, the reflexive and the government', () => {
    expect(spokenForm('der Tisch')).toBe('Tisch');
    expect(spokenForm('sich erinnern an + A')).toBe('erinnern');
    expect(spokenForm('teilnehmen an + D')).toBe('teilnehmen');
    expect(spokenForm('das Zuhause')).toBe('Zuhause');
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
    expect(verdict('das Haus', 'Haus').caught).toBe('exact');
  });

  it('with different casing and punctuation, which are not sounds', () => {
    expect(verdict('die Straße', 'strasse.').caught).toBe('exact');
  });

  // The case the whole `candidates` loop exists for.
  it('when it split a compound into two words', () => {
    expect(verdict('das Eichhörnchen', 'Eich Hörnchen').caught).not.toBeNull();
  });

  it('when the word is buried in a sentence the engine invented', () => {
    // Engines pad single words into plausible phrases. The word is still there.
    expect(verdict('die Sprache', 'die Sprache ist').caught).toBe('exact');
  });

  it('as its second guess', () => {
    const v = verdict('die Prämisse', 'Prämie', ['Prämie', 'Prämisse']);
    expect(v.caught).toBe('alternative');
  });

  it('on phonetics, when the spelling drifted but the sound did not', () => {
    // A recogniser writing what it heard rather than the dictionary form.
    const v = verdict('die Quellenkritik', 'Kwellenkritik');
    expect(v.caught).not.toBeNull();
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
    expect(koelner('Haus')).toBe(koelner('aus'));      // the collision is real
    expect(verdict('das Haus', 'aus').caught).toBeNull(); // and it is not a hit
  });

  it('while the same rule still helps on a long one', () => {
    // Long words do not collide by accident, so the code is doing real work there.
    expect(verdict('die Verschlimmbesserung', 'Ferschlimmbesserung').caught).toBe('phonetic');
  });
});

describe('what the game prints over the word', () => {
  it('is the closest thing the recogniser said, not the whole sentence', () => {
    // The overlay is the entire feedback mechanism — "JUNE" over "JANUARY" — so it
    // has to be the token that competed, not everything the engine emitted.
    expect(verdict('der Januar', 'ich sage Juni bitte').heard).toBe('Juni');
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
