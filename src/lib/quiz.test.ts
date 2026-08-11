// The quiz engine is what makes every level testable, so its guarantees are
// worth pinning: a seed reproduces a quiz, an item never shows its own answer
// twice, and a thin corpus degrades rather than throws.
import { describe, expect, it } from 'vitest';
import { PRESETS, buildQuiz, firstSense, rng } from './quiz.ts';
import type { Word } from '../types.ts';

const w = (over: Partial<Word>): Word => ({
  id: 'x', term: '', en: '', pos: 'noun', level: 'A1', gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...over,
});

const corpus: Word[] = [
  w({ id: 'v:1', term: 'der Tisch', en: 'table', gender: 'der', plural: 'die Tische',
    ex: [{ de: 'Der Tisch ist groß.', en: 'The table is big.', lvl: 'A1' }] }),
  w({ id: 'v:2', term: 'die Tür', en: 'door', gender: 'die',
    ex: [{ de: 'Die Tür ist offen.', en: 'The door is open.', lvl: 'A1' }] }),
  w({ id: 'v:3', term: 'das Bett', en: 'bed', gender: 'das' }),
  w({ id: 'v:4', term: 'das Fenster', en: 'window', gender: 'das' }),
  w({ id: 'v:5', term: 'der Stuhl', en: 'chair', gender: 'der' }),
  w({ id: 'v:6', term: 'die Lampe', en: 'lamp', gender: 'die' }),
  w({ id: 'v:7', term: 'laufen', en: 'to run; to walk', pos: 'verb', level: 'A2' }),
  w({ id: 'v:8', term: 'gehen', en: 'to go', pos: 'verb', level: 'A2' }),
  w({ id: 'v:9', term: 'die Zukunft', en: 'future', gender: 'die', level: 'B2' }),
];

const grammar = {
  A1: [{ title: 'Artikel', summary: '', rule: '', exercises: [
    { kind: 'choose' as const, prompt: '___ Mann ist groß.', options: ['Der', 'Die', 'Das'], answer: 0, explain: 'Mann is masculine.' },
    { kind: 'type' as const, prompt: 'skip me', accept: ['x'] },
  ] }],
  A2: [], B1: [], B2: [], C1: [], C2: [],
};

describe('buildQuiz', () => {
  it('is reproducible from its seed, and different across seeds', () => {
    const a = buildQuiz({ level: 'A2', n: 6, seed: 42 }, { words: corpus, grammar });
    const b = buildQuiz({ level: 'A2', n: 6, seed: 42 }, { words: corpus, grammar });
    const c = buildQuiz({ level: 'A2', n: 6, seed: 7 }, { words: corpus, grammar });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('never repeats an item within one quiz', () => {
    const q = buildQuiz({ level: 'B2', n: 20, seed: 3 }, { words: corpus, grammar });
    expect(new Set(q.map((i) => i.id)).size).toBe(q.length);
  });

  it('puts the answer in the options, exactly once', () => {
    for (const i of buildQuiz({ level: 'B2', n: 20, seed: 5 }, { words: corpus, grammar })) {
      expect(i.options[i.answer], i.prompt).toBeTruthy();
      expect(new Set(i.options).size, i.prompt).toBe(i.options.length);
    }
  });

  it('gives every item an explanation — a wrong answer is a teaching moment', () => {
    for (const i of buildQuiz({ level: 'B2', n: 20, seed: 9 }, { words: corpus, grammar })) {
      expect(i.why, i.prompt).toBeTruthy();
    }
  });

  it('is cumulative by default and bandable on request', () => {
    const all = buildQuiz({ level: 'B2', n: 30, seed: 1, kinds: ['de-en'] }, { words: corpus });
    expect(all.some((i) => i.level === 'A1')).toBe(true);
    const band = buildQuiz({ level: 'B2', n: 30, seed: 1, kinds: ['de-en'], cumulative: false }, { words: corpus });
    expect(band.every((i) => i.level === 'B2')).toBe(true);
  });

  it('blanks the headword in a cloze and never leaves it visible', () => {
    const q = buildQuiz({ level: 'A1', n: 5, seed: 2, kinds: ['cloze'] }, { words: corpus });
    expect(q.length).toBeGreaterThan(0);
    for (const i of q) {
      expect(i.prompt).toContain('____');
      expect(i.prompt).not.toContain(i.options[i.answer]);
    }
  });

  it('asks gender with all three articles and the right one keyed', () => {
    const q = buildQuiz({ level: 'A1', n: 4, seed: 4, kinds: ['gender'] }, { words: corpus });
    for (const i of q) {
      expect([...i.options].sort()).toEqual(['das', 'der', 'die']);
      expect(i.why).toContain(i.options[i.answer]);
    }
  });

  it('takes only the grammar exercises that are already multiple choice', () => {
    const q = buildQuiz({ level: 'A1', n: 10, seed: 6, kinds: ['grammar'] }, { words: corpus, grammar });
    expect(q).toHaveLength(1);                       // the `type` exercise is skipped
    expect(q[0].options).toHaveLength(3);
    expect(q[0].options[q[0].answer]).toBe('Der');
  });

  it('can be scoped to specific cards — "quiz me on what I got wrong"', () => {
    const q = buildQuiz({ level: 'B2', n: 10, seed: 8, kinds: ['de-en'], ids: ['v:1', 'v:3'] }, { words: corpus });
    expect(q.map((i) => i.id).sort()).toEqual(['v:1', 'v:3']);
    // …but the distractors still come from the whole band, or every option would
    // be a word the learner is already failing.
    expect(q.some((i) => i.options.length === 4)).toBe(true);
  });

  it('degrades rather than throwing on a corpus that cannot fill the quiz', () => {
    expect(buildQuiz({ level: 'A1', n: 10, seed: 1 }, { words: [] })).toEqual([]);
    const thin = buildQuiz({ level: 'A1', n: 10, seed: 1, kinds: ['grammar'] }, { words: corpus, grammar: null });
    expect(thin).toEqual([]);
  });

  it('mixes kinds rather than serving whichever was most abundant', () => {
    const q = buildQuiz({ level: 'B2', n: 8, seed: 11 }, { words: corpus, grammar });
    expect(new Set(q.map((i) => i.kind)).size).toBeGreaterThan(1);
  });
});

describe('firstSense', () => {
  it('takes one sense, so an option is not three senses long', () => {
    expect(firstSense('to run; to walk')).toBe('to run');
    expect(firstSense('train; move / turn')).toBe('train');
    expect(firstSense('cupboard, wardrobe')).toBe('cupboard');
  });
});

describe('presets', () => {
  it('every preset asks for kinds the builder knows', () => {
    const known = new Set(['de-en', 'en-de', 'gender', 'cloze', 'grammar']);
    for (const p of PRESETS) {
      expect(p.kinds.length, p.key).toBeGreaterThan(0);
      for (const k of p.kinds) expect(known.has(k), `${p.key}: ${k}`).toBe(true);
    }
  });
});

describe('rng', () => {
  it('is stable for a seed', () => {
    expect([rng(1)(), rng(1)()]).toEqual([rng(1)(), rng(1)()]);
  });
});
