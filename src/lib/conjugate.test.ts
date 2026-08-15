import { describe, it, expect } from 'vitest';
import { conjugate, canConjugate, setKnownVerbs } from './conjugate.ts';

describe('conjugate — irregular table', () => {
  it('sein', () => {
    const c = conjugate('sein');
    expect(c.praesens).toEqual(['bin', 'bist', 'ist', 'sind', 'seid', 'sind']);
    expect(c.praeteritum[0]).toBe('war');
    expect(c.partizip).toBe('gewesen');
    expect(c.aux).toBe('sein');
    expect(c.reliable).toBe(true);
  });

  it('haben', () => {
    const c = conjugate('haben');
    expect(c.praesens[0]).toBe('habe');
    expect(c.praeteritum[0]).toBe('hatte');
    expect(c.partizip).toBe('gehabt');
    expect(c.perfekt[0]).toBe('habe gehabt');
  });

  it('gehen (aux sein)', () => {
    const c = conjugate('gehen');
    expect(c.praeteritum[0]).toBe('ging');
    expect(c.partizip).toBe('gegangen');
    expect(c.aux).toBe('sein');
    expect(c.perfekt[2]).toBe('ist gegangen');
  });
});

describe('conjugate — regular (weak) generation', () => {
  it('machen', () => {
    const c = conjugate('machen');
    expect(c.praesens).toEqual(['mache', 'machst', 'macht', 'machen', 'macht', 'machen']);
    expect(c.praeteritum[0]).toBe('machte');
    expect(c.partizip).toBe('gemacht');
    expect(c.source).toBe('regular');
    expect(c.reliable).toBe(true);
  });

  it('arbeiten inserts the -e- (arbeitest / arbeitete)', () => {
    const c = conjugate('arbeiten');
    expect(c.praesens[1]).toBe('arbeitest'); // du
    expect(c.praesens[2]).toBe('arbeitet');  // er
    expect(c.praeteritum[0]).toBe('arbeitete');
    expect(c.partizip).toBe('gearbeitet');
  });

  it('studieren drops the ge- (studiert)', () => {
    expect(conjugate('studieren').partizip).toBe('studiert');
  });
});

describe('conjugate — separable & reflexive', () => {
  it('aufstehen: prefix detaches, aux sein', () => {
    const c = conjugate('aufstehen');
    expect(c.separable).toBe('auf');
    expect(c.praesens[0]).toBe('stehe auf');
    expect(c.partizip).toBe('aufgestanden');
    expect(c.aux).toBe('sein');
  });

  it('sich freuen: reflexive perfekt carries the pronoun', () => {
    const c = conjugate('sich freuen');
    expect(c.reflexive).toBe(true);
    expect(c.perfekt[0]).toBe('habe mich gefreut');
  });
});

describe('conjugate — Futur I (werden + infinitive)', () => {
  it('regular: ich werde machen / du wirst machen', () => {
    const c = conjugate('machen');
    expect(c.futur1[0]).toBe('werde machen');
    expect(c.futur1[1]).toBe('wirst machen');
    expect(c.futur1[2]).toBe('wird machen');
  });

  it('separable verb keeps its prefix attached (werde aufstehen)', () => {
    expect(conjugate('aufstehen').futur1[0]).toBe('werde aufstehen');
  });

  it('reflexive carries the pronoun (werde mich freuen)', () => {
    expect(conjugate('sich freuen').futur1[0]).toBe('werde mich freuen');
  });
});

describe('conjugate — Konjunktiv II', () => {
  it('regular verb uses the analytic würde-form', () => {
    const c = conjugate('machen');
    expect(c.konjunktiv2[0]).toBe('würde machen');
    expect(c.konjunktiv2[1]).toBe('würdest machen');
  });

  it('sein / haben / modals keep their synthetic forms', () => {
    expect(conjugate('sein').konjunktiv2[0]).toBe('wäre');
    expect(conjugate('haben').konjunktiv2[0]).toBe('hätte');
    expect(conjugate('können').konjunktiv2[0]).toBe('könnte');
    expect(conjugate('werden').konjunktiv2[2]).toBe('würde');
  });

  it('reflexive analytic carries the pronoun (würde mich freuen)', () => {
    expect(conjugate('sich freuen').konjunktiv2[0]).toBe('würde mich freuen');
  });
});

