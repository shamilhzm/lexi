// The race's scoring is the one part a learner will trust and cannot check, so
// it gets the same treatment as the exam mark scheme: the arithmetic is pinned,
// and so is every rule that could quietly teach the wrong habit — the digraph
// allowance, case sensitivity, and the refusal to advance past a wrong key.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  accuracy, buildRace, freshTyped, keystroke, paceAt, pacers, wpm, type Typed,
} from './race.ts';
import type { Word } from '../types.ts';

/** Type a whole string through the reducer, as the view does. */
function play(text: string, input: string): Typed {
  let t = freshTyped();
  let pending = '';
  for (const key of input) ({ next: t, pending } = keystroke(text, t, key, pending));
  return t;
}

describe('wpm', () => {
  it('is chars ÷ 5 over minutes', () => {
    expect(wpm(500, 60000)).toBe(100);
    expect(wpm(250, 60000)).toBe(50);
    expect(wpm(0, 60000)).toBe(0);
  });

  it('never divides by zero', () => {
    expect(wpm(100, 0)).toBe(0);
    expect(wpm(100, -1)).toBe(0);
  });
});

describe('typing', () => {
  it('advances only on the right character', () => {
    const t = play('Haus', 'Haus');
    expect(t.at).toBe(4);
    expect(t.correct).toBe(4);
    expect(t.errors).toBe(0);
    expect(t.done).toBe(true);
  });

  // The cursor does not move past a wrong key, so everything typed after one is
  // judged against the character still being waited for. That is the whole
  // reason a race cannot finish with a scrambled sentence.
  it('counts a wrong key and stays put, so the text cannot be outrun', () => {
    const t = play('Haus', 'Hxxus');
    expect(t.at).toBe(1);          // 'H' landed; 'a' is still wanted
    expect(t.errors).toBe(4);      // x, x, u and s were all judged against 'a'
    expect(t.done).toBe(false);
    // …and the moment the right key arrives, it moves on.
    const fixed = play('Haus', 'Hxaus');
    expect(fixed.at).toBe(4);
    expect(fixed.errors).toBe(1);
    expect(fixed.done).toBe(true);
  });

  // German capitalises its nouns, and this is the screen where that habit forms.
  it('is case-sensitive', () => {
    const t = play('Haus', 'haus');
    expect(t.at).toBe(0);          // never got past the capital
    expect(t.errors).toBe(4);
    expect(t.done).toBe(false);
    expect(play('Haus', 'Haus').done).toBe(true);
  });

  it('accepts an umlaut typed directly, with no digraph counted', () => {
    const t = play('Bär', 'Bär');
    expect(t.done).toBe(true);
    expect(t.digraphs).toBe(0);
    expect(t.errors).toBe(0);
  });

  it('accepts ae/oe/ue/ss for ä/ö/ü/ß, and counts each one', () => {
    const t = play('Bär', 'Baer');
    expect(t.done).toBe(true);
    expect(t.digraphs).toBe(1);
    expect(t.errors).toBe(0);
    // The substitution is worth the one character it stands for, not two, so
    // avoiding umlauts cannot inflate the speed it is meant to expose.
    expect(t.correct).toBe(3);
  });

  it('handles ß as ss', () => {
    const t = play('Straße', 'Strasse');
    expect(t.done).toBe(true);
    expect(t.digraphs).toBe(1);
    expect(t.errors).toBe(0);
  });

  it('charges one error when a digraph opener turns out to be a typo', () => {
    // 'a' looks like the start of "ae" for ä; 'n' proves it was not.
    const t = play('Bär', 'Ban');
    expect(t.errors).toBe(2);      // the false opener, then the 'n'
    expect(t.at).toBe(1);
    expect(t.digraphs).toBe(0);
  });

  it('does not treat a bare "a" before a non-umlaut as pending', () => {
    const t = play('Bar', 'Bar');
    expect(t.done).toBe(true);
    expect(t.digraphs).toBe(0);
    expect(t.errors).toBe(0);
  });

  it('ignores keystrokes after the text is finished', () => {
    const t = play('Ja', 'Ja');
    const after = keystroke('Ja', t, 'x', '');
    expect(after.next.errors).toBe(0);
    expect(after.next).toEqual(t);
  });

  it('reports accuracy over every keystroke that landed', () => {
    expect(accuracy(play('Haus', 'Haus'))).toBe(1);
    expect(accuracy(play('Haus', 'Hxaus'))).toBeCloseTo(4 / 5);
    expect(accuracy(freshTyped())).toBe(1);
  });
});

