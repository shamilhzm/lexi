// Guards the shipped corpus against the failure mode that let the UI advertise
// "99 points · 571 exercises" long after the bank had grown to 128/774: numbers
// written into copy by hand, never re-checked. GRAMMAR_COUNTS is the one place
// those figures live, and this test pins it to the file the app actually fetches.
//
// It also asserts the teaching text is complete, because the Grammar surface
// renders `summary` and `rule` for every point — a point missing either would
// render as a blank explanation rather than throw.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { grammarCounts, GRAMMAR_COUNTS, flatten, findPoint, parsePointId, type GrammarByLevel } from './grammar.ts';
import { MODE_REMEDY, MODE_TAG, modeRulePoint, type Mode } from '../views/Fundamentals.tsx';
import { ALL_LEVELS, type CEFR } from '../types.ts';

const g: GrammarByLevel = JSON.parse(readFileSync('public/data/grammar.json', 'utf8'));

describe('grammar bank', () => {
  it('matches the counts the UI advertises', () => {
    expect(grammarCounts(g)).toEqual({ points: GRAMMAR_COUNTS.points, exercises: GRAMMAR_COUNTS.exercises });
  });

  it('carries every CEFR level', () => {
    for (const level of ALL_LEVELS) expect(g[level], `missing level ${level}`).toBeDefined();
  });

  it('gives every point a title, an English summary and a rule', () => {
    for (const level of Object.keys(g) as CEFR[]) {
      for (const p of g[level]) {
        expect(p.title?.trim(), `${level} point without a title`).toBeTruthy();
        expect(p.summary?.trim(), `${level} · ${p.title} has no summary`).toBeTruthy();
        expect(p.rule?.trim(), `${level} · ${p.title} has no rule`).toBeTruthy();
        expect(p.exercises.length, `${level} · ${p.title} has no exercises`).toBeGreaterThan(0);
      }
    }
  });

  it('gives every exercise an explanation to show after answering', () => {
    for (const level of Object.keys(g) as CEFR[]) {
      for (const p of g[level]) {
        for (const ex of p.exercises) {
          expect(ex.explain?.trim(), `${level} · ${p.title} · "${ex.prompt}" has no explain`).toBeTruthy();
        }
      }
    }
  });

  it('flattens to one uniquely-identified item per exercise', () => {
    const items = flatten(g, new Set(ALL_LEVELS));
    expect(items.length).toBe(GRAMMAR_COUNTS.exercises);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
});

describe('point ids', () => {
  it('parses gram: ids whose titles contain colons', () => {
    expect(parsePointId('gram:B1:Konzessivsätze: obwohl'))
      .toEqual({ level: 'B1', title: 'Konzessivsätze: obwohl' });
    expect(parsePointId('gram:A1:Artikel & Genus'))
      .toEqual({ level: 'A1', title: 'Artikel & Genus' });
  });

  it('rejects ids that are not grammar points', () => {
    expect(parsePointId('voc:A1:der Name')).toBeNull();
    expect(parsePointId('gex:A1:0:0')).toBeNull();
    expect(parsePointId('gram:A1')).toBeNull();
  });
});

describe('MODE_REMEDY', () => {
  // Two consumers depend on these ids resolving: session.ts picks the first
  // unseen/due candidate for remediation, and the drills show [0] as the rule
  // behind a wrong answer. A typo here fails silently — the rule link just
  // never renders — so pin it.
  const modes = Object.keys(MODE_TAG) as Mode[];

  it('covers every drill mode', () => {
    for (const m of modes) expect(MODE_REMEDY[m], `no entry for ${m}`).toBeDefined();
  });

  it('points at grammar points that actually exist in the bank', () => {
    for (const m of modes) {
      for (const id of MODE_REMEDY[m]) {
        const parsed = parsePointId(id);
        expect(parsed, `${m}: unparseable id ${id}`).not.toBeNull();
        const hit = findPoint(g, parsed!.level, parsed!.title);
        expect(hit, `${m}: ${id} has no authored point`).not.toBeNull();
        expect(hit!.point.rule?.trim(), `${m}: ${id} has an empty rule`).toBeTruthy();
      }
    }
  });

  it('gives every mode but cloze a rule to show on a miss', () => {
    for (const m of modes) {
      const id = modeRulePoint(m);
      if (m === 'cloze') { expect(id).toBeNull(); continue; }
      expect(id, `${m} has no rule point`).toBeTruthy();
    }
  });
});