describe('canConjugate — reliability gate', () => {
  it('accepts known regulars and table verbs', () => {
    expect(canConjugate('machen')).toBe(true);
    expect(canConjugate('gehen')).toBe(true);
  });

  it('rejects a separable verb whose base is unknown', () => {
    // The gate is unchanged: an unconfirmed base means a generated participle
    // could be wrong, so the verb is refused. `aufräumen` used to be the example
    // here and no longer is — *räumen* joined SEED_ROOTS on 2026-08-15, which is
    // the point of that list. A base that is genuinely not a German verb still
    // fails, which is what this test is actually about.
    expect(canConjugate('aufquasseln')).toBe(false);
    expect(canConjugate('anzwirbeln')).toBe(false);
  });

  it('accepts a separable verb once its base is a seeded root', () => {
    // The 2026-08-15 seed: 85 verbs went from "no inflection resolves anywhere"
    // to correctly conjugated. Forms read by eye before the list was trusted.
    expect(canConjugate('aufräumen')).toBe(true);
    expect(conjugate('aufräumen').partizip).toBe('aufgeräumt');
    expect(conjugate('zurückkehren').partizip).toBe('zurückgekehrt');
    expect(conjugate('zusammenfassen').praeteritum[2]).toBe('fasste zusammen');
  });

  it('SEED_ROOTS carries weak roots only', () => {
    // Listing a strong root confirms the split and then generates a weak form for
    // it: `hervorheben` came out as *hebte hervor / hervorgehebt*, because
    // `isStrong` cannot catch it — `hervor` is not a gate prefix. Four of the
    // first 89 were wrong that way.
    //
    // All four are now **correct**, but through the table rather than the seed:
    // `heben`, `weichen`, `wägen` and `vorbereiten` have rows stating their real
    // forms. That is the fix; adding them as roots would still be the bug.
    for (const [verb, part] of [
      ['hervorheben', 'hervorgehoben'], ['ausweichen', 'ausgewichen'],
      ['abwägen', 'abgewogen'], ['vorbereiten', 'vorbereitet'],
    ] as const) {
      expect(canConjugate(verb), verb).toBe(true);
      expect(conjugate(verb).partizip, verb).toBe(part);
    }
  });

  it('rejects a non-verb-shaped token', () => {
    expect(canConjugate('xyz')).toBe(false);
  });
});

// A separable verb built on an -ieren root: the -ieren rule suppresses the ge-,
// but the prefix still attaches. The branch that handled -ieren returned the bare
// root's participle and dropped the prefix, so `ausprobieren` yielded "probiert".
// Reachable from the conjugation drill, which asks for Partizip II on any reliable
// verb — i.e. it was teaching a wrong form. Found by testing the whole corpus
// rather than a handful of verbs.
describe('separable + -ieren participles', () => {
  it('keeps the prefix where -ieren suppresses the ge-', () => {
    setKnownVerbs(['probieren', 'packen', 'stellen', 'ordnen']);
    expect(conjugate('ausprobieren').partizip).toBe('ausprobiert');
  });

  it('still suppresses ge- on a plain -ieren verb', () => {
    expect(conjugate('studieren').partizip).toBe('studiert');
    expect(conjugate('probieren').partizip).toBe('probiert');
  });

  it('leaves the ordinary separable participle alone', () => {
    setKnownVerbs(['machen', 'packen']);
    expect(conjugate('aufmachen').partizip).toBe('aufgemacht');
    expect(conjugate('einpacken').partizip).toBe('eingepackt');
  });

  it('leaves inseparable prefixes alone', () => {
    expect(conjugate('verkaufen').partizip).toBe('verkauft');
  });
});

