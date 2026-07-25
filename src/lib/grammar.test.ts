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
import { grammarCounts, GRAMMAR_COUNTS, flatten, type GrammarByLevel } from './grammar.ts';
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
