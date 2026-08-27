// Duplicate grammar points — measured, ruled, and kept from drifting.
//
// ## Why this exists rather than a merge
//
// Writing lessons for all 133 points made the overlap impossible to miss: several
// concepts are taught twice at different levels, and B1 teaches the passive three
// times. The obvious response is to merge them. **That would silently destroy a
// learner's schedule.**
//
// Grammar exercise cards are keyed `gex:<level>:<title>:<xi>` — on the *title*.
// That is stable across reordering, which is what `data/gexmap.ts` was built to
// fix, and it is **not** stable across renaming or merging: retire a point and
// every FSRS record pointing at it is orphaned, with nothing to detect it. There
// is no title→title migration and `gexmap.ts` is marked "do not regenerate".
//
// LESSONS is unambiguous about this class: *moving, renaming, relevelling or
// merging is a schedule migration.* So this file does not merge anything. It
// measures, and it records a hand-verified verdict per pair, so that:
//
//   1. the finding is re-derivable rather than a number in a changelog, and
//   2. a **new** duplicate cannot appear without failing the check.
//
// Same shape as `dupe-rulings.tsv`, `form-rulings.tsv` and `case-rulings.tsv`,
// which already solve this problem for cards.
//
// ## The check was wrong first, which is why the rulings are hand-verified
//
// The first version tokenised titles by dropping anything under four characters.
// That scored **Futur I against Futur II at 1.00** — the roman numeral was the
// only thing distinguishing them and it had been thrown away. Two entirely
// different tenses, reported as identical. Hand-verifying three hits before
// trusting the count is exactly what LESSONS' checklist asks for, and it caught
// this on the first one.
//
//   node scripts/corpus/dupe-points.ts            # report
//   node scripts/corpus/dupe-points.ts --check    # non-zero if an unruled pair appears
//   node scripts/corpus/dupe-points.ts --write    # refresh the TSV record
import { readFileSync, writeFileSync } from 'node:fs';
import type { CEFR } from '../../src/types.ts';
import type { GPoint } from '../../src/lib/grammar.ts';

const PATH = 'public/data/grammar.json';
const TSV = 'scripts/corpus/dupe-points.tsv';
const write = process.argv.includes('--write');
const checkOnly = process.argv.includes('--check');

type Verdict = 'duplicate' | 'distinct' | 'progression';

/** Hand-verified, one per candidate pair the detector raises.
 *
 *   duplicate   — the same concept taught twice. A merge candidate, blocked on a
 *                 schedule migration and on a pedagogic ruling about which level
 *                 keeps it. Not actionable by a script.
 *   progression — deliberately taught twice, building. A1 meets the dative through
 *                 place; B1 meets the case itself. Keep both.
 *   distinct    — the detector was wrong. Different concepts.
 *
 * Key is `<level>::<title>||<level>::<title>`, levels in bank order.
 *
 * **Every entry here is a pair the detector currently raises.** A ruling for a pair
 * that never surfaces is a ruling nobody can check, so those are removed rather than
 * kept — including two of my own that were wrong *in kind*:
 * `B1::Relativsätze mit Präpositionen` against `B2::Relativsätze` is not duplication
 * at all. The content differs; the **order** is inverted, with the advanced
 * constructions taught a level before the basic paradigm. That is a sequencing
 * finding and it belongs in the BACKLOG, not in a duplicate table — filing it here
 * would have made this check appear to cover a problem it cannot see. */
