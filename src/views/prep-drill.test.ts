// The preposition drill, swept over the real corpus — and the one function every
// drill surface now renders through.
//
// `prepOptions` has exactly one way to mark correct German wrong: offering, as a
// distractor, a preposition the same word also takes (*sich freuen auf* / *über*).
// That cannot be checked on a fixture of three, so this asks every governed card.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registerWords } from '../data/index.ts';
import { resetSurfaceIndex } from '../lib/surface.ts';
import { government } from '../lib/matcher.ts';
import { prepOf, prepOptions, practiceModes, eligibleModes, canAsk, GOVERNED_PREPS, MODE_TAG, type Mode } from './drills.tsx';
import type { Word } from '../types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const words = corpus.filter((w) => w.kind === 'word');
registerWords(corpus);
resetSurfaceIndex();

const governed = words.filter((w) => prepOf(w));
const byTerm = (t: string) => words.find((w) => w.term === t)!;

describe('prepOf — which cards have a preposition to ask for', () => {
  it('finds the governed cards, reflexive and adjective alike', () => {
    expect(governed.length).toBeGreaterThan(30);
    expect(prepOf(byTerm('warten auf + A'))).toMatchObject({ prep: 'auf', head: 'warten' });
    expect(prepOf(byTerm('sich interessieren für + A'))).toMatchObject({ prep: 'für', head: 'sich interessieren' });
  });

  it('leaves a bare preposition and an ordinary word alone', () => {
    expect(prepOf(byTerm('wegen + G'))).toBeNull();     // the headword *is* the preposition
    expect(prepOf(byTerm('warten'))).toBeNull();
    expect(prepOf(byTerm('der Tisch'))).toBeNull();
  });

  it('every preposition the corpus governs with is one the drill can offer', () => {
    // The distractor pool is a hand-written list; count the cases in the data.
    const used = new Set(words.map((w) => government(w.term)?.prep).filter((p): p is string => !!p));
    // Two headwords use the `+ case` notation without a preposition before it —
    // `gelten als + N` and `es gibt + A` — and `government` reads their last word
    // as one. Neither is a preposition, so neither may reach the drill.
    const NOT_A_PREPOSITION = new Set(['als', 'gibt']);
    const unknown = [...used].filter((p) => !GOVERNED_PREPS.includes(p) && !NOT_A_PREPOSITION.has(p));
    for (const p of NOT_A_PREPOSITION) expect(GOVERNED_PREPS).not.toContain(p);
    expect(unknown).toEqual([]);
  });
});

describe('prepOptions — four choices, and only one of them is German', () => {
  it('builds for every governed card, with the right answer among four', () => {
    for (const w of governed) {
      const mc = prepOptions(w, words);
      expect(mc, w.term).not.toBeNull();
      expect(mc!.options).toHaveLength(4);
      expect(new Set(mc!.options).size).toBe(4);
      expect(mc!.options[mc!.correct]).toBe(prepOf(w)!.prep);
    }
  });

  it('never offers a preposition another card attests for the same word', () => {
    const preps = new Map<string, Set<string>>();
    for (const w of words) {
      const g = government(w.term);
      if (g) (preps.get(g.lemma.toLowerCase()) ?? preps.set(g.lemma.toLowerCase(), new Set()).get(g.lemma.toLowerCase())!).add(g.prep);
    }
    for (const w of governed) {
      const mine = prepOf(w)!;
      // Random distractors: ask each card several times.
      for (let n = 0; n < 8; n++) {
        const mc = prepOptions(w, words)!;
        const wrong = mc.options.filter((_, i) => i !== mc.correct);
        for (const o of wrong) expect(preps.get(mine.lemma.toLowerCase())!.has(o), `${w.term} offered ${o}`).toBe(false);
      }
    }
  });

  it('prints the word without its preposition or its case', () => {
    for (const w of governed) {
      const head = prepOptions(w, words)!.head;
      expect(head).not.toMatch(/\+/);
      expect(head.split(' ').at(-1)).not.toBe(prepOf(w)!.prep);
    }
  });
});

describe('where the drill is offered', () => {
  it('is in the bank a learner asks for, and not in what the scheduler weaves', () => {
    const w = byTerm('warten auf + A');
    expect(practiceModes(w)).toContain('prep');
    expect(eligibleModes(w)).not.toContain('prep');     // VISION: still the original three
    expect(practiceModes(byTerm('warten'))).not.toContain('prep');
  });

  it('logs its misses under a label of its own', () => {
    const tags = Object.values(MODE_TAG);
    expect(new Set(tags).size).toBe(tags.length);
    expect(MODE_TAG.prep).toBe('The preposition a word takes');
  });
});

describe('canAsk — what the session may resurface', () => {
  const tisch = byTerm('der Tisch');
  const warten = byTerm('warten auf + A');

  it('answers for every mode, so a new one cannot be forgotten', () => {
    const modes = Object.keys(MODE_TAG) as Mode[];
    for (const m of modes) expect(typeof canAsk(m, tisch)).toBe('boolean');
  });

  it('refuses a drill the word has no property for', () => {
    expect(canAsk('gender', tisch)).toBe(true);
    expect(canAsk('gender', warten)).toBe(false);
    expect(canAsk('prep', warten)).toBe(true);
    expect(canAsk('prep', tisch)).toBe(false);
    expect(canAsk('degree', tisch, ['x'])).toBe(false);
  });

  it('refuses a sentence drill until the examples have arrived', () => {
    // `cards.json` boots without `ex`; `detail` attaches it after first paint.
    const bare = { ...tisch, ex: [] };
    expect(canAsk('usage', bare)).toBe(false);
    expect(canAsk('cloze', bare)).toBe(false);
    expect(canAsk('usage', tisch)).toBe(true);
  });
});