describe('pace-setters', () => {
  it('puts one below and one above, so neither race is a foregone conclusion', () => {
    const [slow, fast] = pacers(50);
    expect(slow.wpm).toBeLessThan(50);
    expect(fast.wpm).toBeGreaterThan(50);
  });

  it('has a sane default before a learner has ever raced', () => {
    const [slow, fast] = pacers(null);
    expect(slow.wpm).toBeGreaterThanOrEqual(12);
    expect(fast.wpm).toBeGreaterThan(slow.wpm);
  });

  it('does not let an implausible best make an unbeatable pacer', () => {
    // A 3 WPM "best" is a rage-quit, not a personal best.
    const [slow] = pacers(3);
    expect(slow.wpm).toBeGreaterThanOrEqual(12);
  });

  // Found by playing: a scripted 305 WPM run put the rivals at 244 and 351 for
  // good, since the record only ever rises. A pacer nobody can catch is scenery.
  it('never builds a rival faster than a human types, however freak the record', () => {
    const [slow, fast] = pacers(305);
    expect(fast.wpm).toBeLessThanOrEqual(140);
    expect(slow.wpm).toBeLessThan(fast.wpm);
    // …and an ordinary best is still respected exactly.
    expect(pacers(60)[1].wpm).toBe(69);
  });

  it('moves a pacer along the text at its own fixed rate', () => {
    const r = { id: 'x', label: 'x', wpm: 60 };          // 300 chars a minute
    expect(paceAt(r, 60000, 300)).toBeCloseTo(1);
    expect(paceAt(r, 30000, 300)).toBeCloseTo(0.5);
    expect(paceAt(r, 0, 300)).toBe(0);
    expect(paceAt(r, 999999, 300)).toBe(1);              // clamped
    expect(paceAt(r, 1000, 0)).toBe(0);                  // no text, no divide
  });
});

// ---- against the real corpus ----------------------------------------------
// A race that cannot start is the failure mode that matters, and it is invisible
// in a unit test with three fake cards: C2 has 196 cards and most levels' example
// sentences are shorter than the floor. So this runs over the shipped lexicon.
describe('building a race from the shipped corpus', () => {
  const raw = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
  const words: Word[] = Array.isArray(raw) ? raw : raw.words;

  it.each(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const)('produces a passage at %s', (level) => {
    const race = buildRace(words, level, 7);
    expect(race.text.length, level).toBeGreaterThan(40);
    expect(race.sources.length, level).toBe(3);
  });

  it('is reproducible from its seed, and different across seeds', () => {
    expect(buildRace(words, 'B1', 42).text).toBe(buildRace(words, 'B1', 42).text);
    expect(buildRace(words, 'B1', 42).text).not.toBe(buildRace(words, 'B1', 43).text);
  });

  it('never repeats a card inside one race', () => {
    for (let seed = 1; seed < 30; seed++) {
      const { sources } = buildRace(words, 'B1', seed);
      expect(new Set(sources).size, `seed ${seed}`).toBe(sources.length);
    }
  });

  it('is typeable: no markup, no ellipsis, no unbalanced quote', () => {
    for (let seed = 1; seed < 40; seed++) {
      const { text } = buildRace(words, 'A2', seed);
      expect(text, `seed ${seed}`).not.toMatch(/[<>[\]{}|_*]|\.\.\.|…/);
      expect((text.match(/"/g) ?? []).length % 2, `seed ${seed}`).toBe(0);
    }
  });

  // Found by playing, not by reading: the first A1 passage contained an en dash
  // and there is no key for one, so the race could not be finished. Every level,
  // many seeds, character by character.
  it.each(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const)(
    'contains only characters a keyboard can produce, at %s', (level) => {
      const allowed = /^[A-Za-zÄÖÜäöüß0-9 .,!?'"()\-:;/%]*$/;
      for (let seed = 1; seed < 60; seed++) {
        const { text } = buildRace(words, level, seed);
        const bad = [...text].filter((c) => !allowed.test(c));
        expect(bad, `${level} seed ${seed}: ${bad.map((c) => `U+${c.codePointAt(0)!.toString(16)}`).join(' ')}`)
          .toEqual([]);
      }
    });

  it('can be typed to completion, character for character', () => {
    const { text } = buildRace(words, 'B1', 11);
    const t = play(text, text);
    expect(t.done).toBe(true);
    expect(t.errors).toBe(0);
    expect(t.correct).toBe(text.length);
  });
});
