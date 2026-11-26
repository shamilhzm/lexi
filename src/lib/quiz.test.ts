// The quiz engine is what makes every level testable, so its guarantees are
// worth pinning: a seed reproduces a quiz, an item never shows its own answer
// twice, and a thin corpus degrades rather than throws.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

describe('buildQuiz', () => {
  it('is reproducible from its seed, and different across seeds', () => {
    const a = buildQuiz({ level: 'A2', n: 6, seed: 42 }, { words: corpus });
    const b = buildQuiz({ level: 'A2', n: 6, seed: 42 }, { words: corpus });
    const c = buildQuiz({ level: 'A2', n: 6, seed: 7 }, { words: corpus });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('never repeats an item within one quiz', () => {
    const q = buildQuiz({ level: 'B2', n: 20, seed: 3 }, { words: corpus });
    expect(new Set(q.map((i) => i.id)).size).toBe(q.length);
  });

  it('puts the answer in the options, exactly once', () => {
    for (const i of buildQuiz({ level: 'B2', n: 20, seed: 5 }, { words: corpus })) {
      expect(i.options[i.answer], i.prompt).toBeTruthy();
      expect(new Set(i.options).size, i.prompt).toBe(i.options.length);
    }
  });

  it('gives every item an explanation — a wrong answer is a teaching moment', () => {
    for (const i of buildQuiz({ level: 'B2', n: 20, seed: 9 }, { words: corpus })) {
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

  it('blanks only the whole word — never a substring or an inflected form', () => {
    const words = [
      w({ id: 'r:1', term: 'der Rat', en: 'advice', gender: 'der',
        ex: [{ de: 'Der Ratgeber hilft.', en: 'The guide helps.', lvl: 'A2' }] }),
      w({ id: 'r:2', term: 'der Tisch', en: 'table', gender: 'der',
        ex: [{ de: 'Die Tische sind neu.', en: 'The tables are new.', lvl: 'A1' }] }),
      ...corpus.slice(2),
    ];
    const q = buildQuiz({ level: 'A2', n: 10, seed: 6, kinds: ['cloze'], ids: ['r:1', 'r:2'] }, { words });
    expect(q).toEqual([]);
  });

  it('asks gender with all three articles and the right one keyed', () => {
    const q = buildQuiz({ level: 'A1', n: 4, seed: 4, kinds: ['gender'] }, { words: corpus });
    for (const i of q) {
      // In the drills' order, every time — not shuffled.
      expect(i.options).toEqual(['der', 'die', 'das']);
      expect(i.why).toContain(i.options[i.answer]);
    }
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
    // Two cards carry an example, so a context quiz of ten is two items, not an error.
    expect(buildQuiz({ level: 'A1', n: 10, seed: 1, kinds: ['cloze'] }, { words: corpus }).length).toBeLessThanOrEqual(2);
  });

  it('mixes kinds rather than serving whichever was most abundant', () => {
    const q = buildQuiz({ level: 'B2', n: 8, seed: 11 }, { words: corpus });
    expect(new Set(q.map((i) => i.kind)).size).toBeGreaterThan(1);
  });
});

describe('a meaning item asks something', () => {
  const extra = [
    w({ id: 'n:1', term: 'Nigeria', en: 'Nigeria', gender: null }),
    w({ id: 's:1', term: 'anfangen', en: 'to start; to begin', pos: 'verb' }),
    w({ id: 's:2', term: 'beginnen', en: 'to start', pos: 'verb', syn: ['anfangen'] }),
    w({ id: 's:3', term: 'kochen', en: 'to cook', pos: 'verb' }),
    w({ id: 's:4', term: 'schlafen', en: 'to sleep', pos: 'verb' }),
    w({ id: 's:5', term: 'lesen', en: 'to read', pos: 'verb' }),
  ];
  const words = [...corpus, ...extra];

  it('skips a word spelled the same in both languages — Nigeria is "Nigeria"', () => {
    const q = buildQuiz({ level: 'B2', n: 10, seed: 1, kinds: ['de-en', 'en-de'], ids: ['n:1'] }, { words });
    expect(q).toEqual([]);
  });

  it('never offers a second right answer — two cards glossed "to start"', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const i of buildQuiz({ level: 'B2', n: 4, seed, kinds: ['de-en', 'en-de'], ids: ['s:1', 's:2'] }, { words })) {
        const wrong = i.options.filter((_, k) => k !== i.answer);
        expect(wrong, i.prompt).not.toContain(i.kind === 'en-de' ? (i.id === 's:1' ? 'beginnen' : 'anfangen') : 'to start');
      }
    }
  });

  it('offers wrong answers of the same part of speech while the band has them', () => {
    const verbGloss = new Set(words.filter((x) => x.pos === 'verb').map((x) => firstSense(x.en)));
    for (let seed = 1; seed <= 20; seed++) {
      for (const i of buildQuiz({ level: 'B2', n: 6, seed, kinds: ['de-en'], ids: ['v:1', 'v:2', 'v:4'] }, { words })) {
        // A noun's options are noun glosses: no verb among them to rule out.
        for (const o of i.options) expect(verbGloss.has(o), `${i.prompt}: ${o}`).toBe(false);
      }
    }
  });
});

// The corpus itself, swept the way ruling 7 sweeps the meaning drill (rulings.test.ts).
// This also guards the speed: until 2026-11-26 a quiz shuffled the whole band for each
// item and did not stop early for fewer than four kinds, and this sweep took minutes.
describe('generated from the real corpus', () => {
  const real: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
  it('cannot be beaten by the shape of the options, and never repeats the prompt', () => {
    let n = 0, chance = 0, longest = 0, shortest = 0, most = 0;
    const decisive = (v: number[], target: number, i: number) => v[i] === target && v.filter((x) => x === target).length === 1;
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const) {
      for (const p of PRESETS) {
        for (let seed = 1; seed <= 10; seed++) {
          for (const i of buildQuiz({ level, n: p.n, kinds: p.kinds, seed }, { words: real })) {
            if (i.kind !== 'de-en' && i.kind !== 'en-de') continue;
            n++;
            chance += 1 / i.options.length;
            const len = i.options.map((o) => o.length);
            if (decisive(len, Math.max(...len), i.answer)) longest++;
            if (decisive(len, Math.min(...len), i.answer)) shortest++;
            const wc = i.options.map((o) => o.split(/[\s,]+/).filter(Boolean).length);
            if (decisive(wc, Math.max(...wc), i.answer)) most++;
            const bare = (t: string) => t.replace(/^(der|die|das)\s+/i, '').toLowerCase();
            expect(i.options.map(bare), i.prompt).not.toContain(bare(i.prompt));
          }
        }
      }
    }
    expect(n).toBeGreaterThan(800);
    const base = chance / n;
    for (const hit of [longest, shortest, most]) expect(hit / n).toBeLessThanOrEqual(base + 0.03);
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
    const known = new Set(['de-en', 'en-de', 'gender', 'cloze']);
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
