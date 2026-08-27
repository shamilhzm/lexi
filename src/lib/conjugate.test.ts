import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
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

  // `gegenüber` and `wohl` were missing from SEPARABLE, so `splitPrefix` never
  // fired and the weak generator inflected the whole compound as a simplex —
  // while still reporting `reliable: true`, which is how a wrong form reached the
  // drill instead of being gated out of it. `gegenüberstellen` is a shipped C1
  // card and was offered by the conjugation drill.
  it('gegenüberstellen: the ge- goes inside, not in front', () => {
    const c = conjugate('gegenüberstellen');
    expect(c.partizip).toBe('gegenübergestellt');   // never "gegenüberstellt"
    expect(c.separable).toBe('gegenüber');
  });

  it('wohlfühlen: same, and its root is seeded because Lexi does not card fühlen', () => {
    const c = conjugate('wohlfühlen');
    expect(c.partizip).toBe('wohlgefühlt');         // never "gewohlfühlt"
    expect(c.separable).toBe('wohl');
  });

  // Both were previously unreliable, and the gate was right to refuse them — but
  // that also kept two good cards out of the corpus. Fixed at the source instead
  // of by writing round it: `überreichen` is inseparable (überréichen), so it gets
  // a table row like the other ambiguous-prefix verbs; `aushändigen` splits on the
  // bound root `händigen`, which modern German only ever uses prefixed.
  it('überreichen: inseparable, so no ge- at all', () => {
    const c = conjugate('überreichen');
    expect(c.partizip).toBe('überreicht');          // never "geüberreicht"
    expect(c.praeteritum[2]).toBe('überreichte');
    expect(canConjugate('überreichen')).toBe(true);
  });

  it('aushändigen: splits on a bound root, and einhändigen comes with it', () => {
    expect(conjugate('aushändigen').partizip).toBe('ausgehändigt');   // never "geaushändigt"
    expect(conjugate('aushändigen').praesens[0]).toBe('händige aus');
    expect(conjugate('einhändigen').partizip).toBe('eingehändigt');
  });

  // The other half of the contract, and the property that meant the two above were
  // never *wrong* on screen — only absent: a term the engine cannot resolve to a
  // lemma must come back unreliable, so `canConjugate` keeps it out of the drill
  // instead of showing what the generator made of it. 60 of the corpus's 1,212
  // verbs are declined this way, almost all of them pattern cards whose headword
  // deliberately carries government notation.
  it('declines a term that is not a lemma rather than inflecting it', () => {
    for (const term of ['verzichten auf + A', 'gehören zu + D']) {
      expect(conjugate(term).reliable, `${term} must not be drillable`).toBe(false);
      expect(canConjugate(term)).toBe(false);
    }
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

// The long tail, closed 2026-08-15: 102 verbs whose stems come from de.wiktionary
// rather than from memory. A sample is pinned here — the 3sg preterite and the
// participle, which are the two forms recognition depends on and the two the
// dictionary states exactly. The other persons are rule-derived and deliberately
// not asserted, because a rule is what they are.
describe('the dictionary-sourced long tail', () => {
  const cases: [string, string, string, string][] = [
    ['schieben',      'schob',        'geschoben',      'haben'],
    ['begraben',      'begrub',       'begraben',       'haben'],
    ['auftreten',     'trat auf',     'aufgetreten',    'sein'],
    ['umkommen',      'kam um',       'umgekommen',     'sein'],
    ['durchgehen',    'ging durch',   'durchgegangen',  'sein'],
    ['anstoßen',      'stieß an',     'angestoßen',     'haben'],
    ['abbiegen',      'bog ab',       'abgebogen',      'haben'],
    ['stehlen',       'stahl',        'gestohlen',      'haben'],
    ['zwingen',       'zwang',        'gezwungen',      'haben'],
    ['schweigen',     'schwieg',      'geschwiegen',    'haben'],
    ['abonnieren',    'abonnierte',   'abonniert',      'haben'],  // weak: -te + -n, not -teen
    ['analysieren',   'analysierte',  'analysiert',     'haben'],
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

  it('a weak preterite pluralises with -n, not -en', () => {
    // The generator's first pass produced *abonnierteen*.
    expect(conjugate('abonnieren').praeteritum[3]).toBe('abonnierten');
    expect(conjugate('analysieren').praeteritum[5]).toBe('analysierten');
  });
});

// The ambiguous-prefix senses, settled 2026-08-15 by reading each card's own gloss
// and examples rather than deferring to a dictionary's primary entry. A paradigm is
// only right relative to a sense, and the card states which sense it teaches.
describe('ambiguous prefixes follow the card, not the dictionary headword', () => {
  it('umstellen is the separable "rearrange" — the card says umgestellt', () => {
    expect(conjugate('umstellen').partizip).toBe('umgestellt');
    expect(conjugate('umstellen').praeteritum[2]).toBe('stellte um');
  });

  it('hängen is the strong intransitive — the card leads with "be suspended"', () => {
    expect(conjugate('hängen').praeteritum[2]).toBe('hing');
    expect(conjugate('hängen').partizip).toBe('gehangen');
  });

  it('überfahren and überholen are inseparable, as their examples show', () => {
    // "Tom hat einen Hund überfahren" · "Er überholte den Lastwagen".
    // Wiktionary's Flexion page shows the rarer separable readings for both.
    expect(conjugate('überfahren').partizip).toBe('überfahren');
    expect(conjugate('überholen').praeteritum[2]).toBe('überholte');
  });
});

// A separable prefix on an **inseparably prefixed root** takes no ge-: the ge-
// slot belongs to the root, and the root has already spent it. Found 2026-08-25
// when seeding `versetzen` made *sich hineinversetzen* conjugatable and
// immediately wrong — «hineingeversetzt». A fix that only splits is not a fix.
describe('separable prefix over an inseparable root', () => {
  // These roots are seeded, not carded, so the split needs the same priming the
  // app does at boot (LESSONS class 2: a pure function with a seeded table is not
  // pure until the table is seeded). In `beforeEach`, not in the describe body:
  // `setKnownVerbs` *replaces* the set, describe bodies all run at collection
  // time, and the two calls above would otherwise be whichever ran last.
  beforeEach(() => {
    setKnownVerbs(['versetzen', 'bewahren', 'eignen', 'kühlen', 'wirken', 'machen', 'geben', 'stellen', 'ruhen', 'kennen']);
  });

  it('drops the ge- where the root already carries a prefix', () => {
    expect(conjugate('hineinversetzen').partizip).toBe('hineinversetzt');
    expect(conjugate('aufbewahren').partizip).toBe('aufbewahrt');
  });

  it('keeps the ge- for an ordinary separable verb', () => {
    expect(conjugate('aufmachen').partizip).toBe('aufgemacht');
    expect(conjugate('abkühlen').partizip).toBe('abgekühlt');
    expect(conjugate('aneignen').partizip).toBe('angeeignet');
  });

  it('leaves genuinely ent- prefixed verbs alone', () => {
    // The counter-examples for the `entgegen` entry below.
    expect(conjugate('entfernen').partizip).toBe('entfernt');
    expect(conjugate('entscheiden').partizip).toBe('entschieden');
    expect(conjugate('entwickeln').partizip).toBe('entwickelt');
  });

  it('reads entgegen as one separable prefix, not ent- plus gegen', () => {
    // «entgegenwirkt» shipped reliable. German is entgegengewirkt.
    const c = conjugate('entgegenwirken');
    expect(c.separable).toBe('entgegen');
    expect(c.partizip).toBe('entgegengewirkt');
  });

  it('tables anerkennen, which splitPrefix cannot reach in one level', () => {
    // an + erkennen, and *erkennen* is itself er + kennen — two levels, so the
    // weak generator took it and produced «anerkennt», marked reliable.
    const c = conjugate('anerkennen');
    expect(c.partizip).toBe('anerkannt');
    expect(c.praesens[0]).toBe('erkenne an');
    expect(c.reliable).toBe(true);
  });
});

/* ── ge- + a separable prefix is not a possible German word ──────────────────
 *
 * The ge- of a separable verb goes *inside*, after the prefix: aufgestanden, not
 * geaufstehen. So a generated participle matching `ge` + <separable prefix> +
 * stem is proof the prefix was never recognised and the compound was conjugated
 * as a simplex.
 *
 * Found 2026-08-26 by running `conjugate` over every verb in the shipped corpus —
 * fourteen produced one, and two of those (`kennenlernen`, `radfahren`) came back
 * `reliable: true`, which means `conjDrillable` would have accepted them and the
 * drill would have *printed* «du kennenlernst». VISION forbids exactly that: a
 * drill that renders wrong German is worse than no drill.
 *
 * This is the third time the SEPARABLE list has been found short (see its own
 * comments for 08-24 and this batch), which is LESSONS' standing warning about
 * checks and indexes that enumerate their cases. The list will go short again;
 * this makes it fail loudly instead of silently.
 */
describe('no verb is conjugated into an impossible participle', () => {
  // Separable prefixes as a *test* fixture, written independently of the module's
  // own list on purpose: asserting against the same array the code reads would
  // only prove it equals itself.
  const SEP = ['ab', 'an', 'auf', 'aus', 'bei', 'davon', 'ein', 'entgegen', 'fern', 'fest', 'fort',
    'her', 'heraus', 'herein', 'hier', 'hin', 'hinein', 'kaputt', 'kennen', 'klar', 'krank', 'los',
    'mit', 'nach', 'rad', 'raus', 'rein', 'statt', 'teil', 'vor', 'vorbei', 'wahr', 'weg', 'weiter',
    'zu', 'zurück', 'zusammen'];

  /** Verbs that merely begin with the letters of a prefix. `antworten` is not
   *  `an` + `tworten`, and «geantwortet» is correct — so these must keep their
   *  ge-. Listed rather than inferred, because the only way to tell them apart is
   *  to know whether the remainder is a verb. */
  const NOT_PREFIXED = ['antworten', 'teilen', 'wahren', 'einigen', 'herrschen', 'hindern', 'reinigen'];

  const COMPOUND = ['kennenlernen', 'radfahren', 'wahrnehmen', 'reinkommen', 'klarstellen',
    'kaputtgehen', 'krankmelden', 'krankschreiben', 'davonkommen', 'hierbleiben', 'rausfinden',
    'rauskommen', 'reingehen', 'rausholen', 'reinschreiben', 'aufstehen', 'ankommen', 'teilnehmen',
    'mitteilen', 'zustimmen', 'einsperren', 'aufwecken', 'abwarten'];

  // **The module is stateful, and the first version of this test forgot it.**
  // `conjugate` splits a prefix only when the remainder is a verb it knows, and
  // what it knows is SEED_ROOTS until `setKnownVerbs` supplies the corpus at boot.
  // Measuring without that call reported `mitteilen → gemitteilt` and
  // `zustimmen → gezustimmt` as broken; with it, both are correct and always were.
  // Fourteen of the sixteen "findings" survived the correction — the other two
  // were the probe. Configure the module the way the app configures it.
  beforeAll(() => setKnownVerbs(COMPOUND.concat(NOT_PREFIXED, [
    'teilen', 'stimmen', 'lernen', 'nehmen', 'kommen', 'gehen', 'fahren', 'bleiben', 'finden',
    'holen', 'stellen', 'melden', 'schreiben', 'sperren', 'wecken', 'warten',
  ])));

  it('never stacks ge- on top of a separable prefix', () => {
    const wrong: string[] = [];
    for (const v of COMPOUND) {
      const p = conjugate(v).partizip;
      if (!p.startsWith('ge')) continue;
      if (SEP.some((s) => v.startsWith(s) && p.slice(2).startsWith(s))) wrong.push(`${v} → ${p}`);
    }
    expect(wrong).toEqual([]);
  });

  it('leaves verbs that only look prefixed alone', () => {
    // The other half of the rule. Over-eager splitting would break these, and
    // «geantwortet» becoming «antgeworted» is the failure mode.
    expect(conjugate('antworten').partizip).toBe('geantwortet');
    expect(conjugate('teilen').partizip).toBe('geteilt');
    expect(conjugate('reinigen').partizip).toBe('gereinigt');
    expect(conjugate('wahren').partizip).toBe('gewahrt');
    for (const v of NOT_PREFIXED) expect(conjugate(v).separable, v).toBeNull();
  });

  it('splits the ones that are genuinely compound', () => {
    expect(conjugate('kennenlernen').praesens[1]).toBe('lernst kennen');
    expect(conjugate('kennenlernen').partizip).toBe('kennengelernt');
    expect(conjugate('wahrnehmen').praesens[2]).toBe('nimmt wahr');
    expect(conjugate('wahrnehmen').partizip).toBe('wahrgenommen');
    expect(conjugate('klarstellen').partizip).toBe('klargestellt');
    expect(conjugate('mitteilen').partizip).toBe('mitgeteilt');
  });
});
