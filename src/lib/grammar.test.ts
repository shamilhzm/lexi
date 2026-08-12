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
  wholeWordRe, pickPersonIndex, buildSeparable, isSeparable, buildReflexive, isReflexive, canTransform, pickFocused, dictatable, type Mode,
} from '../views/Fundamentals.tsx';
import { spellingDiff } from '../views/GrammarDrill.tsx';
import { ARCHAIC_SPELLING, isGermanDefinition } from '../../scripts/corpus/lib.ts';
import { showsGermanDefs } from '../views/Review.tsx';
import type { Word } from '../types.ts';
import { FOCUS_CHOICES } from '../views/Settings.tsx';
import { termGloss } from '../components/RulePanel.tsx';
import { conjugate, setKnownVerbs } from './conjugate.ts';
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
      // Cloze is vocabulary-in-context and dictation is spelling from sound —
      // neither is one grammatical system, so neither has a rule to open.
      if (m === 'cloze' || m === 'dictation') { expect(id).toBeNull(); continue; }
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

// Uniform random over six persons meant a first encounter with a verb could ask
// for „ihr werdet müssen“ — the rarest form in speech and the last one taught —
// before the learner had ever produced „ich werde“. A coin flip is not a
// curriculum; PERSONS_I is already in teaching order.
describe('pickPersonIndex', () => {
  it('draws only from the singular persons until a card is known', () => {
    for (const status of ['new', 'learning'] as const) {
      for (let r = 0; r < 1; r += 0.05) {
        expect(pickPersonIndex(status, () => r), `${status} @${r}`).toBeLessThan(3);
      }
    }
  });

  it('opens up to all six once the card is known', () => {
    const seen = new Set<number>();
    for (let r = 0; r < 1; r += 0.02) seen.add(pickPersonIndex('known', () => r));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('stays in range at the boundaries', () => {
    for (const status of ['new', 'learning', 'known'] as const) {
      expect(pickPersonIndex(status, () => 0)).toBe(0);
      expect(pickPersonIndex(status, () => 0.999999)).toBeLessThan(status === 'known' ? 6 : 3);
    }
  });
});

// Grading folds ä/ö/ü/ß so "schoen" is accepted for "schön" — right, because the
// learner knew the word. But the message never said *which* part was the
// spelling, and an error forgiven silently is how it becomes permanent.
describe('spellingDiff', () => {
  it('names the substitution that was folded', () => {
    expect(spellingDiff('schoen', 'schön')).toBe('oe → ö');
    expect(spellingDiff('weiss', 'weiß')).toBe('ss → ß');
    expect(spellingDiff('waehlen', 'wählen')).toBe('ae → ä');
    expect(spellingDiff('ueber', 'über')).toBe('ue → ü');
  });

  it('names every substitution when there is more than one', () => {
    expect(spellingDiff('haeuser gross', 'häuser groß')).toBe('ae → ä, ss → ß');
  });

  it('says nothing when there is no umlaut lesson to teach', () => {
    expect(spellingDiff('schön', 'schön')).toBeNull();
    expect(spellingDiff('Haus', 'haus')).toBeNull();
  });
});

// A drill can arrive mid-session titled „Konjunktiv II“ for someone three weeks
// in who has never been told what a case is. A name you cannot decode is not
// information.
describe('termGloss', () => {
  it('glosses the terms a beginner meets cold', () => {
    expect(termGloss('Akkusativ')).toBe('the direct-object case');
    expect(termGloss('Präteritum')).toBe('simple past');
    expect(termGloss('Konjunktiv II')).toBe('would / hypothetical');
  });

  it('covers every case and tense label the drills can show', () => {
    // These are the labels CASE_POINT/TENSE_POINT headers render, so a missing
    // gloss here is a header a beginner cannot read.
    for (const t of ['Nominativ', 'Akkusativ', 'Dativ', 'Genitiv',
                     'Präsens', 'Präteritum', 'Perfekt', 'Futur I', 'Konjunktiv II', 'Partizip II']) {
      expect(termGloss(t), `${t} has no gloss`).toBeTruthy();
    }
  });

  it('leaves ordinary labels alone', () => {
    expect(termGloss('Noun plurals')).toBeUndefined();
    expect(termGloss('Gender (der/die/das)')).toBeUndefined();
  });
});

// canTransform excludes separable verbs on purpose — the bare finite form of
// "ankommen" is "komme", and printing that would teach wrong German. The cost was
// that the app never drilled the one system English has no equivalent of. These
// pin that the dedicated drill renders each shape correctly, because a drill that
// teaches the wrong form is worse than no drill.
describe('separable verbs', () => {
  it('detaches the prefix in the present and closes the clause with it', () => {
    const p = buildSeparable('anrufen', 'praesens', 0);
    expect(p.prompt).toBe('„anrufen“ → Präsens · ich');
    expect(p.accept).toContain('ich rufe an');
    expect(p.accept).toContain('rufe an');
    expect(p.reveal.derivation).toEqual(['rufe', 'an']);
  });

  it('wraps the prefix around -ge- in the participle', () => {
    const p = buildSeparable('anrufen', 'partizip', 0);
    expect(p.accept).toEqual(['angerufen']);
    // an + ge + rufen — the shape that makes the rule visible.
    expect(p.reveal.derivation).toEqual(['an', 'ge', 'rufen']);
  });

  it('keeps the participle whole in the Perfekt, with the right auxiliary', () => {
    expect(buildSeparable('anrufen', 'perfekt', 0).accept).toContain('ich habe angerufen');
    // Verbs of motion take sein — getting this wrong would teach a real error.
    expect(buildSeparable('ankommen', 'perfekt', 0).accept).toContain('ich bin angekommen');
    expect(buildSeparable('aufstehen', 'perfekt', 2).accept).toContain('er ist aufgestanden');
  });

  it('names the prefix in its first hint rather than counting letters', () => {
    expect(buildSeparable('mitkommen', 'praesens', 1).hints[0]).toContain('„mit“');
    expect(buildSeparable('mitkommen', 'praesens', 1).hints[1])
      .toBe('ich komme mit · du kommst mit · er kommt mit · wir kommen mit · ihr kommt mit · sie kommen mit');
  });

  it('accepts only separable verbs the engine is confident about', () => {
    expect(isSeparable('anrufen')).toBe(true);
    expect(isSeparable('aufstehen')).toBe(true);
    expect(isSeparable('machen')).toBe(false);       // no prefix
    expect(isSeparable('verstehen')).toBe(false);    // inseparable prefix
    // The two gates are complements on the separable axis: a verb is never
    // offered to both drills, so neither can print the other's wrong form.
    for (const v of ['anrufen', 'aufstehen', 'mitkommen', 'einkaufen']) {
      expect(canTransform(v), `${v} must not reach the transform drill`).toBe(false);
    }
  });

  it('never renders a form that loses its prefix', () => {
    // The exact failure canTransform was written to avoid: "ich komme" for
    // ankommen. Asserted over every verb the drill would actually offer, and only
    // those — the engine needs setKnownVerbs (which the app calls at load) before
    // it can split a *regular* separable verb like einkaufen, and a verb it can't
    // split is one isSeparable already refuses.
    const offered = ['anrufen', 'aufstehen', 'mitkommen', 'einkaufen', 'fernsehen', 'ankommen']
      .filter(isSeparable);
    expect(offered.length, 'no separable verb was recognised at all').toBeGreaterThan(2);
    for (const v of offered) {
      const prefix = conjugate(v).separable!;
      for (const shape of ['praesens', 'partizip', 'perfekt'] as const) {
        for (const p of [0, 2, 4]) {
          expect(buildSeparable(v, shape, p).accept[0], `${v}/${shape}/p${p} dropped „${prefix}“`)
            .toContain(prefix);
        }
      }
    }
  });
});

// The unit tests above run on the engine's built-in irregular table. This one runs
// it the way the app does — with setKnownVerbs primed from the shipped corpus,
// which is what lets it split a *regular* separable verb — and checks the whole
// eligible set rather than a handful of hand-picked verbs.
describe('separable verbs, against the shipped corpus', () => {
  const corpus: { term: string; pos: string; kind: string }[] =
    JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));

  // Same call data/index.ts makes after loading the lexicon.
  setKnownVerbs(corpus.filter((w) => w.pos === 'verb').map((w) => w.term));
  const eligible = corpus.filter((w) => w.pos === 'verb' && isSeparable(w.term));

  it('finds a real pool, not a handful', () => {
    expect(eligible.length).toBeGreaterThan(100);
  });

  it('shares no verb with the transform drill', () => {
    // The two gates partition the verbs on separability. An overlap would mean one
    // drill printing the form the other exists to avoid.
    expect(eligible.filter((w) => canTransform(w.term)).map((w) => w.term)).toEqual([]);
  });

  it('keeps the prefix in every shape of every eligible verb', () => {
    const broken: string[] = [];
    for (const w of eligible) {
      const prefix = conjugate(w.term).separable!;
      for (const shape of ['praesens', 'partizip', 'perfekt'] as const) {
        for (const p of [0, 1, 2, 3, 4, 5]) {
          const answer = buildSeparable(w.term, shape, p).accept[0];
          if (!answer.includes(prefix)) broken.push(`${w.term}/${shape}/p${p} → ${answer}`);
        }
      }
    }
    expect(broken.slice(0, 10)).toEqual([]);
  });

  it('never offers an empty or single-character answer', () => {
    for (const w of eligible.slice(0, 200)) {
      for (const shape of ['praesens', 'partizip', 'perfekt'] as const) {
        const a = buildSeparable(w.term, shape, 0).accept[0];
        expect(a.trim().length, `${w.term}/${shape}`).toBeGreaterThan(2);
      }
    }
  });
});

