// The six decisions, and the properties they produced.
//
// `docs/VISION.md` open decisions 5–10 were ruled on 2026-09-09. This file is what
// makes the rulings inspectable: not a feature's tests, but the properties the
// decisions turn on. If one fails, either the ruling has been walked back by
// accident or the ground it stood on has moved, and the write-up in VISION is out
// of date.
//
// It began the other way round — as the *premises* of six open questions — and
// three of those premises were already false when they were read. That is why the
// file exists at all: a question, and then a ruling, is only as good as the state
// of the app it was made about.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registerWords } from './data/index.ts';
import { primeFreq, freqRankOf } from './lib/freq.ts';
import { resetSurfaceIndex } from './lib/surface.ts';
import { meaningOptions, askablePlural, eligibleModes } from './views/drills.tsx';
import { whyLine } from './components/WhyThisCard.tsx';
import { firstRunIds } from './store.ts';
import type { Word } from './types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
registerWords(corpus);
resetSurfaceIndex();
primeFreq(JSON.parse(readFileSync('public/data/freq.json', 'utf8')));

const words = corpus.filter((w) => w.kind === 'word');
const byId = new Map(corpus.map((w) => [w.id, w]));
const bare = (t: string) => t.replace(/^(der|die|das)\s+/, '').replace(/^sich\s+/, '');

// ---- 5 · Ordered, not composed — and the ordering has to exist --------------
//
// Ruled: the syllabus stays deleted, so nothing picks a card. But a session must be
// able to ask the questions this app asks, and the ranking has to cover the words
// the ranking is for.
describe('5 — the first session', () => {
  const first = firstRunIds(10).map((id) => byId.get(id)!);

  it('opens on the commonest words in the language', () => {
    // `sein` is rank 4 and used to arrive 118th, behind `grillen` at 70.
    expect(first.map((w) => bare(w.term))).toContain('sein');
    // Every card in the opening session is ranked. Under the old projection seven
    // of these ten were not, and were ordered by position in the build.
    for (const w of first) expect(freqRankOf(w.id)).not.toBeNull();
  });

  it('can ask every question the scheduler has', () => {
    const nouns = first.filter((w) => w.gender);
    // Straight rank gave *no noun until position 22*, so both noun drills were dead
    // on day one. The reservation is a property of the session, not a card list.
    expect(nouns.length).toBeGreaterThanOrEqual(3);
    expect(nouns.filter((w) => askablePlural(w)).length).toBeGreaterThanOrEqual(2);
    expect(first.some((w) => eligibleModes(w).includes('gender'))).toBe(true);
    expect(first.some((w) => eligibleModes(w).includes('plural'))).toBe(true);
  });

  it('does not teach one gender three times', () => {
    // Rank alone reserved `das Ende` (25), `das Jahr` (43) and `das Geld` (55): a
    // first gender drill whose answer is always *das* teaches *das*.
    const genders = new Set(first.filter((w) => w.gender).map((w) => w.gender));
    expect(genders.size).toBeGreaterThanOrEqual(3);
  });

  it('returns the number of cards it was asked for', () => {
    // The reservation displaced the quota rather than the arrivals in its first
    // version, and handed back two cards when asked for three.
    expect(firstRunIds(10)).toHaveLength(10);
    expect(firstRunIds(3)).toHaveLength(3);
  });
});

describe('5 — the ranking now covers the words it exists for', () => {
  it('ranks most of the corpus, and most of A1', () => {
    const ranked = words.filter((w) => freqRankOf(w.id) != null).length;
    expect(ranked / words.length).toBeGreaterThan(0.75);
    const a1 = words.filter((w) => w.level === 'A1');
    expect(a1.filter((w) => freqRankOf(w.id) != null).length / a1.length).toBeGreaterThan(0.8);
  });

  it('ranks the commonest words in the language', () => {
    // Every one of these was unranked under the provenance-only projection, and
    // `byFrequency` sorts unranked cards last.
    const CORE = ['sein', 'haben', 'werden', 'können', 'müssen', 'sagen', 'machen',
      'geben', 'gehen', 'kommen', 'sehen', 'wissen', 'ich', 'nicht', 'Jahr', 'Zeit',
      'Mensch', 'Tag', 'Frau', 'Mann', 'Kind', 'groß', 'gut', 'neu'];
    const unranked = CORE.filter((t) =>
      !words.some((w) => bare(w.term) === t && freqRankOf(w.id) != null));
    expect(unranked).toEqual([]);
  });

  it('keeps a demonym behind the core, not ahead of it', () => {
    // `der Berliner` is 521st in a newswire count and is not a week-one word. The
    // provenance tail is offset past the reference rather than merged into it.
    const berliner = words.find((w) => w.term === 'der Berliner');
    const sein = words.find((w) => bare(w.term) === 'sein' && w.pos === 'verb');
    if (berliner && sein) {
      expect(freqRankOf(berliner.id)!).toBeGreaterThan(freqRankOf(sein.id)!);
      expect(freqRankOf(berliner.id)!).toBeGreaterThan(10_000);
    }
  });
});