const RULINGS: Record<string, { verdict: Verdict; why: string }> = {
  // ---- the detector was wrong ------------------------------------------------
    'A1::sein & haben||A1::Präteritum: sein & haben': {
    verdict: 'progression',
    why: 'present, then past, of the same two verbs. Deliberately sequenced — the second is meaningless without the first',
  },
  'A1::Personalpronomen (Akkusativ)||A2::Personalpronomen (Akkusativ & Dativ)': {
    verdict: 'progression',
    why: 'A1 gives one pronoun set, A2 adds the second and contrasts them',
  },
  'A1::Personalpronomen (Akkusativ)||A2::Akkusativ': {
    verdict: 'distinct',
    why: 'the pronoun paradigm against the case itself. Shared word, different subject',
  },
  'A1::Ortsangaben mit Dativ||B1::Dativ': {
    verdict: 'progression',
    why: 'A1 meets the dative as a fact about place prepositions; B1 teaches the case and its four jobs',
  },
  'A1::Modalverben||B2::Subjektive Modalverben': {
    verdict: 'distinct',
    why: 'objective modality (permission, obligation) against epistemic (hearsay, certainty). Same six words, unrelated jobs',
  },
    'A2::Adjektivdeklination: indefiniter Artikel||A2::Adjektivdeklination: ohne Artikel': {
    verdict: 'progression',
    why: 'two of the three declension types, deliberately split across pages',
  },
    'A2::Adjektivdeklination: indefiniter Artikel||B1::Adjektivdeklination: ohne Artikel (stark)': {
    verdict: 'distinct',
    why: 'mixed against strong. Different tables',
  },
  'A2::Wortbildung: Nomen & Diminutiv||B1::Wortbildung: Komposita (Nomen)': {
    verdict: 'distinct',
    why: 'suffixation and the diminutive against compounding. Both are word formation; neither teaches the other',
  },
  'A2::Konjunktiv II: Wünsche & Vorschläge||B1::Konjunktiv II der Vergangenheit (irreale Wünsche)': {
    verdict: 'progression',
    why: 'present subjunctive, then past. The second builds on the first',
  },
  'B1::Passiv: Perfekt & Modalverben||B1::Lassen & Modalverben im Perfekt': {
    verdict: 'distinct',
    why: 'passive with a modal against the double-infinitive perfect of lassen and the modals',
  },
  'B2::Passiv||B2::Passiv-Ersatzformen': {
    verdict: 'distinct',
    why: 'the passive against the constructions used to avoid it (man, sich lassen, -bar)',
  },

  // ---- raised only once the detector compared summaries as well as titles ----
  'A2::Adjektivdeklination: nach bestimmtem Artikel (schwach)||A2::Adjektivdeklination: ohne Artikel': {
    verdict: 'progression', why: 'weak and strong — two of the three types, split across pages on purpose',
  },
  'A2::Adjektivdeklination: nach bestimmtem Artikel (schwach)||A2::Adjektivdeklination: indefiniter Artikel': {
    verdict: 'progression', why: 'weak and mixed — same system, different determiner',
  },
  'A2::Adjektivdeklination: nach bestimmtem Artikel (schwach)||B1::Adjektivdeklination: ohne Artikel (stark)': {
    verdict: 'distinct', why: 'weak against strong. Opposite ends of the system',
  },
  'A2::Adjektivdeklination: ohne Artikel||B1::Adjektivdeklination: nach unbestimmtem Artikel (gemischt)': {
    verdict: 'distinct', why: 'strong against mixed',
  },
  'A2::Adjektivdeklination: ohne Artikel||B2::Adjektivdeklination': {
    verdict: 'progression', why: 'one type, then the B2 page that consolidates all three under a single rule',
  },
  'B1::Adjektivdeklination: nach unbestimmtem Artikel (gemischt)||B1::Adjektivdeklination: ohne Artikel (stark)': {
    verdict: 'progression', why: 'mixed and strong, both at B1 — the two halves B1 adds to A2\'s weak table',
  },
  'B1::Konjunktiv II (würde)||C1::Konjunktiv II Vergangenheit': {
    verdict: 'progression', why: 'present subjunctive, then past',
  },
  'B2::Konjunktiv II (Gegenwart)||C1::Konjunktiv II Vergangenheit': {
    verdict: 'progression', why: 'present, then past',
  },
  'A2::Konjunktiv II: Wünsche & Vorschläge||C1::Konjunktiv II Vergangenheit': {
    verdict: 'progression', why: 'present, then past',
  },
  'B1::statt / ohne … zu + Infinitiv||B2::Infinitiv mit zu': {
    verdict: 'distinct', why: 'two specific conjunctions taking an infinitive clause, against the general zu-infinitive and its trigger list',
  },

  // ---- more real duplicates, from the same widened detector ------------------
  'A1::Possessivartikel||A1::Possessivartikel (mein, dein …)': {
    verdict: 'duplicate',
    why: 'the same point twice **inside A1**, under two spellings of one title. Invisible to a title-only check because one carries a parenthetical. The worst duplicate in the bank: a learner meets both in the same chapter',
  },
  'B1::Plusquamperfekt & nachdem/bevor||B2::Plusquamperfekt': {
    verdict: 'duplicate', why: 'same tense, same construction, same nachdem pairing',
  },
  'B1::Passiv: Perfekt & Modalverben||B2::Passiv Perfekt: „ist … worden“': {
    verdict: 'duplicate', why: 'the third page in the bank teaching worden-not-geworden',
  },
  'A2::Konjunktiv II: Wünsche & Vorschläge||B1::Konjunktiv II (würde)': {
    verdict: 'duplicate', why: 'both teach the *present* Konjunktiv II with the same four forms',
  },
  'A2::Konjunktiv II: Wünsche & Vorschläge||B2::Konjunktiv II (Gegenwart)': {
    verdict: 'duplicate', why: 'present Konjunktiv II again — the third page for one construction',
  },
  'B1::Konjunktiv II (würde)||B2::Konjunktiv II (Gegenwart)': {
    verdict: 'duplicate', why: 'present Konjunktiv II, taught at both levels with the same form list',
  },
  'A2::Adjektivdeklination: indefiniter Artikel||B1::Adjektivdeklination: nach unbestimmtem Artikel (gemischt)': {
    verdict: 'duplicate', why: 'both are the mixed declension after ein-words. Same table, two levels',
  },
  'B1::Konjunktion: als ob (irreal)||C2::Irreale Vergleiche (als ob)': {
    verdict: 'duplicate', why: 'same construction and same subjunctive. C2 adds only the bare-als variant',
  },

  // ---- real duplicates, blocked on a migration + a pedagogic ruling ----------
  'B1::Finalsätze: damit & um … zu||B2::Finalsätze (um … zu / damit)': {
    verdict: 'duplicate',
    why: 'same rule, same two examples, same level of detail. The clearest duplicate in the bank',
  },
  'B1::Passiv Perfekt & Präteritum||B2::Passiv Perfekt: „ist … worden“': {
    verdict: 'duplicate',
    why: 'both teach worden-not-geworden; the B2 page is a strict subset of the B1 one',
  },
  'B1::Passiv: Perfekt & Modalverben||B1::Passiv Perfekt & Präteritum': {
    verdict: 'duplicate',
    why: 'the perfect passive taught twice **inside B1**. The worst case, because a learner meets both in one level',
  },
  'A2::Passiv Präsens||B2::Passiv': {
    verdict: 'duplicate',
    why: 'the B2 page re-teaches the present passive A2 already gave. B2 should start at the Zustandspassiv',
  },
  'A2::Verbindungsadverbien: trotzdem & deshalb||B2::Konnektoren (deshalb/trotzdem)': {
    verdict: 'duplicate',
    why: 'same two connectors, same word-order point',
  },
  'B1::Infinitivsätze (zu + Infinitiv)||B2::Infinitiv mit zu': {
    verdict: 'duplicate',
    why: 'same construction, same trigger list',
  },
  'B1::Konjunktiv II der Vergangenheit (irreale Wünsche)||C1::Konjunktiv II Vergangenheit': {
    verdict: 'duplicate',
    why: 'identical construction and identical framing as regrets. Two levels apart',
  },
  'A2::Adjektivdeklination: ohne Artikel||B1::Adjektivdeklination: ohne Artikel (stark)': {
    verdict: 'duplicate',
    why: 'the same table under two names',
  },
  'A2::Nebensätze: wenn & als||B2::Temporale Nebensätze (als/wenn/nachdem/bevor)': {
    verdict: 'duplicate',
    why: 'B2 restates the A2 als/wenn split and adds nachdem/bevor. Overlapping rather than building',
  },
    };