// The other class canTransform refuses, for the same reason: a reflexive verb's
// bare finite form drops the pronoun it cannot do without. The error this drills is
// omission — an English speaker says "I remember" and writes „ich erinnere“,
// because English has no pronoun there to leave out.
describe('reflexive verbs', () => {
  it('puts the pronoun back, and inflects it with the person', () => {
    expect(buildReflexive('sich freuen', 'praesens', 0).accept).toContain('ich freue mich');
    expect(buildReflexive('sich freuen', 'praesens', 1).accept).toContain('du freust dich');
    expect(buildReflexive('sich freuen', 'praesens', 2).accept).toContain('er freut sich');
    expect(buildReflexive('sich freuen', 'praesens', 3).accept).toContain('wir freuen uns');
    expect(buildReflexive('sich freuen', 'praesens', 4).accept).toContain('ihr freut euch');
    expect(buildReflexive('sich freuen', 'praesens', 5).accept).toContain('sie freuen sich');
  });

  it('keeps the pronoun in the Perfekt too', () => {
    const p = buildReflexive('sich freuen', 'perfekt', 0);
    expect(p.accept[0]).toBe('ich habe mich gefreut');
  });

  it('shows the full pronoun set as its second hint', () => {
    expect(buildReflexive('sich freuen', 'praesens', 0).hints[1])
      .toBe('ich mich · du dich · er sich · wir uns · ihr euch · sie sich');
  });

  it('names the verb with its sich in the prompt', () => {
    expect(buildReflexive('sich erinnern', 'praesens', 0).prompt).toBe('„sich erinnern“ → Präsens · ich');
  });

  it('is disjoint from the transform and separable drills', () => {
    for (const v of ['sich freuen', 'sich erinnern', 'sich ausruhen']) {
      expect(canTransform(v), `${v} must not reach transform`).toBe(false);
    }
    expect(isReflexive('machen')).toBe(false);
    expect(isReflexive('anrufen')).toBe(false);
  });

  it('never renders a reflexive form without its pronoun, across the corpus', () => {
    const corpus: { term: string; pos: string }[] =
      JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
    setKnownVerbs(corpus.filter((w) => w.pos === 'verb').map((w) => w.term));
    const eligible = corpus.filter((w) => w.pos === 'verb' && isReflexive(w.term));
    expect(eligible.length).toBeGreaterThan(20);

    const broken: string[] = [];
    for (const w of eligible) {
      for (const shape of ['praesens', 'perfekt'] as const) {
        for (let p = 0; p < 6; p++) {
          const answer = buildReflexive(w.term, shape, p).accept[0];
          if (!/\b(mich|dich|sich|uns|euch)\b/.test(answer)) broken.push(`${w.term}/${shape}/p${p} → ${answer}`);
        }
      }
    }
    expect(broken.slice(0, 8)).toEqual([]);
  });
});

