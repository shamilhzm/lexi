// The per-word drill, swept over the real corpus.
//
// The rules in `meaningOptions` are the kind that hold for the first hundred
// words you try by hand and fail on the two hundredth: a part of speech with too
// few members to fill four options, a gloss whose only distractors are its own
// synonyms, a `syn` list written in one direction. So this asks the shipped
// vocab.json, every row of it, rather than a fixture of six.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registerWords } from '../data/index.ts';
import { resetSurfaceIndex } from '../lib/surface.ts';
import { meaningOptions, glossOverlap, eligibleModes } from './drills.tsx';
import { stepsFor } from '../components/WordDrill.tsx';
import type { Word } from '../types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const words = corpus.filter((w) => w.kind === 'word');
registerWords(corpus);
resetSurfaceIndex();

/** `meaningOptions` scans the whole lexicon per call, so building it for all
 *  6,600 cards four times over costs a minute of every test run. Once, on a
 *  fifth of them, taken by stride so the sample walks every level, part of
 *  speech and sector in corpus order rather than clustering at A1. A systemic
 *  hole in the distractor rules shows up in 1,300 words; nothing here is looking
 *  for a single bad card. */
const SAMPLE = words.filter((_, i) => i % 5 === 0);
const OPTIONS = new Map(SAMPLE.map((w) => [w.id, meaningOptions(w)] as const));

describe('every word has something to drill', () => {
  // The whole reason `MeaningItem` exists. `eligibleModes` returns [] for a verb
  // or an adjective nobody has learned yet — no gender, no plural, and recall
  // gated on the flip being known — so without a recognition step the graduation
  // cap on a feed card would open an empty sheet on most of the corpus.
  it('starts with meaning, for every card in the corpus', () => {
    const empty = words.filter((w) => eligibleModes(w).length === 0);
    expect(empty.length).toBeGreaterThan(1000);   // this is the common case, not an edge
    for (const w of words) expect(stepsFor(w)[0]).toBe('meaning');
  });

  it('never opens a sheet with nothing in it', () => {
    for (const w of words) expect(stepsFor(w).length).toBeGreaterThanOrEqual(1);
  });

  it('asks a noun for its article and its plural, in that order', () => {
    const tisch = words.find((w) => w.term === 'der Tisch');
    expect(tisch).toBeDefined();
    expect(stepsFor(tisch!)).toEqual(['meaning', 'gender', 'plural']);
  });
});

describe('the meaning item is answerable and honest', () => {
  it('always offers a real choice, and the right answer is in it', () => {
    const thin: string[] = [];
    for (const w of SAMPLE) {
      const { options, correct } = OPTIONS.get(w.id)!;
      if (options.length < 2) { thin.push(w.term); continue; }
      expect(options[correct]).toBe(w.en);
    }
    expect(thin).toEqual([]);
  });

  it('fills four options for all but a handful', () => {
    // Not "always four": a rare part of speech genuinely has fewer usable
    // distractors, and padding it by relaxing the synonym rule would trade a
    // short question for a wrong one.
    const short = SAMPLE.filter((w) => OPTIONS.get(w.id)!.options.length < 4);
    expect(short.length / SAMPLE.length).toBeLessThan(0.02);
  });

  it('never repeats an option', () => {
    for (const w of SAMPLE) {
      const { options } = OPTIONS.get(w.id)!;
      expect(new Set(options.map((o) => o.toLowerCase())).size).toBe(options.length);
    }
  });

  it('never offers a synonym of the answer as a wrong answer', () => {
    // The failure this exists to prevent: the learner knows the German pair, the
    // card marks them wrong, and FSRS schedules a word they already had. It has
    // fired for real: `glossOverlap` used to drop tokens shorter than three
    // letters, so *to go* and *to go out* did not count as overlapping.
    const key = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
    const byGloss = new Map<string, Word[]>();
    for (const w of words) {
      const list = byGloss.get(w.en) ?? [];
      list.push(w);
      byGloss.set(w.en, list);
    }
    for (const w of SAMPLE) {
      const syn = new Set(w.syn.map(key));
      if (!syn.size) continue;
      const { options, correct } = OPTIONS.get(w.id)!;
      for (const [i, o] of options.entries()) {
        if (i === correct) continue;
        // Every card that carries this gloss, not just the first — two German
        // words can share an English gloss, and checking only one of them is how
        // a sweep passes while the drill is still wrong.
        for (const other of byGloss.get(o) ?? []) expect(syn.has(key(other.term))).toBe(false);
      }
    }
  });
});

describe('glossOverlap', () => {
  it('catches a distractor that restates the answer', () => {
    expect(glossOverlap('car', 'the car')).toBe(true);
    expect(glossOverlap('to go', 'to go out')).toBe(true);
  });

  it('does not reject on function words alone', () => {
    // Every English gloss in the corpus shares "to" or "the" with half the
    // others; matching on those would leave no distractors at all.
    expect(glossOverlap('to run', 'to swim')).toBe(false);
    expect(glossOverlap('the house', 'the tree')).toBe(false);
  });

  it('is honest about what it cannot see', () => {
    // No shared token, same meaning. This is the case `meaningOptions` closes
    // with the corpus's `syn` field instead — see its note.
    expect(glossOverlap('to start', 'to begin')).toBe(false);
  });
});
