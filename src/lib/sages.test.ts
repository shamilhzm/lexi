// The round, driven by a script of fake transcripts.
//
// The point of the reducer split: every rule the game has is provable here, with no
// microphone, no browser and no clock — which is what let the game be built while
// three of its four empirical gates were still unmeasured.
import { describe, it, expect } from 'vitest';
import {
  startRun, heard, tick, skip, tally, progress, secondsLeft, startClock,
  isPlayable, syllables, RUN_MS,
} from './sages.ts';
import type { Word } from '../types.ts';

const card = (term: string, over: Partial<Word> = {}): Word => ({
  id: `t:${term}`, term, en: 'x', pos: 'noun', level: 'A1', gender: 'die', plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'test', kind: 'word', ...over,
});

const RUN = [card('die Sprache'), card('das Eichhörnchen'), card('die Prämisse')];
/** A run whose clock is already going, which is every run after the mic opens. */
const live = (words = RUN) => startClock(startRun(words, 0), 0);

describe('a word stays until it is caught', () => {
  it('does not advance on a transcript that is not the word', () => {
    // The rule the whole game turns on. A word that expires is the recogniser's
    // failure charged to the learner, and it is the one thing this must never do.
    let run = live();
    run = heard(run, 'Kuchen', []);
    run = heard(run, 'Fahrrad', []);
    expect(run.index).toBe(0);
    expect(run.cleared).toBe(0);
  });

  it('is never taken away by the clock', () => {
    let run = live();
    run = tick(run, RUN_MS - 1);
    expect(run.index).toBe(0);
    expect(run.done).toBe(false);
  });

  it('advances on the first transcript that contains it, interim or final', () => {
    // Waiting for `isFinal` costs the pace the game is made of, and this asserts the
    // trade is actually taken — `heard` is never told which kind it got.
    let run = live();
    run = heard(run, 'Sprache', []);
    expect(run.index).toBe(1);
    expect(run.cleared).toBe(1);
    expect(run.slots[0].state).toBe('caught');
  });
});

describe('how close it came', () => {
  it('rises toward the word and never falls back', () => {
    // The fill on the word is the only feedback while a word is live. A gauge that
    // drops when the learner says a second thing is reporting noise as failure.
    let run = live();
    run = heard(run, 'Sprak', []);
    const first = run.slots[0].closeness;
    expect(first).toBeGreaterThan(0);
    run = heard(run, 'Auto', []);
    expect(run.slots[0].closeness).toBe(first);
  });

  it('is full on a hit however the hit was scored', () => {
    // `alternative` and `phonetic` can both land well under the fuzzy floor, and a
    // word that counted must not show as three-quarters right.
    let run = live([card('die Prämisse')]);
    run = heard(run, 'Prämie', ['Prämie', 'Prämisse']);
    expect(run.slots[0].caught).toBe('alternative');
    expect(run.slots[0].closeness).toBe(1);
  });

  it('starts at nothing', () => {
    expect(live().slots[0].closeness).toBe(0);
  });
});

describe('the clock belongs to the run', () => {
  it('does not start until the microphone opens', () => {
    // iOS shows up to *two* system dialogs between Start and audio arriving — Speech
    // Recognition, then Microphone. Measured on the Simulator before this existed: a
    // run was on word 8 by the time the second was answered, and every one of those
    // words was "missed" by nobody but the app's own timer.
    const cold = startRun(RUN, 0);
    expect(progress(cold, 60_000)).toBe(0);
    expect(tick(cold, 10_000_000).done).toBe(false);
    const hot = startClock(cold, 5_000);
    expect(hot.endsAt).toBe(5_000 + RUN_MS);
  });

  it('ends the run when it runs out, and not before', () => {
    let run = live();
    run = tick(run, RUN_MS - 1);
    expect(run.done).toBe(false);
    run = tick(run, RUN_MS);
    expect(run.done).toBe(true);
  });

  it('counts down in whole seconds', () => {
    const run = live();
    expect(secondsLeft(run, 0)).toBe(RUN_MS / 1000);
    expect(secondsLeft(run, RUN_MS - 1)).toBe(1);
    expect(secondsLeft(run, RUN_MS + 5_000)).toBe(0);
  });

  it('reports progress through the run', () => {
    const run = live();
    expect(progress(run, 0)).toBe(0);
    expect(progress(run, RUN_MS / 2)).toBeCloseTo(0.5);
    expect(progress(run, RUN_MS * 2)).toBe(1);
  });
});

describe('skipping', () => {
  it('moves on and clears nothing', () => {
    // Free on purpose. Charging time for a skip charges the learner for the
    // recogniser refusing a word, which is the same error in a different coat.
    let run = live();
    run = skip(run);
    expect(run.index).toBe(1);
    expect(run.cleared).toBe(0);
    expect(run.slots[0].state).toBe('missed');
  });
});

describe('the run ends', () => {
  it('and then ignores everything', () => {
    const run = tick(live(), RUN_MS);
    expect(heard(run, 'Sprache', [])).toBe(run);
    expect(skip(run)).toBe(run);
    expect(tick(run, 99_999_999)).toBe(run);
  });

  it('when the pool runs out, which is a floor rather than a rule', () => {
    let run = live([card('die Sprache')]);
    run = heard(run, 'Sprache', []);
    expect(run.done).toBe(true);
  });

  it('with counts and no percentage', () => {
    let run = live();
    run = heard(run, 'Sprache', []);
    run = skip(run);
    expect(tally(run)).toEqual({ cleared: 1, skipped: 1, attempted: 2 });
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
    expect(isPlayable(card('aber', { pos: 'conjunction', gender: null }))).toBe(false);
    expect(isPlayable(card('unter', { pos: 'preposition', gender: null }))).toBe(false);
  });

  it('refuses anything that is not one word', () => {
    // Found on the phone at word 3 of a run: the lookahead was showing
    // *Ich kann lange schlafen.* A pattern card is a fine thing to teach and a
    // hopeless thing to shout at a clock.
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