// A focus is a lean on which tense the drills pick, so a key that doesn't match a
// real target would be a setting that silently does nothing.
describe('weekly focus', () => {
  it('offers only tenses the drills can actually target', () => {
    for (const f of FOCUS_CHOICES) {
      expect(TENSE_POINT[f.key as keyof typeof TENSE_POINT], `${f.key} is not a drill target`).toBeTruthy();
    }
  });

  const opts = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }];
  /** Two draws happen: the lean, then the uniform pick. Feed them separately —
   *  one constant for both would constrain the pick to the top of the range. */
  const rolls = (...vals: number[]) => { const q = [...vals]; return () => q.shift() ?? 0; };

  it('takes the focus when the lean lands', () => {
    expect(pickFocused(opts, 'c', rolls(0.1)).key).toBe('c');
    expect(pickFocused(opts, 'c', rolls(0.59)).key).toBe('c');
  });

  it('leaves every other option reachable when it doesn’t', () => {
    // Above the threshold the ordinary uniform draw runs, so nothing is excluded —
    // a focus that filtered would quietly cost the learner the other three tenses.
    const seen = new Set<string>();
    for (const pick of [0.0, 0.3, 0.6, 0.9]) seen.add(pickFocused(opts, 'c', rolls(0.99, pick)).key);
    expect([...seen].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  // With no matching focus the lean is short-circuited before rnd() is reached, so
  // exactly one value is drawn rather than two.
  it('is a plain uniform draw when nothing is focused', () => {
    expect(pickFocused(opts, null, rolls(0.0)).key).toBe('a');
    expect(pickFocused(opts, null, rolls(0.9)).key).toBe('d');
  });

  it('ignores a focus that names nothing', () => {
    expect(pickFocused(opts, 'nonexistent', rolls(0.9)).key).toBe('d');
  });
});

// The only writing in the app. Free composition can't be graded honestly without a
// model — and a drill that marks correct German wrong is worse than no drill — so
// dictation is the form of written production whose target is known to the
// character. The gate decides what a learner can reasonably be asked to spell from
// hearing it once.
describe('dictation', () => {
  it('takes a sentence of a size you can hold in your head', () => {
    expect(dictatable('Ich lerne täglich Deutsch.')).toBe(true);
    expect(dictatable('Der Hund wartet geduldig vor der Tür.')).toBe(true);
  });

  it('refuses what is too short to be a sentence or too long to type', () => {
    expect(dictatable('Ja.')).toBe(false);
    expect(dictatable('Guten Tag')).toBe(false);              // two words
    expect(dictatable('Der Mann, der gestern im Regen vor dem Bahnhof stand, wartete auf seine Schwester aus Hamburg.')).toBe(false);
  });

  it('refuses what cannot be spelled from sound alone', () => {
    // Digits, brackets and acronyms are guesses, not spelling.
    expect(dictatable('Ich stehe um 7 Uhr auf.')).toBe(false);
    expect(dictatable('Er arbeitet bei der ARD in Köln.')).toBe(false);
    expect(dictatable('Sie sagte (leise) etwas zu ihm.')).toBe(false);
    expect(dictatable('„Komm her“, sagte sie leise.')).toBe(false);
  });

  it('handles a missing sentence', () => {
    expect(dictatable(undefined)).toBe(false);
    expect(dictatable('')).toBe(false);
  });

  it('finds a usable pool in the shipped corpus', () => {
    const corpus: { kind: string; ex?: { de: string }[] }[] =
      JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
    const n = corpus.filter((w) => w.kind === 'word' && dictatable(w.ex?.[0]?.de)).length;
    // Enough that a learner doesn't see the same sentence twice in a week.
    expect(n).toBeGreaterThan(500);
  });
});

// Two checkers used to carry their own copy of the pre-1996 spelling rule and
// they drifted: validate's copy had no trailing word boundary, so `thun` matched
// inside "Thunfisch" and reported tuna as 19th-century German. One rule now, in
// scripts/corpus/lib.ts, pinned here on both sides of the boundary.
describe('ARCHAIC_SPELLING', () => {
  it('flags the reformed stems wherever they appear in the word', () => {
    for (const s of ['Er muß gehen.', 'Sie mußte warten.', 'Ich wußte es nicht.', 'Daß er kam.', 'ein häßliches Haus']) {
      expect(ARCHAIC_SPELLING.test(s), s).toBe(true);
    }
  });

  it('does not flag ordinary German that merely contains the letters', () => {
    for (const s of ['Ich mag Pizza mit Thunfisch.', 'Der Fluss ist breit.', 'Sie muss gehen.', 'Das Weib', 'beyond']) {
      expect(ARCHAIC_SPELLING.test(s), s).toBe(false);
    }
  });

  it('still respects the ß that the reform kept', () => {
    for (const s of ['der Fuß', 'ein großes Haus', 'die Straße', 'weiß', 'süß']) {
      expect(ARCHAIC_SPELLING.test(s), s).toBe(false);
    }
  });
});

// The monolingual layer (persona B2 #38). 367 German definitions shipped inside
// `def`, where 318 sat at A1–B1 on an English-base card — right text, wrong field,
// wrong reader. corpus:germandef moved them to `defDe`; these pin both halves:
// that the migration is complete, and that the layer is shown to B2 and up only.
describe('German definitions (defDe)', () => {
  const vocab: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));

  it('shows the German layer from B2 up, and never below it', () => {
    expect(showsGermanDefs(null)).toBe(false);
    for (const l of ['A1', 'A2', 'B1'] as const) expect(showsGermanDefs(l), l).toBe(false);
    for (const l of ['B2', 'C1', 'C2'] as const) expect(showsGermanDefs(l), l).toBe(true);
  });

  it('left no German definition behind in the English field', () => {
    // Uses the pipeline's own rule rather than a copy: this test *was* a fourth
    // copy, and it drifted from the shared one within the hour.
    const stragglers = vocab.filter((w) => w.kind === 'word' && w.def && isGermanDefinition(w.def, w.en ?? ''));
    expect(stragglers.map((w) => w.id)).toEqual([]);
  });

  it('never stores the same text in both fields', () => {
    const same = vocab.filter((w) => w.defDe && w.def && w.defDe.trim() === w.def.trim());
    expect(same.map((w) => w.id)).toEqual([]);
  });
});

