// Derive grammar exercises from the corpus, instead of writing them by hand.
//
// The bank had 887 authored exercises across 136 points — about six a point,
// which is one sitting and then the point is spent. Getting to ten times that by
// hand is not an authoring job at any quality bar worth having, so this does what
// `authoring/verify.ts` did for vocabulary: **generate candidates from facts the
// corpus already carries, and let a gate refuse the ones it cannot prove.**
//
// ## What can honestly be generated, and what cannot
//
// A gender item is a fact: `das Haus` is neuter, the other two articles are
// wrong, and no judgement enters anywhere. A conjugation item is a fact whenever
// `conjugate()` says `reliable`. A dative-after-*mit* item is a fact given the
// noun's gender. Those are generated here in volume.
//
// *Konzessivsätze: obwohl* is not. Neither is *Partizip Präsens als Adjektiv*, or
// any point whose exercises have to be sentences somebody meant. Those points are
// untouched by this script and stay hand-authored — which is why the output is
// distributed across the derivable points rather than pooled, and why the summary
// prints how many points it could not help.
//
// ## Capped per point, deliberately
//
// 3,590 nouns carry a gender, and appending 3,590 gender questions to A1's
// *Artikel & Genus* would not make that point ten times better; it would make it
// unusable as a lesson and identical to the runtime drill in `lib/quiz.ts`, which
// already generates gender questions without limit. A point is a place you go to
// *learn* something. `CAP` keeps each one to a sitting's worth of new material.
//
// ## Every item is marked
//
// Generated exercises carry `gen: true`. They are correct, but they are correct
// the way a table is correct — an authored item can teach why the answer is what
// it is, and a generated one can only state it. The flag is what lets a surface
// prefer authored items when teaching and generated ones when drilling.
//
//   npm run corpus:genex                 report what would be produced
//   npm run corpus:genex -- --emit       write the batch for corpus:gex
import { writeFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, readJSON } from './lib.ts';
import { conjugate, canConjugate, setKnownVerbs } from '../../src/lib/conjugate.ts';
import type { GExercise, GrammarByLevel } from '../../src/lib/grammar.ts';
import type { CEFR, Word } from '../../src/types.ts';

/** Most a single point may gain.
 *
 *  Started at 60 on the reasoning that a point is a lesson, not a phone book —
 *  which was right about the *scoped* drill (play this point) and wrong about the
 *  bank. Exercises are scheduled individually by FSRS: a learner meets what is
 *  due, never a point's whole contents, so a large point costs nothing until
 *  something walks it end to end. Scoped play was already capped at 25, and now
 *  spends the authored exercises before any generated one (see `GrammarDrill`) —
 *  which is what makes this a supply figure rather than a session length. */
const CAP = 150;

interface Batch { level: CEFR; title: string; exercises: GExercise[] }

const corpus = loadCorpus(PATHS.vocab) as Word[];
setKnownVerbs(corpus.filter((w) => w.pos === 'verb').map((w) => w.term));
const grammar = readJSON<GrammarByLevel>(PATHS.grammar);

