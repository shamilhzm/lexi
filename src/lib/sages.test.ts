// The round, driven by a script of fake transcripts.
//
// The point of the reducer split: every rule the game has is provable here, with no
// microphone, no browser and no clock — which is what let the game be built while
// three of its four empirical gates were still unmeasured.
import { describe, it, expect } from 'vitest';
import { startRun, heard, tick, skip, tally, progress, isPlayable, syllables, resetDeadline, WORD_MS } from './sages.ts';
import type { Word } from '../types.ts';

const card = (term: string, over: Partial<Word> = {}): Word => ({
  id: `t:${term}`, term, en: 'x', pos: 'noun', level: 'A1', gender: 'die', plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'test', kind: 'word', ...over,
});

const RUN = [card('die Sprache'), card('das Eichhörnchen'), card('die Prämisse')];

describe('a word is settled by the first transcript that contains it', () => {
  it('advances on an interim result rather than waiting for the final one', () => {
    // Waiting for `isFinal` costs the pace the game is made of, and this asserts the
    // trade is actually taken — `heard` is never told which kind it got.
    let run = startRun(RUN, 0);
    run = heard(run, 'Sprache', [], 100);
    expect(run.index).toBe(1);
    expect(run.slots[0].state).toBe('caught');
    expect(run.streak).toBe(1);
  });

  it('stays put while the recogniser is saying something else', () => {
    let run = startRun(RUN, 0);
    run = heard(run, 'Kuchen', [], 100);
    expect(run.index).toBe(0);
    expect(run.slots[0].state).toBe('waiting');
    expect(run.streak).toBe(0);
  });

  it('keeps the closest thing it heard, so the overlay has something to print', () => {
    // The overlay is the whole feedback mechanism. A word that was not caught still
    // has to show *what was heard instead* — that is the joke and the honesty. It is
    // the closest *token*, not the whole utterance: printing "ich sage Kuchen bitte"
    // across a word is not a punchline, it is a paragraph.
    let run = startRun(RUN, 0);
    run = heard(run, 'ich sage Kuchen bitte', [], 100);
    expect(run.slots[0].heard).toBe('sage');
    expect(run.slots[0].caught).toBeNull();
  });
});

describe('the track is the timer', () => {
  it('lets a word go by when its deadline passes', () => {
    let run = startRun(RUN, 0);
    run = tick(run, WORD_MS - 1);
    expect(run.index).toBe(0);
    run = tick(run, WORD_MS);
    expect(run.index).toBe(1);
    expect(run.slots[0].state).toBe('missed');
  });

  it('restarts the deadline for each word rather than running one clock', () => {
    // A shared clock would punish a learner for the *previous* word being slow.
    let run = startRun(RUN, 0);
    run = heard(run, 'Sprache', [], 4000);
    expect(run.startedAt).toBe(4000);
    expect(progress(run, 4000)).toBe(0);
  });

  it('reports progress through the current word, and nothing else', () => {
    const run = startRun(RUN, 0);
    expect(progress(run, 0)).toBe(0);
    expect(progress(run, WORD_MS / 2)).toBeCloseTo(0.5);
    expect(progress(run, WORD_MS * 2)).toBe(1);
  });

  it('breaks the streak on a word that went past, and remembers the best', () => {
    let run = startRun(RUN, 0);
    run = heard(run, 'Sprache', [], 100);
    expect(run.streak).toBe(1);
    run = tick(run, 100 + WORD_MS);
    expect(run.streak).toBe(0);
    expect(run.best).toBe(1);
  });
});

describe('the clock does not start before the microphone does', () => {
  // Found by driving it on the Simulator: iOS shows up to *two* system dialogs
  // between pressing Start and audio arriving — Speech Recognition, then Microphone
  // — and the first version ran its track through both. A twelve-word run was on
  // word 8 by the time the second was answered: seven words missed, none of them by
  // the learner, which is the exact failure this game exists to never produce.
  it('can be put back to the start of the current word', () => {
    let run = startRun(RUN, 0);
    expect(progress(run, 4000)).toBeCloseTo(0.8);
    run = resetDeadline(run, 4000);
    expect(progress(run, 4000)).toBe(0);
    expect(run.index).toBe(0);        // and it is not an advance
    expect(run.slots[0].state).toBe('waiting');
  });

  it('leaves a finished run alone', () => {
    const run = { ...startRun([], 0) };
    expect(resetDeadline(run, 999)).toBe(run);
  });
});

describe('the run ends', () => {
  it('when the last word resolves, however it resolved', () => {
    let run = startRun([card('die Sprache')], 0);
    run = skip(run, 10);
    expect(run.done).toBe(true);
    expect(tally(run)).toEqual({ total: 1, caught: 0, best: 0 });
  });

  it('and then ignores everything', () => {
    let run = startRun([card('die Sprache')], 0);
    run = skip(run, 10);
    const after = heard(run, 'Sprache', [], 20);
    expect(after).toBe(run);
    expect(tick(run, 99_999)).toBe(run);
  });

  it('with counts and a streak, and no percentage', () => {
    // `Tally` has no rate on purpose: a percentage presented as a result reads as a
    // mark for the learner's mouth, which is the thing this game refuses to give.
    let run = startRun(RUN, 0);
    run = heard(run, 'Sprache', [], 10);
    run = heard(run, 'Eichhörnchen', [], 20);
    run = tick(run, 20 + WORD_MS);
    expect(tally(run)).toEqual({ total: 3, caught: 2, best: 2 });
    expect(Object.keys(tally(run))).not.toContain('rate');
  });

  it('starts done when there is nothing to say', () => {
    expect(startRun([], 0).done).toBe(true);
  });
});

describe('which cards the game may ask for', () => {
  it('takes content words of two syllables or more', () => {
    expect(isPlayable(card('die Sprache'))).toBe(true);
    expect(isPlayable(card('die Argumentation'))).toBe(true);
  });

  it('refuses monosyllables, which are a coin flip for any recogniser', () => {
    expect(isPlayable(card('das Brot'))).toBe(false);
    expect(isPlayable(card('der Tisch'))).toBe(false);
  });

  it('refuses function words even when they have two syllables', () => {
    // `auch` is one syllable; `aber` is two and is still not a word to say alone.
    expect(isPlayable(card('aber', { pos: 'conjunction', gender: null }))).toBe(false);
    expect(isPlayable(card('unter', { pos: 'preposition', gender: null }))).toBe(false);
  });

  it('refuses anything that is not one word', () => {
    // Found on the phone at word 3 of a run: the lookahead was showing
    // *Ich kann lange schlafen.* A pattern card is a fine thing to teach and a
    // hopeless thing to shout at a deadline.
    expect(isPlayable(card('Ich kann lange schlafen.', { pos: 'phrase', gender: null }))).toBe(false);
    expect(isPlayable(card('es gibt + A', { pos: 'phrase', gender: null }))).toBe(false);
    expect(isPlayable(card('der öffentliche Nahverkehr'))).toBe(false);
  });

  it('still takes a governed verb, because the government is not said', () => {
    expect(isPlayable(card('teilnehmen an + D', { pos: 'verb', gender: null }))).toBe(true);
    expect(isPlayable(card('sich erinnern an + A', { pos: 'verb', gender: null }))).toBe(true);
  });

  it('counts syllables by vowel groups, umlauts included', () => {
    expect(syllables('Haus')).toBe(1);
    expect(syllables('Sprache')).toBe(2);
    expect(syllables('Eichhörnchen')).toBe(3);
  });
});