// ---- 6 · A wrong answer is not explained -----------------------------------
//
// Ruled: no. This is the measurement the refusal rests on — the population is real
// and large, and half of it would be told something false.
describe('6 — why the decomposition is not offered', () => {
  const SEPARABLE = ['an', 'auf', 'aus', 'ab', 'bei', 'ein', 'mit', 'nach', 'vor',
    'zurück', 'weg', 'los', 'her', 'hin', 'fest', 'frei', 'statt', 'teil', 'zusammen', 'zu'];
  const INSEPARABLE = ['be', 'ver', 'er', 'ent', 'emp', 'ge', 'miss', 'zer'];

  const lemmas = new Map<string, Word>();
  for (const w of words) if (w.pos === 'verb') lemmas.set(bare(w.term).split(/[\s(]/)[0].toLowerCase(), w);

  const split = (list: string[]) => [...lemmas].filter(([lem, w]) => list.some((p) =>
    lem.startsWith(p) && lem.length > p.length + 2
    && lemmas.has(lem.slice(p.length)) && lemmas.get(lem.slice(p.length))!.id !== w.id));

  it('would be true on one half and false on the other', () => {
    // `anrufen` = an- + `rufen`, `aufstehen` = auf- + `stehen`: the decomposition
    // is the meaning.
    expect(split(SEPARABLE).length).toBeGreaterThan(150);
    // `bekommen` "to get" is not be- + `kommen` "to come"; `erzählen` "to tell" is
    // not er- + `zählen` "to count". A rule on the orthography fires on both.
    expect(split(INSEPARABLE).length).toBeGreaterThan(150);
  });
});

// ---- 7 · Distractors stay as they are --------------------------------------
//
// Ruled: no change. The objection was that a four-option question is free. It is
// not, and this is the sweep that says so.
describe('7 — the meaning drill is not answerable without German', () => {
  it('cannot be beaten by the shape of the options', () => {
    // Every third card: the rules break systemically or not at all, and this
    // sweep is the expensive one in the suite.
    const sample = words.filter((_, i) => i % 3 === 0);
    let n = 0, chance = 0, longest = 0, shortest = 0, mostWords = 0;
    for (const w of sample) {
      const mc = meaningOptions(w);
      if (mc.options.length < 2) continue;
      n++;
      chance += 1 / mc.options.length;
      // A strategy scores only when it is *decisive* — a unique extremum. Ties
      // give the guesser nothing, and counting them would flatter the attack.
      const decisive = (v: number[], pick: (x: number[]) => number) => {
        const target = pick(v);
        return v[mc.correct] === target && v.filter((x) => x === target).length === 1;
      };
      const len = mc.options.map((o) => o.length);
      if (decisive(len, (x) => Math.max(...x))) longest++;
      if (decisive(len, (x) => Math.min(...x))) shortest++;
      const wc = mc.options.map((o) => o.split(/[\s,]+/).filter(Boolean).length);
      if (decisive(wc, (x) => Math.max(...x))) mostWords++;
    }
    expect(n).toBeGreaterThan(1000);
    const base = chance / n;
    for (const hit of [longest, shortest, mostWords]) {
      expect(hit / n).toBeLessThanOrEqual(base + 0.01);
    }
  });
});

// ---- 9 · A signal the scheduler acts on is a signal it names ---------------
//
// Ruled: yes. Dwell keeps ranking fresh picks and still never grades — and now the
// learner is told, which is the only thing that makes the inference falsifiable by
// the person who knows whether it is true.
describe('9 — the scheduler says why an unseen word is here', () => {
  it('names the two reasons that are about the learner', () => {
    expect(whyLine({ kind: 'fresh', via: 'saved' })?.lead).toMatch(/saved/i);
    expect(whyLine({ kind: 'fresh', via: 'dwell' })?.lead).toMatch(/stopping/i);
  });

  it('stays silent when the only reason is the learner’s level', () => {
    // A weakest-sector pick has nothing to add: "your level and this sector" is not
    // a fact about the learner, and a caption on every card is wallpaper.
    expect(whyLine({ kind: 'fresh' })).toBeNull();
  });

  it('reports the dwell as an observation, never as knowledge', () => {
    const line = whyLine({ kind: 'fresh', via: 'dwell' })!;
    const said = `${line.lead}${line.em ?? ''}${line.tail ?? ''}`.toLowerCase();
    for (const overclaim of ['know', 'want', 'interested', 'because you like']) {
      expect(said).not.toContain(overclaim);
    }
  });
});
