// Kernwortschatz — does Lexi teach the words German actually runs on?
//
// `corpus:domains` asks whether the words a *particular life* needs are here. This
// asks the complementary question, and the older one: of the lemmas that carry the
// language by raw weight of use, how many can Lexi teach?
//
// ## The reference, and why this one
//
// **Datengeleiteter Kernwortschatz Deutsch** — Lange, Okamura & Scharloth (2016),
// http://www.basic-german.com — four rankings of 10,000 lemmas each, drawn from four
// different corpora. It is a better instrument than the frequency list already in
// `public/data/freq.json` for one specific reason: **it is four lists, not one**, and
// the disagreements between them are the finding.
//
//   gesamt    the whole corpus
//   zeitung   newspapers — "konzeptionell schriftlich", the written register
//   forum     web forums — "konzeptionell mündlich", the closest public proxy for
//             how people actually talk, which is the register a person who has just
//             moved to Germany drowns in first
//   kinder    material written for children — the register a parent needs in order
//             to read a school letter or answer their own child
//
// A word ranked 300 in *forum* and 4,000 in *zeitung* is a spoken word, and a
// vocabulary trainer that ranks by a newspaper corpus will introduce it two years
// late. That gap is invisible to a single frequency list and it is the whole reason
// this file exists.
//
// It is also not sorted by naive token count: the authors rank on a combination of
// relative frequency, dispersion, productivity and stability, which is why `stehen`
// is 7th and `Haus` is not in the top fifty. Rare-but-load-bearing beats common-but-
// local, which is the same judgement a syllabus makes.
//
// ## Licence, and why nothing here ships
//
// The rankings are **CC BY-SA 4.0**. That is already the effective licence of
// `public/data/*` because of Wiktionary (see ATTRIBUTIONS.md §2), so there is no new
// obligation — but this script still deliberately treats the list as a **checklist,
// not as content**. `data/kernwortschatz.tsv` carries lemmas and ranks and nothing
// else: no gloss, no definition, no example. Cards are authored the way every card is
// authored, through `authoring:new`, which verifies every fact against Wiktionary and
// refuses what it cannot confirm. The list decides *which* word to work on next; it
// never supplies what the card says.
//
// ## What a miss means, and what it doesn't
//
// Three of these are not defects:
//
//   - **Function words Lexi deliberately does not card.** `der, die, das` is rank 1
//     and there is no flashcard that teaches it; the gender drill does. Same for
//     most pronouns and inflected determiner forms.
//   - **Lemmas that are one cell with several forms.** `letzter, letzte, letztes` is
//     one row. A cell counts as covered if *any* of its forms is, because they are
//     one lexeme wearing three endings.
//   - **The lookup layer.** A word Lexi can define but not teach is a different, much
//     smaller failure than one it has never heard of — so the two are reported apart,
//     exactly as `corpus:domains` does.
//
// What *is* a defect is a content word inside the top thousand of the spoken list
// that neither layer knows. Those are printed last, and they are the queue.
//
// ## The direction this check does NOT work in
//
// It answers "what is in the core that Lexi does not teach". It must **not** be
// turned around to ask "is what Lexi teaches core", and the first attempt to do that
// produced a finding that was wrong in a way worth recording.
//
// Cross-tabulating card level against rank says 21% of A1 cards are outside the
// reference's top 10,000 — which reads like a mis-levelled band until you print
// them: `eins`, `zwei`, `drei` … `zwölf`, `tschüss`, `die Fahrkarte`, `die
// Haltestelle`, `die Bäckerei`, `die Straßenbahn`, `die Gabel`, `das Mittagessen`,
// `lecker`. Those are not errors. They are the first fifty words anybody needs, and
// they score badly here for two structural reasons:
//
//   - **Numbers are digits in a corpus.** `zwei` as a *lemma* barely occurs, because
//     running text writes "2".
//   - **The ranking deliberately punishes concrete local nouns.** Dispersion,
//     productivity and stability are what put `stehen` at 7 and keep `Erdbeere` out
//     of 10,000 — a word can be indispensable in a bakery and invisible across a
//     balanced corpus.
//
// A beginner syllabus and a corpus ranking disagree *by design*, and where they
// disagree the syllabus is usually right. So: use this list to find holes, never to
// justify a deletion, and never to re-level a card.
//
// Run: npm run corpus:kernwortschatz
//      npm run corpus:kernwortschatz -- --missing forum 1000   (a list to author from)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

