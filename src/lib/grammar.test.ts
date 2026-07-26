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
import {
  grammarCounts, GRAMMAR_COUNTS, flatten, findPoint, parsePointId, MAX_UNSECTIONED_RULE,
  type GrammarByLevel,
} from './grammar.ts';
import {
  MODE_REMEDY, MODE_TAG, modeRulePoint, TENSE_POINT, CASE_POINT, buildTransform, transformHints,
  wholeWordRe, type Mode,
} from '../views/Fundamentals.tsx';
import { conjugate } from './conjugate.ts';
import { ALL_LEVELS, type CEFR } from '../types.ts';

const g: GrammarByLevel = JSON.parse(readFileSync('public/data/grammar.json', 'utf8'));

/** Assert a `gram:<level>:<title>` id resolves to an authored point that has
 *  teaching text behind it. A typo here fails *silently* — RuleToggle renders a
 *  plain label and the rule simply never opens — which is how the transform drill
 *  shipped pointing at the wrong tense. */
function expectResolves(id: string, where: string) {
  const parsed = parsePointId(id);
  expect(parsed, `${where}: unparseable id ${id}`).not.toBeNull();
  const hit = findPoint(g, parsed!.level, parsed!.title);
  expect(hit, `${where}: ${id} has no authored point`).not.toBeNull();
  expect(hit!.point.rule?.trim(), `${where}: ${id} has an empty rule`).toBeTruthy();
}

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

  // 127 of 128 rules shipped as one unbroken paragraph, up to 547 characters, on a
  // surface that is mostly read on a phone — and RuleCard had been rendering
  // `whitespace-pre-line` all along, waiting for newlines the data never had.
  it('sections every rule too long to read as a paragraph', () => {
    const offenders = (Object.keys(g) as CEFR[]).flatMap((level) =>
      g[level]
        .filter((p) => !p.sections?.length && p.rule.length > MAX_UNSECTIONED_RULE)
        .map((p) => `${level} · ${p.title} (${p.rule.length} chars)`));
    expect(offenders, 'author sections via scripts/corpus/grammar-sections.ts').toEqual([]);
  });

  it('keeps every section renderable', () => {
    for (const level of Object.keys(g) as CEFR[]) {
      for (const p of g[level]) {
        for (const s of p.sections ?? []) {
          const where = `${level} · ${p.title}`;
          // An empty block would render as a stray hairline with nothing under it.
          expect(
            Boolean(s.label || s.body || s.pairs?.length || s.examples?.length),
            `${where} has an empty section`,
          ).toBe(true);
          for (const pair of s.pairs ?? []) {
            expect(pair.from?.trim(), `${where} pair without a left side`).toBeTruthy();
            expect(pair.to?.trim(), `${where} pair without a right side`).toBeTruthy();
          }
          for (const ex of s.examples ?? []) {
            expect(ex.de?.trim(), `${where} example without German`).toBeTruthy();
          }
        }
      }
    }
  });

  it('keeps the prose rule as the fallback on every sectioned point', () => {
    // `sections` is additive: it must never be the *only* copy of a rule, so the
    // renderer can fall back and the text stays greppable and screen-readable.
    for (const level of Object.keys(g) as CEFR[]) {
      for (const p of g[level]) {
        if (p.sections?.length) expect(p.rule?.trim(), `${level} · ${p.title}`).toBeTruthy();
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
    for (const m of modes) for (const id of MODE_REMEDY[m]) expectResolves(id, m);
  });

  it('gives every mode but cloze a rule to show on a miss', () => {
    for (const m of modes) {
      const id = modeRulePoint(m);
      if (m === 'cloze') { expect(id).toBeNull(); continue; }
      expect(id, `${m} has no rule point`).toBeTruthy();
    }
  });
});

// The bug these pin: `modeRulePoint(mode)` returns MODE_REMEDY[mode][0], a single
// static entry per *mode* — but the transform, conjugation and Kasus drills each
// pick their grammatical target at random per card. A prompt reading „du musst“ →
// Futur I opened the *Perfekt* rule, and was only ever right by luck.
describe('per-target rule lookup', () => {
  it('maps every tense to an authored point', () => {
    for (const [key, id] of Object.entries(TENSE_POINT)) expectResolves(id, `TENSE_POINT.${key}`);
  });

  it('maps every case to an authored point', () => {
    for (const [key, id] of Object.entries(CASE_POINT)) expectResolves(id, `CASE_POINT.${key}`);
  });

  it('sends each tense to its own point, not one shared default', () => {
    // pp deliberately shares Perfekt (it is only drilled as that tense's second
    // half). Every other tense must be distinct, or the bug is back.
    const distinct = new Set(Object.entries(TENSE_POINT).filter(([k]) => k !== 'pp').map(([, id]) => id));
    expect(distinct.size).toBe(Object.keys(TENSE_POINT).length - 1);
  });

  it('resolves Futur I to the Futur I rule, not Perfekt', () => {
    // The exact card from the bug report.
    const t = buildTransform('müssen', 1, 'futur1', 'Futur I');
    expect(t.prompt).toBe('„du musst“ → Futur I');
    expect(t.accept[0]).toBe('du wirst müssen');
    expect(t.targetKey).toBe('futur1');
    expect(parsePointId(TENSE_POINT[t.targetKey])).toEqual({ level: 'B1', title: 'Futur I' });
    expect(TENSE_POINT[t.targetKey]).not.toBe(modeRulePoint('transform'));
  });
});

