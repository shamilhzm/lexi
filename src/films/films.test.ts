// The course and its films, held to the corpus.
//
// A film writes its explanation by hand and takes every fact from the data — a
// card's article, its examples, how the corpus genders an ending. This file is
// what makes that true rather than intended: if a card is renamed, an example
// rewritten or a batch of nouns shifts a pattern, a film that would now say
// something false fails here instead of on a learner's screen.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { registerWords } from '../data/index.ts';
import { primeFreq, ranksOrThrow } from '../lib/freq.ts';
import { COURSE, PRELUDES, UNIT_SIZE, unitsFor, unitCards, cardByTerm, leadTerms } from '../data/course.ts';
import { FILMS, FILM_BY_ID } from './films.ts';
import { countEnding } from './measure.ts';
import { splitMarks, pluralShape, markSpans } from '../components/film/FilmPlayer.tsx';
import type { TransferData } from '../lib/transfer.ts';
import { falseFriend } from '../lib/falseFriends.ts';
import { ALL_LEVELS, type Word } from '../types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const sectors: { name: string }[] = JSON.parse(readFileSync('public/data/sectors.json', 'utf8'));
const transfer: TransferData = JSON.parse(readFileSync('public/data/transfer.json', 'utf8'));
beforeAll(() => {
  // As the app loads it: grammar cards never enter the lexicon (data/index.ts).
  registerWords(corpus.filter((w) => w.kind !== 'grammar'));
  primeFreq(ranksOrThrow(JSON.parse(readFileSync('public/data/freq.json', 'utf8')), corpus));
});

const bare = (t: string) => t.replace(/^(der|die|das)\s+/i, '');
const card = (t: string) => cardByTerm(t)!;

