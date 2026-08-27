// Look a noun's plural up, rather than deriving it.
//
// 420 noun cards carry no plural, and the shortcut is obvious and wrong: 160 of
// them end in a suffix whose plural is morphologically decidable (`-ung`, `-heit`,
// `-keit`, `-ion` all take `-en` without exception), so a rule could fill them in
// one pass. It would be wrong on most. German *permits* «die Höflichkeiten» and
// «die Transparenzen»; they are not what a learner should be taught, and several
// of them mean something else. **Morphology is decidable; whether a noun has a
// plural in use is lexical**, and lexical questions get looked up here.
//
// So this reads de.wiktionary through the same cached fetcher the authoring gate
// uses, and emits a batch for `fix-authored`. Three outcomes per card:
//
//   a Nominativ Plural in the German section  → propose `die <form>`
//   an explicit Singularetantum               → propose "nur Singular"
//   no entry, or no plural field either way   → left unproposed, and reported
//
// Nothing is written here and nothing is guessed. A row with no proposal is a row
// a human still has to rule on, which is the honest state for it to be in.
//
//   node scripts/authoring/fetch-plurals.ts [--limit N] [--out batch.json]
import { writeFileSync } from 'node:fs';
import { PATHS } from '../corpus/config.ts';
import { loadCorpus, lookupLemma } from '../corpus/lib.ts';
import { wikitext, parseFacts } from './verify.ts';
import type { Word } from '../../src/types.ts';

// `indexOf` returns -1 for an absent flag, and argv[0] is the node binary — so the
// naive version silently defaulted `--out` to the interpreter's own path and tried
// to overwrite it. Guard the miss.
const arg = (n: string): string | undefined => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const LIMIT = Number(arg('--limit') ?? '80');
const ALL = process.argv.includes('--all');
const OUT = arg('--out') ?? 'scripts/authoring/batches/plural-lookup-01.json';

const corpus = loadCorpus(PATHS.vocab) as Word[];
const todo = corpus.filter((w) =>
  w.kind === 'word' && w.pos === 'noun' && !(w.plural ?? '').trim()
  // Proper nouns are excluded for the same reason `corpus:validate` stopped
  // warning about them: a country has no plural and never will.
  && /^(der|die|das)[\s/]/i.test(w.term)).slice(0, LIMIT);

interface PlRow { id: string; expect: { plural: string | null }; plural?: string; src: string }
const rows: PlRow[] = [];
const unresolved: string[] = [];
let attested = 0, singulare = 0;