// ---------------------------------------------------------------------------

/** Tokenise a title for comparison.
 *
 *  Keeps numerals and roman numerals, which the first version dropped — that is
 *  what scored Futur I against Futur II at 1.00. Keeps short tokens generally, and
 *  removes only genuine stopwords, listed rather than inferred from length. */
const STOP = new Set(['mit', 'und', 'der', 'die', 'das', 'den', 'dem', 'für', 'als', 'nach', 'ohne', 'im', 'in', 'zu']);
function tokens(t: string): string[] {
  return t.toLowerCase()
    .replace(/[^a-zäöüß0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
}

const jaccard = (a: string[], b: string[]) => {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (A.size + B.size - inter || 1);
};

const bank = JSON.parse(readFileSync(PATH, 'utf8')) as Record<CEFR, GPoint[]>;
const all: { level: CEFR; p: GPoint }[] = [];
for (const level of Object.keys(bank) as CEFR[]) for (const p of bank[level]) all.push({ level, p });

interface Cand { key: string; score: number; a: { level: CEFR; p: GPoint }; b: { level: CEFR; p: GPoint } }
const cands: Cand[] = [];
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    const t = jaccard(tokens(a.p.title), tokens(b.p.title));
    // Summary overlap catches pairs whose titles diverge but whose teaching does not.
    const su = jaccard(tokens(a.p.summary), tokens(b.p.summary));
    const score = Math.max(t, (t + su) / 2 + (su > 0.5 ? 0.15 : 0));
    if (score >= 0.34) cands.push({ key: `${a.level}::${a.p.title}||${b.level}::${b.p.title}`, score, a, b });
  }
}
cands.sort((x, y) => y.score - x.score);