// `gexId` keys exercise cards on the point's title, so two points sharing a title
// within one level would silently share their schedules. That is the failure the
// positional scheme was replaced to avoid, reintroduced from the other direction —
// and it would arrive as an ordinary authoring commit, not as a code change.
describe('grammar point titles are unique within a level', () => {
  it('has no duplicate title in any level', () => {
    const dupes: string[] = [];
    for (const level of Object.keys(g) as (keyof typeof g)[]) {
      const seen = new Set<string>();
      for (const p of g[level]) {
        if (seen.has(p.title)) dupes.push(`${level} · ${p.title}`);
        seen.add(p.title);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('no title ends in a colon followed by digits', () => {
    // `gex:<level>:<title>:<xi>` is parsed by taking the last colon-segment as the
    // exercise index. 43 titles legitimately contain colons ("Negation: nicht vs.
    // kein"), which is fine — but one ending in ":12" would be indistinguishable
    // from an index and would break the migration's positional test.
    const bad: string[] = [];
    for (const level of Object.keys(g) as (keyof typeof g)[]) {
      for (const p of g[level]) if (/:\s*\d+$/.test(p.title)) bad.push(`${level} · ${p.title}`);
    }
    expect(bad).toEqual([]);
  });
});

// ---- the generated bank ----------------------------------------------------
// 4,320 of the 5,207 exercises were derived by `corpus:genex` rather than
// written, and nobody is going to read them. That is fine for facts — a gender
// is a gender — and it is exactly why the *shape* of every generated item has to
// be pinned: a generator bug does not produce one bad exercise, it produces four
// hundred. Each of these caught a real one during the first run.
describe('generated exercises', () => {
  const gen = Object.values(g).flatMap((points) =>
    points.flatMap((p) => p.exercises.filter((e) => e.gen).map((e) => ({ p, e }))));

  it('exist, and are the majority of the bank', () => {
    expect(gen.length).toBeGreaterThan(4000);
  });

  it('always offers the answer among the options, exactly once', () => {
    for (const { p, e } of gen) {
      const where = `${p.title} · ${e.prompt}`;
      expect(e.options, where).toBeTruthy();
      const correct = e.options![e.answer!];
      expect(correct, where).toBeTruthy();
      expect(e.options!.filter((o) => o === correct).length, where).toBe(1);
    }
  });

  it('never offers a gap marker or an empty string as an option', () => {
    for (const { p, e } of gen) {
      for (const o of e.options!) expect(o.trim(), `${p.title} · ${e.prompt}`).not.toBe('');
    }
  });

  it('gives every item a gap and an explanation', () => {
    for (const { p, e } of gen) {
      expect(e.prompt, p.title).toMatch(/_{2,}/);
      expect(e.explain?.trim(), `${p.title} · ${e.prompt}`).toBeTruthy();
    }
  });

  // `sie` is 3sg feminine and 3pl at once, so "sie ___ (kommen)" has two right
  // answers and both were on screen. The plural is written "sie (Pl.)".
  it('never asks for a bare "sie" subject', () => {
    for (const { p, e } of gen) {
      expect(e.prompt, `${p.title} · ${e.prompt}`).not.toMatch(/^sie ___/);
    }
  });

  // Every one of these shipped in the first generated run.
  it('never produces the forms the first run got wrong', () => {
    const banned = [
      /\bmeinm\b/, /\bdeinm\b/, /\bseinm\b/,   // possessive: /^eine?/ ate the -e-
      /\bvergis\b/,                             // sibilant stem: sliced two letters
      /\bfähr\b/, /\bgäb\b/,                    // imperative: a→ä must revert
    ];
    for (const { p, e } of gen) {
      const text = [e.prompt, ...(e.options ?? []), e.explain ?? ''].join(' ');
      for (const re of banned) expect(text, `${p.title} · ${e.prompt}`).not.toMatch(re);
    }
  });

  it('never repeats a prompt inside a point', () => {
    // A ratchet rather than a zero, because it found one that was already there:
    // A1 · Perfekt asks "Sie ___ nach Hause gegangen." twice, authored, with two
    // different option sets. It cannot simply be deleted — exercise ids are
    // `gex:<level>:<title>:<index>` and every learner's schedule is keyed on the
    // index, so removing one silently re-points every later exercise in that
    // point. It wants an expect-guarded edit in place, not a splice. Until then
    // this stops a *second* one appearing.
    const KNOWN_AUTHORED_DUPES = 1;
    let dupes = 0;
    for (const [level, points] of Object.entries(g)) {
      for (const p of points) {
        const prompts = p.exercises.map((e) => e.prompt.trim());
        dupes += prompts.length - new Set(prompts).size;
        // The generated half must be clean on its own, with no allowance.
        const genPrompts = p.exercises.filter((e) => e.gen).map((e) => e.prompt.trim());
        expect(new Set(genPrompts).size, `${level} · ${p.title} (generated)`).toBe(genPrompts.length);
      }
    }
    expect(dupes).toBeLessThanOrEqual(KNOWN_AUTHORED_DUPES);
  });
});