const stripArt = (t: string) => t.replace(/^(der|die|das)\s+/i, '');
const ORDER: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Deterministic shuffle — the bank must not churn between runs, because a
 *  re-run that reordered options would rewrite what every learner already saw. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function shuffled<T>(xs: T[], seed: number): T[] {
  const r = rng(seed);
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** A stable per-item seed, so the same card always yields the same option order. */
const seedOf = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Build a `choose` item with the answer placed by a stable shuffle. */
function choose(prompt: string, correct: string, wrong: string[], explain: string): GExercise | null {
  const distinct = [...new Set(wrong.filter((w) => w && w !== correct))];
  if (distinct.length < 2) return null;
  const options = shuffled([correct, ...distinct.slice(0, 3)], seedOf(prompt));
  return { kind: 'choose', prompt, options, answer: options.indexOf(correct), explain, gen: true };
}

/** Cards of a level that a learner at that level would actually have met. */
const atLevel = (lv: CEFR, f: (w: Word) => boolean) => corpus.filter((w) => w.level === lv && f(w));

// ---- the generators --------------------------------------------------------
// Each returns candidates for one point. Order matters only in that the first
// `CAP` survive, so each sorts by something a learner would meet first.

/** der/die/das. The purest fact in the corpus. */
function gender(lv: CEFR): GExercise[] {
  return atLevel(lv, (w) => w.pos === 'noun' && !!w.gender).flatMap((w) => {
    const noun = stripArt(w.term);
    if (/\s/.test(noun)) return [];
    const art = { der: 'Der', die: 'Die', das: 'Das' }[w.gender as 'der' | 'die' | 'das'];
    const ex = choose(`___ ${noun}`, art, ['Der', 'Die', 'Das'],
      `${noun} is ${({ der: 'masculine', die: 'feminine', das: 'neuter' })[w.gender as 'der']} → ${w.gender}.`);
    return ex ? [ex] : [];
  });
}

/** The plural, against wrong forms built from the other plural patterns. A German
 *  noun has one standard plural, so a competing pattern is reliably wrong. */
const umlaut = (s: string) => s.replace(/([aou])(?!.*[aou])/, (m) => ({ a: 'ä', o: 'ö', u: 'ü' }[m] ?? m));
function plural(lv: CEFR): GExercise[] {
  return atLevel(lv, (w) => w.pos === 'noun' && !!w.plural).flatMap((w) => {
    const sg = stripArt(w.term);
    const pl = stripArt(w.plural!);
    // "die –" means no plural, and "die -e" is a shorthand some cards use.
    if (!pl || /[–-]/.test(pl) || /\s/.test(sg) || pl === sg) return [];
    const cands = [`${sg}e`, `${sg}en`, `${sg}er`, `${sg}n`, `${sg}s`, sg,
      `${umlaut(sg)}e`, `${umlaut(sg)}er`, `${umlaut(sg)}`];
    const ex = choose(`Singular: ${w.term} — Plural: die ___`, pl, cands,
      `The plural of ${w.term} is ${w.plural}.`);
    return ex ? [ex] : [];
  });
}

// `sie` is 3sg feminine *and* 3pl, and a prompt reading "sie ___ (frühstücken)"
// has two correct answers — one of which was always in the distractors. The
// plural is labelled.
const MODALS = new Set(['können', 'müssen', 'wollen', 'sollen', 'dürfen', 'mögen']);
const PERSON = ['ich', 'du', 'er', 'wir', 'ihr', 'sie (Pl.)'] as const;
/** The subject as it is actually written in front of the verb. */
const SUBJ = (i: number) => (i === 5 ? 'sie' : PERSON[i]);
/** Present tense, one person a card, against the other five forms. */
function praesens(lv: CEFR, want: 'regular' | 'changing'): GExercise[] {
  const out: GExercise[] = [];
  for (const w of atLevel(lv, (x) => x.pos === 'verb')) {
    const inf = stripArt(w.term).replace(/^sich\s+/i, '');
    if (!canConjugate(inf)) continue;
    const c = conjugate(inf);
    if (c.praesens.some((f) => f.includes(' '))) continue;      // separable: its own point
    // A stem-changing verb changes its stem *vowel* in du/er — geben → gibst,
    // fahren → fährst. Comparing the whole form to stem+st instead flagged every
    // verb that merely takes an epenthetic -e- (mieten → du mietest), so
    // *Verben mit Vokalwechsel* filled up with verbs that do not change a vowel.
    // A stem-changing verb no longer *starts* with its own stem: geb → gibt,
    // fahr → fährt. Comparing vowel sequences instead counted the epenthetic -e-
    // (bedeut → bedeutet) as a change, which filled the point with verbs that do
    // not change anything.
    const stem = inf.replace(/e?n$/, '');
    const changing = !c.praesens[2].startsWith(stem);
    if (MODALS.has(inf)) continue;                    // modals have their own point
    if (want === 'changing' && !changing) continue;
    if (want === 'regular' && changing) continue;
    const i = want === 'changing' ? 2 : (seedOf(inf) % 6);
    const ex = choose(`${PERSON[i]} ___ (${inf})`, c.praesens[i],
      c.praesens.filter((_, j) => j !== i),
      `${PERSON[i]} ${c.praesens[i]} — ${inf}, Präsens.`);
    if (ex) out.push(ex);
  }
  return out;
}

/** Präteritum, table-backed only: a generated past tense for a verb we could not
 *  table is exactly the wrong form this project has already shipped once. */
function praeteritum(lv: CEFR): GExercise[] {
  const out: GExercise[] = [];
  for (const w of atLevel(lv, (x) => x.pos === 'verb')) {
    const inf = stripArt(w.term).replace(/^sich\s+/i, '');
    if (!canConjugate(inf)) continue;
    const c = conjugate(inf);
    if (c.praeteritum.some((f) => f.includes(' '))) continue;
    const i = seedOf(inf) % 6;
    const ex = choose(`${PERSON[i]} ___ (${inf}, Präteritum)`, c.praeteritum[i],
      [...c.praeteritum.filter((_, j) => j !== i), c.praesens[i]],
      `${PERSON[i]} ${c.praeteritum[i]} — the Präteritum of ${inf}.`);
    if (ex) out.push(ex);
  }
  return out;
}

/** haben or sein — the whole of the Perfekt for most learners. */
function perfektAux(lv: CEFR): GExercise[] {
  const out: GExercise[] = [];
  for (const w of atLevel(lv, (x) => x.pos === 'verb')) {
    const inf = stripArt(w.term).replace(/^sich\s+/i, '');
    if (!canConjugate(inf)) continue;
    const c = conjugate(inf);
    if (c.reflexive || c.partizip.includes(' ')) continue;
    const correct = c.aux === 'sein' ? 'bin' : 'habe';
    const ex = choose(`Ich ___ ${c.partizip}. (${inf})`, correct, ['bin', 'habe', 'bist', 'hat'],
      c.aux === 'sein'
        ? `${inf} takes sein — it is a change of place or state.`
        : `${inf} takes haben, like most verbs.`);
    if (ex) out.push(ex);
  }
  return out;
}

/** A preposition that fixes its case, plus a noun whose gender is known. The
 *  answer follows from the two; nothing is guessed. */
const DAT_ART = { der: 'dem', die: 'der', das: 'dem' } as const;
const AKK_ART = { der: 'den', die: 'die', das: 'das' } as const;
function prepCase(lv: CEFR, kase: 'dat' | 'akk'): GExercise[] {
  const preps = kase === 'dat'
    ? ['mit', 'bei', 'nach', 'aus', 'von', 'zu', 'seit']
    : ['für', 'ohne', 'durch', 'gegen', 'um'];
  const table = kase === 'dat' ? DAT_ART : AKK_ART;
  const wrong = kase === 'dat' ? ['dem', 'der', 'den', 'das'] : ['den', 'die', 'das', 'dem'];
  const out: GExercise[] = [];
  for (const w of atLevel(lv, (x) => x.pos === 'noun' && !!x.gender)) {
    const noun = stripArt(w.term);
    if (/\s/.test(noun)) continue;
    const prep = preps[seedOf(noun) % preps.length];
    const correct = table[w.gender as 'der'];
    const ex = choose(`${prep} ___ ${noun}`, correct, wrong,
      `${prep} always takes the ${kase === 'dat' ? 'Dativ' : 'Akkusativ'}, and ${w.term} is `
      + `${({ der: 'masculine', die: 'feminine', das: 'neuter' })[w.gender as 'der']} → ${correct}.`);
    if (ex) out.push(ex);
  }
  return out;
}

/** Modal verbs, whose present tense is irregular in a way learners reliably get
 *  wrong in the singular (ich kann, not *ich kanne). */
function modals(lv: CEFR): GExercise[] {
  const out: GExercise[] = [];
  for (const inf of ['können', 'müssen', 'wollen', 'sollen', 'dürfen', 'mögen']) {
    const c = conjugate(inf);
    for (let i = 0; i < 6; i++) {
      const ex = choose(`${PERSON[i]} ___ (${inf})`, c.praesens[i],
        c.praesens.filter((_, j) => j !== i),
        `${PERSON[i]} ${c.praesens[i]} — modals lose the ending in ich and er, and change their vowel in the singular.`);
      if (ex) out.push(ex);
    }
  }
  return lv === 'A1' ? out : [];
}

/** Separable verbs: the finite verb goes to position two and the prefix to the
 *  end, which is the whole point and the thing that is written as one word by
 *  mistake. */
function separable(lv: CEFR): GExercise[] {
  const out: GExercise[] = [];
  for (const w of atLevel(lv, (x) => x.pos === 'verb')) {
    const inf = stripArt(w.term).replace(/^sich\s+/i, '');
    if (!canConjugate(inf)) continue;
    const c = conjugate(inf);
    if (!c.separable) continue;
    const [stem, particle] = c.praesens[2].split(/\s+/);
    if (!particle) continue;
    const ex = choose(`Er ___ . (${inf})`, `${stem} ${particle}`,
      [inf.replace(/^(\w+?)(en|n)$/, '$1$2'), `${particle} ${stem}`, `${particle}${stem}`],
      `${inf} is separable: the verb is ${stem} and ${particle} goes to the end of the clause.`);
    if (ex) out.push(ex);
  }
  return out;
}


/** Adjective endings. A table, and the single most mechanical thing in German —
 *  which is exactly why it can be generated and exactly why learners lose marks
 *  on it. Three tables, because the article in front changes all of them. */
type Kase = 'nom' | 'akk' | 'dat';
type Gen = 'der' | 'die' | 'das';
const WEAK: Record<Kase, Record<Gen, string>> = {
  nom: { der: 'e', die: 'e', das: 'e' },
  akk: { der: 'en', die: 'e', das: 'e' },
  dat: { der: 'en', die: 'en', das: 'en' },
};
const MIXED: Record<Kase, Record<Gen, string>> = {
  nom: { der: 'er', die: 'e', das: 'es' },
  akk: { der: 'en', die: 'e', das: 'es' },
  dat: { der: 'en', die: 'en', das: 'en' },
};
const STRONG: Record<Kase, Record<Gen, string>> = {
  nom: { der: 'er', die: 'e', das: 'es' },
  akk: { der: 'en', die: 'e', das: 'es' },
  dat: { der: 'em', die: 'er', das: 'em' },
};
const DEF: Record<Kase, Record<Gen, string>> = {
  nom: { der: 'der', die: 'die', das: 'das' },
  akk: { der: 'den', die: 'die', das: 'das' },
  dat: { der: 'dem', die: 'der', das: 'dem' },
};
const INDEF: Record<Kase, Record<Gen, string>> = {
  nom: { der: 'ein', die: 'eine', das: 'ein' },
  akk: { der: 'einen', die: 'eine', das: 'ein' },
  dat: { der: 'einem', die: 'einer', das: 'einem' },
};
const KASE_NAME: Record<Kase, string> = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ' };


// Curated frames for the two generators that pair a word with a word.
//
// The endings are a fact; *which noun goes with which adjective* is not, and
// pairing the corpus at random produced grammatically flawless nonsense — "das
// verheiratete Glas", "ein lila Detail", "unter die Rede". A learner cannot tell
// a drill frame from a claim about German, so the pairs come from a list somebody
// read instead. Only the declension is generated.
//
// Adjectives here all decline by plain suffixation. `teuer`, `dunkel` and `hoch`
// are deliberately absent: they elide or change stem (teuer → teure, hoch → hohe)
// and appending an ending to them produces a wrong form.
const ADJ_POOL = ['alt', 'neu', 'gut', 'groß', 'klein', 'schön', 'billig', 'schwer',
  'leicht', 'interessant', 'modern', 'wichtig', 'jung', 'kalt', 'warm', 'ruhig',
  'freundlich', 'schnell', 'langsam', 'stark'];
const NOUN_POOL: Record<Gen, string[]> = {
  der: ['Tisch', 'Stuhl', 'Wagen', 'Garten', 'Schrank', 'Mantel', 'Koffer', 'Weg'],
  die: ['Wohnung', 'Straße', 'Tasche', 'Küche', 'Lampe', 'Stadt', 'Frage', 'Idee'],
  das: ['Haus', 'Zimmer', 'Buch', 'Auto', 'Fenster', 'Bild', 'Hemd', 'Kind'],
};
/** Nouns you can be *in*, *on* or *under* — the Wechselpräposition frames. */
const PLACE_POOL: Record<Gen, string[]> = {
  der: ['Tisch', 'Stuhl', 'Schrank', 'Garten'],
  die: ['Küche', 'Schule', 'Straße', 'Tasche'],
  das: ['Zimmer', 'Haus', 'Bett', 'Fenster'],
};
const GENDERS: Gen[] = ['der', 'die', 'das'];

/** One adjective + one noun, declined. `kind` picks which of the three tables. */
function adjEndings(lv: CEFR, kind: 'weak' | 'mixed' | 'strong'): GExercise[] {
  const table = kind === 'weak' ? WEAK : kind === 'mixed' ? MIXED : STRONG;
  const out: GExercise[] = [];
  for (const adj of ADJ_POOL) {
    for (const g of GENDERS) {
      for (const noun of NOUN_POOL[g]) {
        for (const kase of ['nom', 'akk', 'dat'] as Kase[]) {
          const ending = table[kase][g];
          const frame = kind === 'weak' ? `${DEF[kase][g]} `
            : kind === 'mixed' ? `${INDEF[kase][g]} ` : '';
          const ex = choose(`${frame}${adj}___ ${noun} (${KASE_NAME[kase]})`, `-${ending}`,
            ['-e', '-en', '-er', '-es', '-em'],
            `${KASE_NAME[kase]}, ${({ der: 'maskulin', die: 'feminin', das: 'neutrum' })[g]}, `
            + `${kind === 'weak' ? 'nach bestimmtem Artikel' : kind === 'mixed' ? 'nach unbestimmtem Artikel' : 'ohne Artikel'}`
            + ` → ${adj}${ending}.`);
          if (ex) out.push(ex);
        }
      }
    }
  }
  return lv === 'A1' ? [] : out;
}

/** Verbs with no du-imperative, or an irregular one this rule would get wrong:
 *  modals have none at all, and sein/haben/werden are sei!, hab!, werde!. */
const NO_IMPERATIVE = new Set(['können', 'müssen', 'wollen', 'sollen', 'dürfen', 'mögen',
  'sein', 'haben', 'werden', 'wissen']);

/** The du-imperative: the du-form with its ending taken off, and no pronoun. */
function imperativ(lv: CEFR): GExercise[] {
  const out: GExercise[] = [];
  for (const w of atLevel(lv, (x) => x.pos === 'verb')) {
    const inf = stripArt(w.term).replace(/^sich\s+/i, '');
    if (!canConjugate(inf)) continue;
    const c = conjugate(inf);
    const du = c.praesens[1];
    if (du.includes(' ') || !du.endsWith('st')) continue;
    // Modals have no imperative at all, and sein/haben/werden have irregular ones
    // (sei!, hab!, werde!) that this rule would get wrong.
    if (NO_IMPERATIVE.has(inf)) continue;
    // e→i keeps the change (gib!), a→ä reverts (du fährst → fahr!). Generating
    // *fähr!* is the kind of wrong form that is worse than no exercise.
    // A sibilant stem takes only -t in du (du vergisst, du heißt), so the ending
    // to remove is one letter, not two. Slicing two gave *vergis!*.
    let imp = /(ss|ß|z|x)t$/.test(du) ? du.slice(0, -1) : du.slice(0, -2);
    if (/[äöü]/.test(imp) && !/[äöü]/.test(inf)) imp = imp.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
    const ex = choose(`___ ! (${inf}, du-Imperativ)`, imp, [du, c.praesens[2], inf, `${imp}e`],
      `The du-imperative is the du-form without -st: du ${du} → ${imp}!`);
    if (ex) out.push(ex);
  }
  return out;
}

/** Verbs that reliably take a personal passive. Read rather than derived — see
 *  the note in `periphrastic`. */
const TRANSITIVE = new Set([
  'bauen', 'bezahlen', 'bringen', 'einladen', 'entdecken', 'erklären', 'essen', 'finden',
  'fotografieren', 'fragen', 'holen', 'hören', 'kaufen', 'kochen', 'kontrollieren', 'korrigieren',
  'kritisieren', 'lesen', 'lieben', 'lösen', 'machen', 'malen', 'nehmen', 'öffnen', 'organisieren',
  'planen', 'prüfen', 'putzen', 'reparieren', 'rufen', 'sammeln', 'schließen', 'schreiben',
  'sehen', 'servieren', 'singen', 'sortieren', 'stören', 'suchen', 'tragen', 'trinken', 'üben',
  'unterschreiben', 'untersuchen', 'verkaufen', 'verlieren', 'verstehen', 'vorbereiten', 'waschen',
  'wecken', 'zeigen', 'benutzen', 'beschreiben', 'besuchen', 'bestellen', 'bedienen', 'beobachten',
]);

/** A periphrastic tense is werden/würde/hatte + a form we already generate. All
 *  three are the same shape, so they are one generator with three auxiliaries. */
function periphrastic(lv: CEFR, kind: 'futur' | 'konj2' | 'plusq' | 'passiv'): GExercise[] {
  const AUX: Record<string, string[]> = {
    futur: ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'],
    konj2: ['würde', 'würdest', 'würde', 'würden', 'würdet', 'würden'],
    passiv: ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'],
    plusq: ['hatte', 'hattest', 'hatte', 'hatten', 'hattet', 'hatten'],
  };
  const out: GExercise[] = [];
  for (const w of atLevel(lv, (x) => x.pos === 'verb')) {
    const inf = stripArt(w.term).replace(/^sich\s+/i, '');
    if (!canConjugate(inf)) continue;
    const c = conjugate(inf);
    if (c.reflexive || c.partizip.includes(' ')) continue;
    // Only a transitive verb has a personal passive, and nothing in the corpus
    // records transitivity. `aux === 'haben'` was the nearest proxy and it is not
    // good enough — *du wirst weggezogen* and *ihr werdet spaziert* both cleared
    // it. So the passive draws from a read list instead; everything else here is
    // derived, and this one is not, and that is the honest split.
    if (kind === 'passiv' && !TRANSITIVE.has(inf)) continue;
    const i = seedOf(inf + kind) % 6;
    const aux = AUX[kind];
    // Plusquamperfekt takes war- for sein-verbs; only haben-verbs are generated.
    if (kind === 'plusq' && c.aux !== 'haben') continue;
    const tail = kind === 'futur' || kind === 'konj2' ? inf : c.partizip;
    const label = { futur: 'Futur I', konj2: 'Konjunktiv II', plusq: 'Plusquamperfekt', passiv: 'Passiv Präsens' }[kind];
    const ex = choose(`${PERSON[i]} ___ ${tail}. (${label})`, aux[i],
      [...aux.filter((_, j) => j !== i), c.praesens[i]],
      `${label}: ${PERSON[i]} ${aux[i]} ${tail}.`);
    if (ex) out.push(ex);
  }
  return out;
}

/** Genitive: -s on masculine and neuter, nothing on feminine, and der/des in
 *  front. The ending is the half learners forget. */
function genitiv(lv: CEFR): GExercise[] {
  const out: GExercise[] = [];
  for (const w of atLevel(lv, (x) => x.pos === 'noun' && !!x.gender)) {
    const noun = stripArt(w.term);
    if (/\s/.test(noun)) continue;
    const fem = w.gender === 'die';
    const correct = fem ? 'der' : 'des';
    const ex = choose(`das Ende ___ ${noun}${fem ? '' : 's'}`, correct, ['des', 'der', 'dem', 'den'],
      fem ? `Feminine nouns take der in the Genitiv and add no -s.`
        : `Masculine and neuter nouns take des and add -s: ${correct} ${noun}s.`);
    if (ex) out.push(ex);
  }
  return out;
}

/** Possessives decline like ein: the ending follows gender and case. */
function possessiv(lv: CEFR): GExercise[] {
  const out: GExercise[] = [];
  const stems = ['mein', 'dein', 'sein', 'ihr', 'unser'];
  for (const w of atLevel(lv, (x) => x.pos === 'noun' && !!x.gender)) {
    const noun = stripArt(w.term);
    if (/\s/.test(noun)) continue;
    const stem = stems[seedOf(noun) % stems.length];
    const g = w.gender as Gen;
    const kase = (['nom', 'akk', 'dat'] as Kase[])[seedOf(noun + 'p') % 3];
    // `.replace(/^eine?/, '')` ate the -e of *eine* and the -e- of *einem*, so
    // feminine nominative came out as `mein` and dative as `meinm`. The stem is
    // exactly `ein`.
    const tail = INDEF[kase][g].replace(/^ein/, '');
    const correct = stem + tail;
    const ex = choose(`___ ${noun} (${stem}, ${KASE_NAME[kase]})`, correct,
      ['', 'e', 'en', 'em', 'er'].map((t) => stem + t),
      `Possessives take ein-endings: ${KASE_NAME[kase]}, `
      + `${({ der: 'maskulin', die: 'feminin', das: 'neutrum' })[g]} → ${correct}.`);
    if (ex) out.push(ex);
  }
  return out;
}

/** Reflexive verbs, which the corpus marks by carrying `sich` in the term. */
function reflexiv(lv: CEFR): GExercise[] {
  const REFL = ['mich', 'dich', 'sich', 'uns', 'euch', 'sich'];
  const out: GExercise[] = [];
  for (const w of atLevel(lv, (x) => x.pos === 'verb' && /^sich\s/i.test(x.term))) {
    const inf = stripArt(w.term).replace(/^sich\s+/i, '');
    if (!canConjugate(inf)) continue;
    const c = conjugate(inf);
    if (c.praesens.some((f) => f.includes(' '))) continue;
    const i = seedOf(inf) % 6;
    const ex = choose(`${PERSON[i]} ${SUBJ(i) === 'sie' ? c.praesens[i] : c.praesens[i]} ___ . (sich ${inf})`, REFL[i],
      REFL.filter((_, j) => j !== i),
      `The reflexive pronoun agrees with the subject: ${PERSON[i]} → ${REFL[i]}.`);
    if (ex) out.push(ex);
  }
  return out;
}

/** Wechselpräpositionen: the case is decided by the question, not the
 *  preposition — wohin takes Akkusativ, wo takes Dativ. */
function wechsel(lv: CEFR): GExercise[] {
  const preps = ['in', 'auf', 'unter', 'neben', 'vor', 'hinter'];
  const out: GExercise[] = [];
  for (const prep of preps) {
    for (const g of GENDERS) {
      for (const noun of PLACE_POOL[g]) {
        for (const motion of [true, false]) {
          const correct = motion ? AKK_ART[g] : DAT_ART[g];
          const ex = choose(`${motion ? 'Wohin' : 'Wo'}? — ${prep} ___ ${noun}`, correct,
            ['den', 'die', 'das', 'dem', 'der'],
            motion
              ? `Wohin? — movement towards a place takes the Akkusativ → ${prep} ${correct} ${noun}.`
              : `Wo? — position takes the Dativ → ${prep} ${correct} ${noun}.`);
          if (ex) out.push(ex);
        }
      }
    }
  }
  return lv === 'A1' ? [] : out;
}

// ---- what goes where -------------------------------------------------------
// Only points whose construction is derivable. Everything else stays authored,
// and the summary says how many that is.

const PLAN: { level: CEFR; title: string; make: (lv: CEFR) => GExercise[] }[] = [
  { level: 'A1', title: 'Artikel & Genus', make: gender },
  { level: 'A1', title: 'Pluralbildung (die Nomen im Plural)', make: plural },
  { level: 'A1', title: 'Präsens (regelmäßig)', make: (lv) => praesens(lv, 'regular') },
  { level: 'A1', title: 'Verben mit Vokalwechsel', make: (lv) => praesens(lv, 'changing') },
  { level: 'A1', title: 'Perfekt', make: perfektAux },
  { level: 'A1', title: 'Modalverben', make: modals },
  { level: 'A1', title: 'Trennbare Verben', make: separable },
  { level: 'A1', title: 'Imperativ', make: imperativ },
  { level: 'A1', title: 'Possessivartikel', make: possessiv },
  { level: 'A1', title: 'Possessivartikel (mein, dein …)', make: possessiv },
  { level: 'A1', title: 'Ortsangaben mit Dativ', make: (lv) => prepCase(lv, 'dat') },
  { level: 'A1', title: 'Präpositionen mit Akkusativ (durch, für, gegen, ohne, um)', make: (lv) => prepCase(lv, 'akk') },

  { level: 'A2', title: 'Akkusativ', make: (lv) => prepCase(lv, 'akk') },
  { level: 'A2', title: 'Präpositionen mit Dativ (aus, bei, mit, nach, seit, von, zu)', make: (lv) => prepCase(lv, 'dat') },
  { level: 'A2', title: 'Präteritum', make: praeteritum },
  { level: 'A2', title: 'Wechselpräpositionen', make: wechsel },
  { level: 'A2', title: 'Reflexive Verben', make: reflexiv },
  { level: 'A2', title: 'Adjektivdeklination: nach bestimmtem Artikel (schwach)', make: (lv) => adjEndings(lv, 'weak') },
  { level: 'A2', title: 'Adjektivdeklination: indefiniter Artikel', make: (lv) => adjEndings(lv, 'mixed') },
  { level: 'A2', title: 'Adjektivdeklination: ohne Artikel', make: (lv) => adjEndings(lv, 'strong') },
  { level: 'A2', title: 'Passiv Präsens', make: (lv) => periphrastic(lv, 'passiv') },
  { level: 'A2', title: 'Konjunktiv II: Wünsche & Vorschläge', make: (lv) => periphrastic(lv, 'konj2') },
  { level: 'A2', title: 'Wortbildung: Nomen & Diminutiv', make: plural },

  { level: 'B1', title: 'Präteritum', make: praeteritum },
  { level: 'B1', title: 'Dativ', make: (lv) => prepCase(lv, 'dat') },
  { level: 'B1', title: 'Genitiv', make: genitiv },
  { level: 'B1', title: 'Futur I', make: (lv) => periphrastic(lv, 'futur') },
  { level: 'B1', title: 'Konjunktiv II (würde)', make: (lv) => periphrastic(lv, 'konj2') },
  { level: 'B1', title: 'Plusquamperfekt & nachdem/bevor', make: (lv) => periphrastic(lv, 'plusq') },
  { level: 'B1', title: 'Adjektivdeklination: nach unbestimmtem Artikel (gemischt)', make: (lv) => adjEndings(lv, 'mixed') },
  { level: 'B1', title: 'Adjektivdeklination: ohne Artikel (stark)', make: (lv) => adjEndings(lv, 'strong') },
  { level: 'B1', title: 'Passiv: Perfekt & Modalverben', make: (lv) => periphrastic(lv, 'passiv') },

  { level: 'B2', title: 'Passiv', make: (lv) => periphrastic(lv, 'passiv') },
  { level: 'B2', title: 'Adjektivdeklination', make: (lv) => adjEndings(lv, 'mixed') },
  { level: 'B2', title: 'Konjunktiv II (Gegenwart)', make: (lv) => periphrastic(lv, 'konj2') },
];

// Levels above the point's own supply the vocabulary too: a B1 learner drilling
// Präteritum should meet B1 verbs, but an A1 point should never reach upward.
const SUPPLY: Record<string, CEFR[]> = {
  A1: ['A1'], A2: ['A1', 'A2'], B1: ['A2', 'B1'], B2: ['B1', 'B2'], C1: ['B2', 'C1'], C2: ['C1', 'C2'],
};

const batches: Batch[] = [];
let total = 0;
const lines: string[] = [];

for (const { level, title, make } of PLAN) {
  const point = (grammar[level] ?? []).find((p) => p.title === title);
  if (!point) { console.error(`✗ no such point: ${level} · ${title}`); continue; }
  const have = new Set(point.exercises.map((e) => e.prompt.trim()));

  const pool: GExercise[] = [];
  for (const supplyLevel of SUPPLY[level] ?? [level]) {
    for (const e of make(supplyLevel)) {
      if (have.has(e.prompt.trim())) continue;
      have.add(e.prompt.trim());
      pool.push(e);
    }
  }
  // Stable pick, so a corpus that grows by ten cards does not reshuffle the bank.
  const take = shuffled(pool, seedOf(`${level}:${title}`)).slice(0, CAP);
  if (!take.length) continue;
  batches.push({ level, title, exercises: take });
  total += take.length;
  lines.push(`  ${level} · ${title}: +${take.length} (of ${pool.length} available)`);
}

const bankTotal = ORDER.reduce((n, lv) => n + (grammar[lv] ?? []).reduce((m, p) => m + p.exercises.length, 0), 0);
const pointTotal = ORDER.reduce((n, lv) => n + (grammar[lv] ?? []).length, 0);

console.log(`bank ${bankTotal} → ${bankTotal + total} across ${pointTotal} points`);
console.log(`generated ${total} into ${batches.length} derivable points; `
  + `${pointTotal - batches.length} points stay authored (their exercises cannot be derived)`);
for (const l of lines) console.log(l);

if (process.argv.includes('--emit')) {
  const out = 'scripts/corpus/batches/generated-exercises.json';
  writeFileSync(out, JSON.stringify(batches, null, 1));
  console.log(`\n→ ${out}\n  Next: npm run corpus:gex -- ${out} --write`);
}
