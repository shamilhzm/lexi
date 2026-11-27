// Wortbau: every compound the feed builds is checked against the shipped cards, the
// way the about page's are, because a wrong reading teaches a wrong word. And the
// slot that shows them never grades.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { CEFR, Word } from '../types.ts';
import type { Status } from '../store.ts';
import {
  WORTBAU, bareTerm, joinOf, sensesOf, meaningOf, resolveWortbau, rankWortbau, siblingsOf, readingOf,
} from './wortbau.ts';

const V: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8')).filter((w: Word) => w.kind !== 'grammar');
const byTerm = new Map<string, Word>();
for (const w of V) if (!byTerm.has(w.term)) byTerm.set(w.term, w);
const card = (t: string) => byTerm.get(t);
const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

describe('every row, against the cards', () => {
  it.each(WORTBAU.map((r) => [r.whole, r] as const))('%s', (_, r) => {
    const whole = card(r.whole);
    expect(whole, `${r.whole} is a card`).toBeDefined();
    expect(whole!.pos).toBe('noun');
    // The segments spell the word, capital and all.
    expect(r.parts.map((p) => p[0]).join('')).toBe(bareTerm(whole!.term));
    for (const [seg, term, sense] of r.parts) {
      const c = card(term);
      expect(c, `${term} is a card`).toBeDefined();
      expect(joinOf(seg, c!), `"${seg}" is a form of ${term}`).not.toBeNull();
      expect(sensesOf(c!.en), `"${sense}" is one of ${term}'s own senses (${c!.en})`).toContain(sense);
    }
    // The head is written as itself, is a noun, and gives the whole its article.
    const head = card(r.parts[1][1])!;
    expect(head.pos).toBe('noun');
    expect(joinOf(r.parts[1][0], head)).toEqual({ kind: 'same' });
    expect(head.gender, 'the last part picks the article').toBe(whole!.gender);
  });

  it('lists no compound twice, and resolves every row', () => {
    expect(new Set(WORTBAU.map((r) => r.whole)).size).toBe(WORTBAU.length);
    expect(resolveWortbau(card).length).toBe(WORTBAU.length);
  });

  it('drops a row whose card has gone rather than show it wrong', () => {
    const rows = [{ whole: 'der Handschuh', parts: [['Hand', 'die Hand', 'hand'], ['schuh', 'der Schuhgone', 'shoe']] as const }];
    expect(resolveWortbau(card, rows)).toEqual([]);
  });
});

describe('joinOf', () => {
  const c = (term: string) => card(term)!;
  it('names what the part did on its way in', () => {
    expect(joinOf('Hand', c('die Hand'))).toEqual({ kind: 'same' });
    expect(joinOf('Kranken', c('krank'))).toEqual({ kind: 'glue', glue: 'en' });
    expect(joinOf('Jahres', c('das Jahr'))).toEqual({ kind: 'glue', glue: 'es' });
    expect(joinOf('Straßen', c('die Straße'))).toEqual({ kind: 'glue', glue: 'n' });
    expect(joinOf('Kinder', c('das Kind'))).toEqual({ kind: 'plural' });
    expect(joinOf('Wörter', c('das Wort'))).toEqual({ kind: 'plural' });
    expect(joinOf('Erd', c('die Erde'))).toEqual({ kind: 'elided' });
    expect(joinOf('Fahr', c('fahren'))).toEqual({ kind: 'stem' });
    expect(joinOf('Lange', c('lang'))).toEqual({ kind: 'glue', glue: 'e' });
  });
  it('refuses a segment that is not a form of the card', () => {
    expect(joinOf('Hand', c('der Schuh'))).toBeNull();
    expect(joinOf('Fahrt', c('fahren'))).toBeNull();
    // A verb takes no linking letters in this list, so *Spiels* is not *spielen*.
    expect(joinOf('Spiels', c('spielen'))).toBeNull();
  });
});