const unruled = cands.filter((c) => !RULINGS[c.key]);
const dupes = cands.filter((c) => RULINGS[c.key]?.verdict === 'duplicate');

console.log(`${cands.length} candidate pairs · ${Object.keys(RULINGS).length} ruled · ${dupes.length} confirmed duplicates`);

if (unruled.length) {
  console.error(`\n✗ ${unruled.length} pair${unruled.length === 1 ? '' : 's'} with no ruling:\n`);
  for (const c of unruled) {
    console.error(`  ${c.score.toFixed(2)}  ${c.a.level} :: ${c.a.p.title}`);
    console.error(`        ${c.a.p.summary}`);
    console.error(`        ${c.b.level} :: ${c.b.p.title}`);
    console.error(`        ${c.b.p.summary}`);
    console.error(`        → add a ruling to RULINGS in this file after reading both.\n`);
  }
  process.exit(1);
}

// A ruling for a pair the detector no longer raises is stale — usually because a
// point was renamed. Reported rather than fatal: the record is deliberately kept.
const stale = Object.keys(RULINGS).filter((k) => !cands.some((c) => c.key === k));
if (stale.length) console.log(`\n${stale.length} ruling(s) no longer raised (renamed or retired):\n  ${stale.join('\n  ')}`);

if (checkOnly) process.exit(0);

console.log('\n=== confirmed duplicates ===');
for (const c of dupes) console.log(`  ${c.a.level} :: ${c.a.p.title}\n  ${c.b.level} :: ${c.b.p.title}\n      ${RULINGS[c.key].why}\n`);

if (write) {
  const rows = cands.map((c) => [
    c.score.toFixed(2), RULINGS[c.key].verdict,
    `${c.a.level}::${c.a.p.title}`, `${c.b.level}::${c.b.p.title}`,
    RULINGS[c.key].why,
  ].join('\t'));
  writeFileSync(TSV,
    '# Generated by scripts/corpus/dupe-points.ts — every grammar-point pair the detector\n'
    + '# raises, with a hand-verified verdict. NOTHING IS MERGED: gex ids are keyed on the\n'
    + '# point title, so retiring a point orphans a learner\'s FSRS schedule with nothing to\n'
    + '# detect it, and there is no title→title migration. See the header of the script.\n'
    + '# score\tverdict\tpoint A\tpoint B\twhy\n'
    + rows.join('\n') + '\n');
  console.log(`✓ wrote ${rows.length} rows to ${TSV}`);
}