describe('the course plan', () => {
  it('has eight units a level, twelve at C1, with unique ids', () => {
    const ids = COURSE.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of ALL_LEVELS) {
      expect(COURSE.filter((u) => u.level === l)).toHaveLength(l === 'C1' ? 12 : 8);
    }
  });

  it('names only sectors that exist', () => {
    const known = new Set(sectors.map((s) => s.name));
    const missing = COURSE.flatMap((u) => u.sectors.filter((s) => !known.has(s)).map((s) => `${u.id}: ${s}`));
    expect(missing).toEqual([]);
  });

  it('gives every unit a session’s worth of its own level’s words', () => {
    const thin = COURSE.map((u) => [u.id, unitCards(u).length] as const).filter(([, n]) => n < 16);
    expect(thin).toEqual([]);
    for (const u of COURSE) expect(unitCards(u).length).toBeLessThanOrEqual(UNIT_SIZE + 12);
  });

  it('names only cards that exist', () => {
    const missing = COURSE.flatMap((u) => (u.terms ?? []).filter((t) => !cardByTerm(t)).map((t) => `${u.id}: ${t}`));
    expect(missing).toEqual([]);
  });

  it('teaches no card in two units, unless a unit names it', () => {
    // Sectors overlap, and drawn independently *Argumentieren* and *Karriere*
    // opened on the same three words. A card a unit (or its film) names is that
    // unit's to repeat; every other card belongs to one unit only.
    const cards = new Map(COURSE.map((u) => [u.id, new Set(unitCards(u).map((w) => w.id))]));
    const lead = new Map(COURSE.map((u) => [u.id, new Set(leadTerms(u).map((t) => card(t).id))]));
    const dupes: string[] = [];
    for (const u of COURSE) for (const w of unitCards(u)) {
      if (lead.get(u.id)!.has(w.id)) continue;
      for (const v of COURSE) {
        if (v !== u && cards.get(v.id)!.has(w.id) && !lead.get(v.id)!.has(w.id)) dupes.push(`${w.term}: ${u.id} & ${v.id}`);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('does not teach a film’s scaffolding', () => {
    // The FVG film sets *fragen* beside *eine Frage stellen*; reserving every film
    // card for its unit put A1 verbs into a C1 session. A card two or more levels
    // below a unit is there only if the unit names it outright (the particles).
    const named = (u: (typeof COURSE)[number]) => new Set((u.terms ?? []).map((t) => card(t).id));
    const low: string[] = [];
    for (const u of COURSE) {
      const lowest = Math.min(...(u.levels ?? [u.level]).map((l) => ALL_LEVELS.indexOf(l)));
      for (const w of unitCards(u)) {
        if (lowest - ALL_LEVELS.indexOf(w.level) >= 2 && !named(u).has(w.id)) low.push(`${u.id}: ${w.term} (${w.level})`);
      }
    }
    expect(low).toEqual([]);
  });

  it('points every film at one unit or one level’s prelude, and every film named exists', () => {
    const preludes = Object.values(PRELUDES).map((p) => p!.film);
    for (const u of COURSE) if (u.film) expect(FILM_BY_ID.has(u.film), u.id).toBe(true);
    for (const id of preludes) expect(FILM_BY_ID.has(id), id).toBe(true);
    for (const f of FILMS) expect(COURSE.filter((u) => u.film === f.id).length + preludes.filter((p) => p === f.id).length, f.id).toBe(1);
    // Every level has films; no level is a list of words with nothing explained.
    for (const l of ALL_LEVELS) expect(COURSE.some((u) => u.level === l && u.film), l).toBe(true);
  });
});

describe('C1 — the hybrid', () => {
  const c1 = COURSE.filter((u) => u.level === 'C1');

  it('balances the two tracks over a shared core', () => {
    const n = (s: string) => c1.filter((u) => u.strand === s).length;
    expect(n('beruf')).toBe(n('hochschule'));
    expect(n('kern')).toBeGreaterThanOrEqual(3);
    expect(c1.every((u) => u.strand)).toBe(true);
    // A bridge teaches one skill in both settings, so it belongs to neither track.
    for (const u of c1.filter((x) => x.bridge)) expect(u.strand).toBe('kern');
  });

  it('interleaves them: never two units of one track in a row', () => {
    const tracks = c1.map((u) => u.strand).filter((s) => s !== 'kern');
    for (let i = 1; i < tracks.length; i++) expect(tracks[i], `position ${i}`).not.toBe(tracks[i - 1]);
  });

  it('integrates both settings into one line, with nothing to choose', () => {
    // The owner's ruling (2026-11-19): no Beruf/Hochschule switch. Every C1 unit
    // is on every learner's line, in one order.
    expect(unitsFor('C1')).toHaveLength(12);
    expect(unitsFor('C1').map((u) => u.id)).toEqual(c1.map((u) => u.id));
    const src = readFileSync('src/views/Kurs.tsx', 'utf8');
    expect(src).not.toMatch(/radiogroup|courseLean|LeanPicker/);
  });
});

describe('every film', () => {
  it.each(FILMS.map((f) => [f.id, f] as const))('%s opens, closes and stays short', (_, f) => {
    expect(f.beats[0].kind).toBe('title');
    expect(f.beats[f.beats.length - 1].kind).toBe('outro');
    expect(f.beats.length).toBeGreaterThanOrEqual(5);
    expect(f.beats.length).toBeLessThanOrEqual(10);
    expect(f.minutes).toBeGreaterThanOrEqual(1);
  });

  it('names only cards that exist', () => {
    const missing: string[] = [];
    for (const f of FILMS) for (const b of f.beats) {
      const named: string[] = [];
      if (b.kind === 'words') named.push(...b.terms);
      if (b.kind === 'gender' || b.kind === 'example' || b.kind === 'trap') named.push(b.term);
      if (b.kind === 'plural') named.push(...b.terms);
      if (b.kind === 'compound') named.push(...b.parts, b.whole);
      if (b.kind === 'scale') for (const s of b.steps) if (s.term) named.push(s.term);
      if (b.kind === 'shift') named.push(...b.terms);
      for (const t of named) if (!cardByTerm(t)) missing.push(`${f.id}: ${t}`);
    }
    expect(missing).toEqual([]);
  });

  it('asks the article only of nouns that have one', () => {
    for (const f of FILMS) for (const b of f.beats) {
      if (b.kind === 'gender') expect(card(b.term).gender, `${f.id}: ${b.term}`).toMatch(/^(der|die|das)$/);
    }
  });

  it('shows plurals the corpus has, and traps the app lists', () => {
    for (const f of FILMS) for (const b of f.beats) {
      if (b.kind === 'plural') for (const t of b.terms) expect(card(t).plural, `${f.id}: ${t}`).toMatch(/^die \S/);
      if (b.kind === 'trap') expect(falseFriend(b.term), `${f.id}: ${b.term}`).not.toBeNull();
    }
  });

  it('claims a pattern only where the corpus keeps it', () => {
    for (const f of FILMS) for (const b of f.beats) {
      if (b.kind !== 'pattern') continue;
      for (const e of b.endings) {
        const c = countEnding(e);
        const share = c[b.claim] / c.total;
        // Enough nouns that the count means something, and a majority big enough
        // that "this ending is <claim>" is the honest summary of it.
        expect(c.total, `${f.id}: -${e}`).toBeGreaterThanOrEqual(15);
        expect(c.majority, `${f.id}: -${e}`).toBe(b.claim);
        expect(share, `${f.id}: -${e} is ${b.claim} ${c[b.claim]}/${c.total}`).toBeGreaterThanOrEqual(0.85);
      }
    }
  });

  it('builds compounds that are what they say they are', () => {
    for (const f of FILMS) for (const b of f.beats) {
      if (b.kind !== 'compound') continue;
      const [head, ...rest] = b.parts.map(bare);
      const built = (head + (b.glue ?? '') + rest.join('')).toLowerCase();
      expect(bare(b.whole).toLowerCase(), f.id).toBe(built);
      // The article comes from the last part — the beat's whole point.
      const last = card(b.parts[b.parts.length - 1]);
      if (last.gender) expect(card(b.whole).gender, `${f.id}: ${b.whole}`).toBe(last.gender);
    }
  });

  it('shows a sound shift only on pairs transfer.json ships for it, marked on both sides', () => {
    for (const f of FILMS) for (const b of f.beats) {
      if (b.kind !== 'shift') continue;
      const r = transfer.rules[b.rule];
      expect(r, `${f.id}: no rule ${b.rule} (run corpus:transfer -- --write)`).toBeDefined();
      expect(b.terms.length, f.id).toBeGreaterThanOrEqual(3);
      for (const t of b.terms) {
        const row = transfer.words[t];
        expect(row?.[2], `${f.id}: ${t} does not carry ${b.rule}`).toBe(b.rule);
        const en = row![1] as string;
        expect(markSpans(bare(t), r.mark[0], 'gi').some((p) => p.on), `${f.id}: nothing to mark in ${t}`).toBe(true);
        expect(markSpans(en, r.mark[1]).some((p) => p.on), `${f.id}: nothing to mark in ${en}`).toBe(true);
      }
    }
  });

  it('says only what transfer.json holds in the prelude’s guess', () => {
    // The reveal is written by hand; these are the pairs it names.
    expect(transfer.words['machen']?.[2]).toBe('ch-k');
    expect(transfer.words['das Buch']?.slice(1)).toEqual(['book', 'ch-k']);
  });

  it('quotes example sentences the cards really have', () => {
    for (const f of FILMS) for (const b of f.beats) {
      if (b.kind !== 'example') continue;
      const ex = (card(b.term).ex ?? []).find((e) => e.de.includes(b.match));
      expect(ex, `${f.id}: ${b.term} has no example with “${b.match}”`).toBeTruthy();
      for (const m of b.mark) expect(ex!.de, `${f.id}: mark “${m}”`).toContain(m);
    }
  });

  it('keeps its interactive beats answerable', () => {
    for (const f of FILMS) for (const b of f.beats) {
      if (b.kind === 'choice') {
        expect(b.options.length, f.id).toBeGreaterThanOrEqual(2);
        expect(new Set(b.options).size, f.id).toBe(b.options.length);
        expect(b.answer, f.id).toBeGreaterThanOrEqual(0);
        expect(b.answer, f.id).toBeLessThan(b.options.length);
      }
      if (b.kind === 'order') for (const r of b.rows) expect(b.slot, f.id).toBeLessThan(r.length);
      if (b.kind === 'bracket') {
        expect(b.from, f.id).toBeLessThan(b.to);
        expect(b.to, f.id).toBeLessThan(b.tokens.length);
      }
      if (b.kind === 'move') {
        // Tokens glide by identity, so a sentence may not repeat one.
        const norm = (t: string) => t.toLowerCase().replace(/[.,!?]/g, '');
        expect(new Set(b.from.map(norm)).size, f.id).toBe(b.from.length);
        expect(new Set(b.to.map(norm)).size, f.id).toBe(b.to.length);
      }
      if (b.kind === 'chart') for (const x of b.bars) expect(x.value, f.id).toBeGreaterThan(0);
      if (b.kind === 'scale') expect(b.steps.length, f.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('teaches its cards first in its unit’s session', () => {
    for (const u of COURSE) {
      const f = u.film ? FILM_BY_ID.get(u.film) : undefined;
      if (!f) continue;
      const ids = unitCards(u).map((w) => w.id);
      for (const t of leadTerms(u)) expect(ids, `${u.id}: ${t}`).toContain(card(t).id);
    }
  });
});

describe('a film never grades', () => {
  it('imports nothing from the store but the seen-mark', () => {
    // The ruling, as a property of the source: a guess in a film is a prediction,
    // and only an Üben session writes a schedule.
    const src = readFileSync('src/components/film/FilmPlayer.tsx', 'utf8');
    const fromStore = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[./]*store\.ts'/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()).filter(Boolean));
    expect(fromStore).toEqual(['markFilmSeen']);
  });
});

describe('pluralShape', () => {
  it('finds the umlaut and the ending', () => {
    expect(pluralShape('der Mann', 'die Männer')).toEqual({ umlaut: [1], ending: 'er' });
    expect(pluralShape('die Stadt', 'die Städte')).toEqual({ umlaut: [2], ending: 'e' });
    expect(pluralShape('der Lehrer', 'die Lehrer')).toEqual({ umlaut: [], ending: '' });
    expect(pluralShape('das Auto', 'die Autos')).toEqual({ umlaut: [], ending: 's' });
    expect(pluralShape('das Museum', 'die Museen')).toBeNull();
  });
});

describe('splitMarks', () => {
  it('lights the marked spans and leaves the rest', () => {
    expect(splitMarks('Das Gesetz tritt in Kraft.', ['tritt', 'in Kraft'])).toEqual([
      { t: 'Das Gesetz ', on: false }, { t: 'tritt', on: true }, { t: ' ', on: false },
      { t: 'in Kraft', on: true }, { t: '.', on: false },
    ]);
    expect(splitMarks('nichts', ['fehlt'])).toEqual([{ t: 'nichts', on: false }]);
  });
});