type Corpus = 'gesamt' | 'zeitung' | 'forum' | 'kinder';
const CORPORA: Corpus[] = ['gesamt', 'zeitung', 'forum', 'kinder'];
const LABEL: Record<Corpus, string> = {
  gesamt: 'Gesamtkorpus',
  zeitung: 'Zeitungen (written)',
  forum: 'Foren (spoken-ish)',
  kinder: 'Kinder (school/home)',
};

interface Row { cell: string; forms: string[]; rank: Partial<Record<Corpus, number>> }

/** Citation forms for reference rows that are a lemmatiser's **stem** rather than
 *  a word anybody writes.
 *
 *  `ander` is rank 42 and is not German — the word is `andere`/`anderer`/`anderes`,
 *  and the reference's lemmatiser stripped the ending that every attested form
 *  carries. So a card for `andere` left the row reading *untaught*, which is a
 *  defect in the measurement and not in the corpus.
 *
 *  Written out by hand and kept short, for the same reason `MEANINGFUL_FUNCTION`
 *  is: the rule cannot be derived. Matching stems by prefix would let `and` cover
 *  `andere`, and there is no version of that which is not eventually wrong. Each
 *  entry here is a stem that has no attested bare form, mapped to the forms that
 *  do — nothing is aliased to a *different* lexeme. */
const STEM_FORMS: Record<string, string[]> = {
  ander: ['andere', 'anderer', 'anderes'],
  sonstig: ['sonstige', 'sonstiger', 'sonstiges'],
  jeglich: ['jegliche', 'jeglicher', 'jegliches'],
  irgendein: ['irgendeine', 'irgendeiner', 'irgendeines'],
};
interface Card { id: string; term: string; en: string; level: string; pos?: string; kind?: string }

const ROOT = join(import.meta.dirname, '..', '..');

// ---- the reference list ----------------------------------------------------
const TSV = join(import.meta.dirname, 'data', 'kernwortschatz.tsv');
const rows: Row[] = [];
for (const line of readFileSync(TSV, 'utf8').split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const [cell, ...ranks] = line.split('\t');
  if (!cell) continue;
  const rank: Partial<Record<Corpus, number>> = {};
  CORPORA.forEach((c, i) => { const v = ranks[i]; if (v && v !== '-') rank[c] = Number(v); });
  // "letzter, letzte, letztes" is one lexeme in three coats. Any form counts.
  const forms = cell.split(',').map((s) => s.trim()).filter(Boolean);
  rows.push({ cell, forms: [...forms, ...forms.flatMap((f) => STEM_FORMS[f.toLowerCase()] ?? [])], rank });
}

// ---- layer 1: what Lexi teaches -------------------------------------------
/** Fold a headword to the shape the reference uses: no article, no reflexive
 *  pronoun, lowercased. `sich erinnern` and `erinnern` are the same lemma to a
 *  frequency list and must be to this check. */
const fold = (t: string) => t
  .replace(/^(der|die|das)\s+/i, '')
  .replace(/^sich\s+/i, '')
  .trim()
  .toLowerCase();

const cards: Card[] = JSON.parse(readFileSync(join(ROOT, 'public/data/vocab.json'), 'utf8'));
const TAUGHT = new Set<string>();
for (const c of cards) TAUGHT.add(fold(c.term));

// ---- layer 2: what Lexi can answer ----------------------------------------
// Read every shard rather than re-implement the app's fold and binary search: a
// disagreement between this script and `lib/lexicon.ts` about what "found" means
// would be a silent wrong answer, and this is a build-time script with time to burn.
const LEX_DIR = join(ROOT, 'public/data/lex');
const ANSWERED = new Set<string>();
/** Wiktionary's part of speech for a lookup headword. This is what lets the report
 *  separate "a word we should teach and don't" from "a preposition" and "a country",
 *  instead of printing one number that silently blends all three. */