describe('the equation', () => {
  const b = (whole: string) => resolveWortbau(card).find((x) => x.item.whole === whole)!;
  it('reads the parts and closes on the first sense', () => {
    expect(readingOf(b('der Handschuh'))).toBe('hand + shoe');
    expect(meaningOf(b('der Handschuh').whole)).toBe('glove');
    expect(meaningOf(b('die Hochschule').whole)).toBe('university');
  });
  it('never closes on the German word itself', () => {
    expect(meaningOf(b('der Zeitgeist').whole)).toBe('spirit of the age');
  });
});

describe('the order', () => {
  const all = resolveWortbau(card);
  const opts = (status: Record<string, Status>, scope: CEFR[] = [], seed = '2026-11-27') => ({
    status: (id: string) => status[id] ?? 'new', inScope: (l: CEFR) => scope.length === 0 || scope.includes(l), seed, levels: LEVELS,
  });
  const id = (t: string) => card(t)!.id;

  it('leaves out a compound the learner knows: no gap is left', () => {
    const ranked = rankWortbau(all, opts({ [id('der Handschuh')]: 'known' }));
    expect(ranked.some((b) => b.item.whole === 'der Handschuh')).toBe(false);
    expect(ranked.length).toBe(all.length - 1);
  });
  it('puts the compounds whose halves the learner has met first', () => {
    const ranked = rankWortbau(all, opts({ [id('die Hand')]: 'known', [id('der Schuh')]: 'learning' }));
    expect(ranked[0].item.whole).toBe('der Handschuh');
  });
  it('prefers the level filter, then the easier word', () => {
    const ranked = rankWortbau(all, opts({}, ['B1']));
    const firstOut = ranked.findIndex((b) => b.whole.level !== 'B1');
    expect(firstOut).toBeGreaterThan(0);
    expect(ranked.slice(0, firstOut).every((b) => b.whole.level === 'B1')).toBe(true);
    const rest = ranked.slice(firstOut).map((b) => LEVELS.indexOf(b.whole.level));
    expect(rest).toEqual([...rest].sort((x, y) => x - y));
  });
  it('holds still for a day and changes the next', () => {
    const a = rankWortbau(all, opts({})).map((b) => b.item.whole);
    expect(rankWortbau(all, opts({})).map((b) => b.item.whole)).toEqual(a);
    expect(rankWortbau(all, opts({}, [], '2026-11-28')).map((b) => b.item.whole)).not.toEqual(a);
  });
});

describe('siblings', () => {
  const all = resolveWortbau(card);
  const of = (whole: string) => siblingsOf(all.find((b) => b.item.whole === whole)!, all);
  it('shows the same last part first', () => {
    const s = of('das Flugzeug')!;
    expect(s.via.term).toBe('das Zeug');
    expect(s.list.map((b) => b.item.whole)).toEqual(['das Spielzeug', 'das Werkzeug', 'das Fahrzeug']);
  });
  it('then the same first part, and never a mix of the two', () => {
    const s = of('der Flughafen')!;
    expect(s.via.term).toBe('der Flug');
    expect(s.list.map((b) => b.item.whole)).toEqual(['das Flugzeug']);
    for (const b of all) {
      const t = siblingsOf(b, all);
      if (t) for (const x of t.list) expect(x.item.parts.some((p) => p[1] === t.via.term), `${b.item.whole} → ${x.item.whole}`).toBe(true);
    }
  });
});

describe('the slot never grades', () => {
  const src = readFileSync('src/components/WortbauSlot.tsx', 'utf8');
  it('reads the store for status and writes only the bookmark', () => {
    const fromStore = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[./]*store\.ts'/g)]
      .flatMap((m) => m[1].split(',').map((s) => s.trim()).filter(Boolean)).sort();
    expect(fromStore).toEqual(['isSaved', 'levels', 'statusOf', 'toggleSaved']);
  });
  it('is invisible to the dwell observer', () => {
    expect(src).not.toMatch(/data-word\s*=/);
  });
});