// A drill used to answer a miss with "Answer: du wirst müssen" and nothing else —
// what, never why — while conjugate() had every form it needed sitting unused.
describe('the transform reveal', () => {
  it('breaks a compound tense into its formula', () => {
    const r = buildTransform('müssen', 1, 'futur1', 'Futur I').reveal;
    expect(r.derivation).toEqual(['wirst', 'müssen']);
    expect(r.note).toBe('The infinitive goes to the end.');
  });

  it('names the Partizip II for the Perfekt rather than the infinitive', () => {
    expect(buildTransform('machen', 0, 'perfekt', 'Perfekt').reveal.note)
      .toBe('The Partizip II goes to the end.');
  });

  it('shows no formula for a one-word tense', () => {
    // Präteritum is synthetic, and so is müssen's Konjunktiv II (müsste).
    expect(buildTransform('machen', 0, 'praeteritum', 'Präteritum').reveal.derivation).toBeUndefined();
    expect(buildTransform('müssen', 0, 'konjunktiv2', 'Konjunktiv II').reveal.derivation).toBeUndefined();
  });

  it('carries all six persons of the target tense', () => {
    const p = buildTransform('gehen', 0, 'praeteritum', 'Präteritum').reveal.paradigm;
    expect(p.label).toBe('Präteritum · all persons');
    expect(p.rows).toEqual([
      ['ich', 'ging'], ['du', 'gingst'], ['er', 'ging'],
      ['wir', 'gingen'], ['ihr', 'gingt'], ['sie', 'gingen'],
    ]);
  });
});

describe('transformHints', () => {
  const rungs = (verb: string, pIdx: number, key: 'praeteritum' | 'perfekt' | 'futur1' | 'konjunktiv2') =>
    transformHints(conjugate(verb), pIdx, key);

  it('gives three rungs for every target', () => {
    for (const key of ['praeteritum', 'perfekt', 'futur1', 'konjunktiv2'] as const) {
      expect(rungs('machen', 0, key), key).toHaveLength(3);
    }
  });

  it('names the construction first rather than counting letters', () => {
    // The old rung 1 for "du wirst müssen" was "3 words · 13 letters".
    expect(rungs('müssen', 1, 'futur1')[0]).toBe('werden (conjugated) + „müssen“ — the infinitive goes last');
    expect(rungs('gehen', 0, 'perfekt')[0]).toContain('sein (conjugated)');   // gehen takes sein
    expect(rungs('machen', 0, 'perfekt')[0]).toContain('haben (conjugated)');
  });

  it('shows the helper verb’s paradigm instead of leaking the first letter', () => {
    // The old rung 2 was 'starts with „d“' — and „du“ is printed in the prompt.
    expect(rungs('müssen', 1, 'futur1')[1])
      .toBe('ich werde · du wirst · er wird · wir werden · ihr werdet · sie werden');
  });

  it('distinguishes strong from weak verbs in the Präteritum', () => {
    expect(rungs('gehen', 0, 'praeteritum')[1]).toContain('strong verb');
    expect(rungs('machen', 0, 'praeteritum')[1]).toContain('weak verb');
  });

  it('distinguishes synthetic from analytic Konjunktiv II', () => {
    // müssen → müsste (its own form); machen → würde machen (analytic).
    expect(rungs('müssen', 0, 'konjunktiv2')[0]).toContain('its own Konjunktiv II form');
    expect(rungs('machen', 0, 'konjunktiv2')[0]).toContain('würde (conjugated)');
  });
});

// JavaScript's \b is ASCII-only: `\w` is [A-Za-z0-9_], so ß/ä/ö/ü are *non-word*
// characters and /\bgroß\b/ can never match "groß" — there is no word→non-word
// transition between ß and a following space. The cloze and sentence-builder
// drills gated eligibility on exactly that pattern, which silently excluded 135
// cards, among them some of the first words an A1 learner meets. It failed by
// doing nothing, which is why it went unnoticed; these pin it.
describe('wholeWordRe — German word boundaries', () => {
  const hits = (surface: string, sentence: string) => wholeWordRe(surface).test(sentence);

  it('matches a headword ending in ß', () => {
    expect(hits('groß', 'Das Haus ist groß.')).toBe(true);
    expect(hits('Fuß', 'Mein Fuß tut weh.')).toBe(true);
    expect(hits('weiß', 'Der Schnee ist weiß.')).toBe(true);
    expect(hits('süß', 'Der Kuchen ist süß.')).toBe(true);
  });

  it('matches a headword starting with an umlaut', () => {
    expect(hits('Übung', 'Die Übung ist leicht.')).toBe(true);
    expect(hits('Öl', 'Gib etwas Öl in die Pfanne.')).toBe(true);
    expect(hits('ähnlich', 'Die zwei Brüder sind sich ähnlich.')).toBe(true);
  });

  it('still refuses a partial word', () => {
    // The boundary has to keep holding, or cloze would blank inside a compound.
    expect(hits('groß', 'Die Großstadt ist laut.')).toBe(false);
    expect(hits('Fuß', 'Der Fußball rollt.')).toBe(false);
    expect(hits('Öl', 'Die Ölheizung ist alt.')).toBe(false);
    expect(hits('Haus', 'Die Hausaufgabe ist fertig.')).toBe(false);
  });

  it('captures the match so the cloze can blank it', () => {
    const m = wholeWordRe('groß').exec('Das Haus ist groß.');
    expect(m?.[1]).toBe('groß');
    expect('Das Haus ist groß.'.replace(wholeWordRe('groß'), '_____')).toBe('Das Haus ist _____.');
  });

  it('is case-insensitive but boundary-safe on both edges', () => {
    expect(hits('straße', 'Die Straße ist nass.')).toBe(true);
    expect(hits('straße', 'Die Straßenbahn kommt.')).toBe(false);
  });
});