// `über`, `unter`, `um`, `durch` and `wieder` sit in neither SEPARABLE nor
// INSEPARABLE, because German uses them both ways — *umschreiben* has a separable
// reading (rewrite) and an inseparable one (paraphrase). So `splitPrefix` never
// reached the tabled root and `umsteigen` came out as *umsteigte*. Resolved by
// data rather than rule, one verb at a time; these assertions are the data.
describe('verbs behind an ambiguous prefix', () => {
  const cases: [string, string, string][] = [
    // verb            3sg preterite     participle
    ['umsteigen',      'stieg um',       'umgestiegen'],
    ['umziehen',       'zog um',         'umgezogen'],
    ['durchfallen',    'fiel durch',     'durchgefallen'],
    ['übernehmen',     'übernahm',       'übernommen'],
    ['unternehmen',    'unternahm',      'unternommen'],
    ['unterschreiben', 'unterschrieb',   'unterschrieben'],
    ['unterscheiden',  'unterschied',    'unterschieden'],
    ['überweisen',     'überwies',       'überwiesen'],
    // the weak ones: no ge- on the participle, because the prefix is unstressed.
    // These produced geübersetzt / gewiederholt / geüberlegt before.
    ['übersetzen',     'übersetzte',     'übersetzt'],
    ['wiederholen',    'wiederholte',    'wiederholt'],
    ['überlegen',      'überlegte',      'überlegt'],
    ['untersuchen',    'untersuchte',    'untersucht'],
    // ...and the separable one that does take ge-.
    ['umtauschen',     'tauschte um',    'umgetauscht'],
  ];
  for (const [verb, praet, part] of cases) {
    it(`${verb} → ${praet} / ${part}`, () => {
      const c = conjugate(verb);
      expect(c.reliable).toBe(true);
      expect(c.praeteritum[2]).toBe(praet);
      expect(c.partizip).toBe(part);
    });
  }
});

// Strong roots, added 2026-08-15. A root cascades — `greifen` alone rescued
// *ergreifen*, *angreifen*, *begreifen* and *aufgreifen* — so these rows are worth
// more than their own verbs. All 42 forms the roots unlocked were read by eye
// before the table was trusted, which is how `gefrieren` was caught inheriting
// haben from `frieren` when it takes sein.
describe('strong roots and what they cascade to', () => {
  const cases: [string, string, string, string][] = [
    ['greifen',    'griff',     'gegriffen',    'haben'],
    ['ergreifen',  'ergriff',   'ergriffen',    'haben'],   // the verb that started this
    ['begreifen',  'begriff',   'begriffen',    'haben'],
    ['aufgreifen', 'griff auf', 'aufgegriffen', 'haben'],
    ['schneiden',  'schnitt',   'geschnitten',  'haben'],
    ['messen',     'maß',       'gemessen',     'haben'],
    ['genießen',   'genoss',    'genossen',     'haben'],
    ['leiden',     'litt',      'gelitten',     'haben'],
    ['heben',      'hob',       'gehoben',      'haben'],
    ['abheben',    'hob ab',    'abgehoben',    'haben'],
    ['reiten',     'ritt',      'geritten',     'sein'],
    ['sterben',    'starb',     'gestorben',    'sein'],
    ['wachsen',    'wuchs',     'gewachsen',    'sein'],
    ['ausweichen', 'wich aus',  'ausgewichen',  'sein'],
    ['abwägen',    'wog ab',    'abgewogen',    'haben'],
  ];
  for (const [verb, praet, part, aux] of cases) {
    it(`${verb} → ${praet} / ${part}`, () => {
      const c = conjugate(verb);
      expect(c.reliable).toBe(true);
      expect(c.praeteritum[2]).toBe(praet);
      expect(c.partizip).toBe(part);
      expect(c.aux).toBe(aux);
    });
  }

  it('gefrieren takes sein even though frieren takes haben', () => {
    expect(conjugate('frieren').aux).toBe('haben');
    expect(conjugate('gefrieren').aux).toBe('sein');
  });
});
