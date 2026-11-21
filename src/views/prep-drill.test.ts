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
import { prepOf, prepOptions, prepsFor, practiceModes, eligibleModes, canAsk, GOVERNED_PREPS, MODE_TAG, type Mode } from './drills.tsx';
import { ALSO_TAKES } from '../data/government.ts';
import type { Word } from '../types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const words = corpus.filter((w) => w.kind === 'word');
registerWords(corpus);
resetSurfaceIndex();

const governed = words.filter((w) => prepOf(w));
const byTerm = (t: string) => words.find((w) => w.term === t)!;

describe('prepOf — which cards have a preposition to ask for', () => {
  it('finds the governed cards, reflexive and adjective alike', () => {
    expect(governed.length).toBeGreaterThan(80);
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

  it('never offers a preposition the corpus attests for the same word', () => {
    for (const w of governed) {
      const valid = prepsFor(w, words);
      expect(valid.has(prepOf(w)!.prep), w.term).toBe(true);
      // Random distractors: ask each card several times.
      for (let n = 0; n < 6; n++) {
        const mc = prepOptions(w, words)!;
        const wrong = mc.options.filter((_, i) => i !== mc.correct);
        for (const o of wrong) expect(valid.has(o), `${w.term} offered ${o}`).toBe(false);
      }
    }
  });

  // *kämpfen gegen* and *schützen gegen* are German, and the drill offered both as
  // the wrong answer until ALSO_TAKES (2026-11-21).
  it('never offers a second preposition the word also takes', () => {
    expect(prepsFor(byTerm('kämpfen'), words).has('gegen')).toBe(true);
    expect(prepsFor(byTerm('schützen'), words).has('gegen')).toBe(true);
    expect(prepsFor(byTerm('warten auf + A'), words).has('mit')).toBe(true);
    expect(prepsFor(byTerm('sprechen'), words).has('mit')).toBe(true);
  });

  it('ALSO_TAKES names only words the drill asks, never their own answer', () => {
    const lemmas = new Map(governed.map((w) => [prepOf(w)!.lemma, prepOf(w)!.prep]));
    for (const [lemma, preps] of Object.entries(ALSO_TAKES)) {
      expect(lemmas.has(lemma), `${lemma} is not a word the drill asks`).toBe(true);
      for (const p of preps) {
        expect(GOVERNED_PREPS, `${lemma} ${p}`).toContain(p);
        expect(p, `${lemma} lists its own answer`).not.toBe(lemmas.get(lemma));
      }
    }
  });

  it('knows a verb by all its cards: sich freuen takes auf and über', () => {
    const valid = prepsFor(byTerm('sich freuen auf + A'), words);
    expect(valid.has('auf') && valid.has('über')).toBe(true);
    expect(prepsFor(byTerm('sich freuen'), words).has('auf')).toBe(true);
  });

  it('asks a plain card for the preposition its own examples show', () => {
    expect(prepOf(byTerm('antworten'))).toMatchObject({ prep: 'auf', head: 'antworten' });
    expect(prepOf(byTerm('sich kümmern'))).toMatchObject({ prep: 'um', head: 'sich kümmern' });
    expect(prepOf(byTerm('leiden (unter)'))).toMatchObject({ prep: 'unter', head: 'leiden' });
    expect(prepOf(byTerm('gehen'))).toBeNull();
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