for (const w of todo) {
  const lemma = lookupLemma(w.term);
  let wt: string | null = null;
  try { wt = await wikitext(lemma); } catch { unresolved.push(`${w.id} — de.wiktionary unreachable`); continue; }
  if (!wt) { unresolved.push(`${w.id} — no de.wiktionary entry for "${lemma}"`); continue; }
  const facts = parseFacts(wt);
  const src = `de.wiktionary.org/wiki/${lemma}`;

  // Abstract nouns are where a looked-up plural goes wrong, and it goes wrong in
  // the most expensive way: the form is *attested* and means something else.
  // Wiktionary gives «die Transparenzen» (overhead transparencies) for
  // *Transparenz* and «die Höflichkeiten» (pleasantries) for *Höflichkeit* —
  // correct German, and not the plural of the word on the card. Nouns in these
  // suffixes are reported for a human ruling instead of being proposed.
  const ABSTRACT = /(ung|heit|keit|schaft|tät|ismus|enz|anz|barkeit|ie|ik|ion|sein|sicht|ur|age)$/i;
  // A country never takes a plural, whatever wiktionary lists. «die Schweizen» is
  // a rare regional form of another sense and was proposed for — and applied to —
  // the country card on 2026-08-25, because that batch was written without being
  // read. The sector settles it without judgement.
  if (w.field === 'Countries') {
    rows.push({ id: w.id, expect: { plural: (w.plural ?? null) as string | null }, plural: 'nur Singular',
      src: 'A country name has no plural.' });
    singulare++;
    continue;
  }
  const abstract = ABSTRACT.test(lemma);

  // **A page that covers two genders cannot be trusted for a plural.** German
  // wiktionary puts *der Erbe* (the heir) and *das Erbe* (the inheritance) on one
  // page, and the first plural in it is «die Erben» — the heirs. Proposed for the
  // neuter card, that is simply a different word. Where the attested genders do
  // not agree with the card's own, the lookup is reported rather than believed.
  if (w.gender && facts.genders.size && !facts.genders.has(w.gender)) {
    unresolved.push(`${w.id} — card is "${w.gender}" but the page attests ${[...facts.genders].join('/')} — different word`);
    continue;
  }
  if (facts.genders.size > 1) {
    unresolved.push(`${w.id} — the page covers ${[...facts.genders].join('/')}; its plural may belong to the other one`);
    continue;
  }

  if (facts.plurals.length) {
    // The first listed form. Where wiktionary lists two (die Wörter / die Worte)
    // they mean different things and a human must choose, so those are reported.
    if (facts.plurals.length > 1) {
      unresolved.push(`${w.id} — wiktionary lists ${facts.plurals.length}: ${facts.plurals.join(' / ')} — needs a ruling`);
      continue;
    }
    const form = facts.plurals[0].trim();
    // The parser strips an em-dash but not an en-dash, and `die –` would have
    // shipped as a plural. Anything that is not a word is not a plural.
    if (!/^\p{L}/u.test(form)) {
      // A dash in the Flexionstabelle is not missing data — it is wiktionary
      // *asserting* there is no plural, the same claim `Singularetantum` makes in
      // words. Reporting it as "not a form" filed three correct answers
      // (`die Teilhabe`, `das Greenwashing`, `das Musizieren`) as broken source
      // data. Only the dashes; anything else non-alphabetic really is junk.
      if (/^[–—―-]+$/.test(form)) {
        rows.push({ id: w.id, expect: { plural: null }, plural: 'nur Singular', src });
        singulare++;
        continue;
      }
      unresolved.push(`${w.id} — wiktionary's plural field is "${form}", not a form`);
      continue;
    }
    if (abstract) {
      unresolved.push(`${w.id} — abstract noun with an attested plural "${form}" — needs a ruling on whether a learner should meet it`);
      continue;
    }
    rows.push({ id: w.id, expect: { plural: null }, plural: `die ${form}`, src });
    attested++;
    continue;
  }
  // No plural field at all in a German noun's table is the Singularetantum shape,
  // but only trust it where the page really is a German noun — otherwise a thin
  // or malformed entry would be read as "this word has no plural".
  if (/\{\{Wortart\|Substantiv\|Deutsch\}\}/.test(wt) && /Singular/.test(wt)) {
    rows.push({ id: w.id, expect: { plural: null }, plural: 'nur Singular', src });
    singulare++;
    continue;
  }
  unresolved.push(`${w.id} — entry exists but states no plural either way`);
}

writeFileSync(OUT, JSON.stringify(rows, null, 2) + '\n');
console.log(`\nlooked up ${todo.length} · proposed ${rows.length} (${attested} attested plural, ${singulare} nur Singular)`);
console.log(`unresolved ${unresolved.length}`);

// A 201-row list printed 20 rows at a time tells you nothing about its shape, and
// the shape is the whole question: "no entry in the source" is a gap somebody has
// to fill by hand, while "attested but misleading" is a pedagogic ruling. Counting
// them is what turns the list into a finding. (LESSONS class 1 — the numbers in the
// report have to come from a run, not from reading the first screenful.)
const CLASSES: [RegExp, string][] = [
  [/no de\.wiktionary entry/, 'no entry in the source — needs authoring by hand'],
  [/needs a ruling on whether a learner should meet it/, 'attested plural, but misleading for a learner — pedagogic ruling'],
  [/states no plural either way/, 'entry is silent — probably "nur Singular", unconfirmed'],
  [/wiktionary lists \d+:/, 'several attested plurals that mean different things — ruling'],
  [/not a form/, "plural field is a dash, not a word"],
  [/different word|belong to the other one/, 'the page covers another gender — cannot be trusted'],
  [/unreachable/, 'network'],
];
const tally = new Map<string, string[]>();
for (const u of unresolved) {
  const hit = CLASSES.find(([re]) => re.test(u));
  const key = hit ? hit[1] : 'unclassified';
  (tally.get(key) ?? tally.set(key, []).get(key)!).push(u);
}
for (const [k, rows] of [...tally].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n  ${String(rows.length).padStart(4)}  ${k}`);
  for (const u of rows.slice(0, ALL ? rows.length : 3)) console.log(`         ${u}`);
  if (!ALL && rows.length > 3) console.log(`         … ${rows.length - 3} more (--all to list)`);
}
console.log(`\n✓ wrote ${OUT}\n  Next: node scripts/authoring/fix-authored.ts ${OUT} --dry\n`);