const POS = new Map<string, string>();
let shards = 0;
if (existsSync(LEX_DIR)) {
  for (const f of readdirSync(LEX_DIR)) {
    if (f === 'index.json' || !f.endsWith('.json')) continue;
    shards++;
    const shard = JSON.parse(readFileSync(join(LEX_DIR, f), 'utf8')) as
      { e?: { w?: string; p?: string }[]; f?: Record<string, unknown> };
    for (const e of shard.e ?? []) {
      if (!e?.w) continue;
      const k = fold(e.w);
      ANSWERED.add(k);
      // First wins, and the shards are alphabetical, so a lemma with several
      // entries reports its first-listed part of speech. Good enough to sort a
      // preposition from a verb, which is all this is for.
      if (e.p && !POS.has(k)) POS.set(k, e.p);
    }
    for (const k of Object.keys(shard.f ?? {})) ANSWERED.add(k.toLowerCase());
  }
}

/** Content words are the ones a vocabulary trainer owes you a card for. The rest
 *  are either taught by a drill (articles, pronouns) or not vocabulary at all. */
const CONTENT_POS = new Set(['noun', 'verb', 'adj', 'adjective', 'adv', 'adverb']);
const posOf = (r: Row) => r.forms.map((f) => POS.get(fold(f))).find(Boolean) ?? '?';

/** Country, language, people, party, institution. Real German words, and not what a
 *  6,700-word core vocabulary spends a slot on — `Chinese`, `Grüne`, `NPD`, `EU`. A
 *  forum corpus is full of them because forums argue about politics. */
const isProper = (r: Row) =>
  posOf(r) === 'name' || r.forms.some((f) => /^[A-ZÄÖÜ]/.test(f) && /^[A-ZÄÖÜ]{2,}$/.test(f));

/** **The bucket the part-of-speech filter throws away, and shouldn't.**
 *
 *  Wiktionary tags these `det`, `pron` or `particle`, so `CONTENT_POS` drops them —
 *  and they turned out to be the largest real gap in the corpus. `kein` is rank 170
 *  and is the *only* way to negate a noun in German. `beide`, `jeder`, `einige`,
 *  `manche`, `viele`, `nichts`, `etwas` are each a meaning a learner has to be
 *  taught, not a rule a drill can cover — the VISION ruling that retired the grammar
 *  syllabus was about *drills testing rules*, and "what does `kein` mean" is not one.
 *
 *  Written out by hand rather than derived, because the class cannot be read off a
 *  part-of-speech tag: `der` belongs to the drill and `kein` belongs on a card, and
 *  Wiktionary calls both of them determiners. Naming them here is the honest way to
 *  hold an opinion a tag cannot express. */
const MEANINGFUL_FUNCTION = new Set([
  'kein', 'keine', 'beide', 'jeder', 'jede', 'jedes', 'einige', 'manche', 'mehrere',
  'viele', 'viel', 'wenige', 'wenig', 'alle', 'alles', 'andere', 'ander', 'welcher',
  'solcher', 'solche', 'nichts', 'etwas', 'jemand', 'niemand', 'selber', 'selbst',
  'sonstig', 'gesamt', 'irgendein', 'sämtliche', 'mancher', 'jeglich',
]);
const isMeaningfulFunction = (r: Row) => r.forms.some((f) => MEANINGFUL_FUNCTION.has(fold(f)));

const taught = (r: Row) => r.forms.some((f) => TAUGHT.has(fold(f)));
const answered = (r: Row) => r.forms.some((f) => ANSWERED.has(fold(f)));

// ---- reporting -------------------------------------------------------------
const BANDS = [500, 1000, 2000, 5000, 10000];

/** Rows in a corpus's top `n`, best rank first. */
const band = (c: Corpus, n: number) =>
  rows.filter((r) => (r.rank[c] ?? Infinity) <= n)
    .sort((a, b) => (a.rank[c] ?? 0) - (b.rank[c] ?? 0));

function table(c: Corpus) {
  console.log(`\n  ${LABEL[c]}`);
  console.log('    band       taught   lookup only   absent   | content words owed');
  for (const n of BANDS) {
    const b = band(c, n);
    const t = b.filter(taught).length;
    const a = b.filter((r) => !taught(r) && answered(r)).length;
    const m = b.length - t - a;
    // The column that actually drives work: untaught, and a noun/verb/adjective/
    // adverb rather than a preposition or a country.
    const owed = b.filter((r) => !taught(r)
      && (CONTENT_POS.has(posOf(r)) || isMeaningfulFunction(r)) && !isProper(r)).length;
    const pc = (x: number) => `${((x / b.length) * 100).toFixed(1)}%`;
    console.log(`    top ${String(n).padEnd(6)}${String(t).padStart(6)} ${pc(t).padStart(6)}` +
      `${String(a).padStart(8)} ${pc(a).padStart(6)}` +
      `${String(m).padStart(7)} ${pc(m).padStart(6)}   |${String(owed).padStart(6)}`);
  }
}

function main() {
  const [, , flag, whichArg, nArg] = process.argv;

  if (flag === '--missing') {
    const c = (CORPORA.includes(whichArg as Corpus) ? whichArg : 'gesamt') as Corpus;
    const n = Number(nArg) || 1000;
    const gone = band(c, n).filter((r) => !taught(r));
    const queue = gone.filter((r) => (CONTENT_POS.has(posOf(r)) || isMeaningfulFunction(r)) && !isProper(r));
    console.log(`# ${gone.length} of the top ${n} in ${LABEL[c]} are not taught cards.`);
    console.log(`# ${queue.length} of those are content words — the actual authoring queue.`);
    console.log(`# The other ${gone.length - queue.length} are function words, names or`);
    console.log('# lemmas the lookup layer has no part of speech for.');
    console.log('# rank\tlemma\tpos\tlookup?');
    for (const r of queue) {
      console.log(`${r.rank[c]}\t${r.cell}\t${posOf(r)}\t${answered(r) ? 'lookup' : 'ABSENT'}`);
    }
    return;
  }

  console.log(`kernwortschatz — ${cards.length} taught cards · ${ANSWERED.size} lookup keys ` +
    `across ${shards} shards · ${rows.length} reference lemmas`);
  for (const c of CORPORA) table(c);

  // The class a part-of-speech tag cannot express, reported on its own because it
  // is the single largest coherent hole the check found.
  const det = rows.filter((r) => isMeaningfulFunction(r) && (r.rank.gesamt ?? Infinity) <= 5000);
  const detMissing = det.filter((r) => !taught(r));
  console.log(`\n  Determiners, quantifiers and negation in the top 5000: ` +
    `${det.length - detMissing.length}/${det.length} taught`);
  if (detMissing.length) {
    console.log('    untaught: ' + detMissing
      .sort((a, b) => (a.rank.gesamt ?? 0) - (b.rank.gesamt ?? 0))
      .map((r) => `${r.cell} (${r.rank.gesamt})`).join(', '));
  }

  // The disagreement between the registers, which is the reason for four lists.
  console.log('\n  Where the registers disagree — top 1000 of one, absent from the other');
  const spoken = new Set(band('forum', 1000).map((r) => r.cell));
  const written = new Set(band('zeitung', 1000).map((r) => r.cell));
  const onlySpoken = [...spoken].filter((c) => !written.has(c));
  const onlyWritten = [...written].filter((c) => !spoken.has(c));
  const rowOf = new Map(rows.map((r) => [r.cell, r]));
  const untaught = (cells: string[]) => cells.filter((c) => { const r = rowOf.get(c); return r && !taught(r); });
  console.log(`    spoken-only lemmas: ${onlySpoken.length}, of which untaught ${untaught(onlySpoken).length}`);
  console.log(`    written-only lemmas: ${onlyWritten.length}, of which untaught ${untaught(onlyWritten).length}`);
  console.log(`    untaught spoken-only, first 30:\n      ${untaught(onlySpoken).slice(0, 30).join(', ')}`);

  // The queue: content words in the spoken top 1000 that neither layer knows.
  const absent = band('forum', 1000).filter((r) => !taught(r) && !answered(r));
  console.log(`\n  Neither taught nor look-up-able, in the spoken top 1000: ${absent.length}`);
  if (absent.length) console.log(`      ${absent.map((r) => r.cell).join(', ')}`);
  console.log('');
}

main();
