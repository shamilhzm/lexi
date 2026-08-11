// Put the A1 exam's own vocabulary at A1.
//
// `Placement.tsx` narrows the CEFR filter to the placed level, so a word filed
// above A1 is invisible to an A1 learner. 162 words the Start Deutsch 1 syllabus
// examines had no A1 card at all — `das Formular`, `der Termin`, `die Kasse`,
// `der Balkon`, `E-Mail`. This puts them where the exam says they belong.
//
// ⚠️ This script was commissioned off a measurement that claimed A1 learners
// reached only 41% of the A1 lexicon. **That measurement was wrong** — it looked
// each word up in a Map built by iterating the corpus, so for the 874 terms that
// sit on more than one card it reported whichever copy came last. `der Tisch` is
// at A1 *and* B1; the probe saw B1 and called the word gated. Measured properly
// (does an A1 card exist), the real figure was 85%, and this pass takes it to 91%.
// The relevel is still right — every promotion here is a word with no A1 card —
// but it is a 6-point improvement, not a 50-point one, and what the bad probe
// actually rediscovered is the duplicate problem in BACKLOG Now #3.
//
// ## The authority is Goethe's, not mine
//
// `data/goethe-a1-wordlist.txt` is the published Goethe-Zertifikat A1 / Start
// Deutsch 1 Wortliste, lemmas only. A word moves because the A1 exam examines it,
// not because it feels easy. Where Lexi should disagree with Goethe — and there
// are such cases — the disagreement goes in `a1-rulings.tsv` with a reason, so it
// is visible and arguable rather than baked into a diff.
//
// **The list is not committed**, and that is the existing convention rather than an
// oversight: `scripts/corpus/data/` is gitignored precisely because it holds
// third-party source corpora that are fetched and never redistributed (see the
// note beside it in `.gitignore`). What *is* committed is `a1-rulings.tsv` — every
// level change with its authority — which is the durable record. To re-derive the
// input, see REBUILD below.
//
// ## REBUILD
//
//   1. https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf
//   2. Extract the alphabetical list (pages 9–27) **by column position**, not by
//      text order: headwords are set at x=375.8 and their examples at x=386.1
//      (x=143.0/153.4 on page 9). Three heuristic parses over the flattened text
//      were tried first and all failed — sentence-splitting cannot tell a headword
//      from the first word of an example, and section-letter tracking runs away on
//      the first capitalised sentence start.
//   3. Add the Wortgruppenliste on pages 6–8 (weekdays, months, seasons, colours,
//      compass points, measures, currencies), which the alphabetical list omits.
//   4. The count should land near Goethe's own stated "circa 650". 657 did.
//
// Lemmas only. Goethe's example sentences are their copyrighted expression.
//
// ## Promotion is additive, and that is what makes it safe
//
// The level filter is cumulative (A1..placement), so an A2 or B1 learner sees
// everything they saw before; only the A1 learner gains. Same argument as
// `relevel.ts` made for the four grammar points.
//
// ## What is deliberately NOT done here
//
// - **Nothing is demoted.** Lexi holding a word at A1 that Goethe omits is not an
//   error: telc A1 and the DaF textbooks differ from Goethe at the margin, and
//   pushing a word *up* would take it away from the learner who needs it most.
//   Those cases are reported and left alone.
// - **Duplicates are not merged.** 874 terms sit on more than one card (BACKLOG
//   Now #3). If a term already has an A1 card, the higher copies stay where they
//   are — promoting them would mint a second `voc:A1:<term>` and collide. The
//   collision guard below is what turns that latent bug into a skipped row.
//
// Run: npm run corpus:relevel:a1              (report + rulings + the id map)
//      npm run corpus:relevel:a1 -- --write   (apply to vocab.json)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, writeJSON } from './lib.ts';
import type { Word, CEFR } from '../../src/types.ts';

const WRITE = process.argv.includes('--write');
const WORDLIST = 'scripts/corpus/data/goethe-a1-wordlist.txt';
const RULINGS = 'scripts/corpus/a1-rulings.tsv';

/**
 * The part-of-speech guard, and why it is not four special cases.
 *
 * Matching is on the article-stripped, lower-cased term, which is what lets
 * `die Miete` find `Miete`. It also lets Goethe's noun `der Dank` find Lexi's
 * **preposition** `dank`, its `das Lokal` find the adjective `lokal`, its verb
 * `reisen` find the nominalisation `das Reisen`, and its interjection `Achtung!`
 * find the abstract noun `die Achtung` ("respect"). Every one of those would have
 * promoted a genuinely B1+ word to A1 on the authority of a different word that
 * happens to be spelled the same.
 *
 * Goethe's list prints the article for nouns and omits it otherwise, so the list
 * itself carries the signal needed to catch all four: if the syllabus entry is a
 * noun the card must be one, and vice versa. Found by reviewing the 34 largest
 * jumps by hand — which is the argument for reviewing them by hand.
 */
const expectsNoun = (lemma: string) => /^(der|die|das)\s/i.test(lemma);

/** Lexi overrides Goethe here, with a reason. Kept tiny and argued. */
const KEEP_ABOVE_A1: Record<string, string> = {
  // Exam-administration vocabulary: on the list because the *rubrics* use it, not
  // because an A1 learner must produce it. Teaching it as A1 vocabulary would
  // spend a beginner's scarcest resource on words they only ever read once.
  "der Antwortbogen": "appears only in exam rubrics, not in A1 communication",
  'ankreuzen': 'exam-rubric verb; met in the instructions, not needed productively',
  'zuordnen': 'exam-rubric verb',
  'ergänzen': 'exam-rubric verb',
};

const norm = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const rank = (l: CEFR) => LEVELS.indexOf(l);

// ---- the syllabus ----------------------------------------------------------
if (!existsSync(WORDLIST)) {
  console.error(`✗ ${WORDLIST} is missing.\n`);
  console.error('  It is deliberately not committed — scripts/corpus/data/ holds third-party');
  console.error('  source corpora that are fetched and never redistributed. See REBUILD at the');
  console.error('  top of this file for how to re-derive it from the published Goethe PDF.\n');
  console.error('  The decisions it produced are committed, in scripts/corpus/a1-rulings.tsv.');
  process.exit(1);
}
const wanted = readFileSync(WORDLIST, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

// Stems and multi-word entries the corpus cannot carry as a single card
// (`all-`, `ander-`, `Rad fahren`). Reported, never matched.
const isStem = (w: string) => w.endsWith('-') || w.includes(' ') && !/^(der|die|das|sich)\s/.test(w);

const corpus = loadCorpus(PATHS.vocab);
const byTerm = new Map<string, Word[]>();
for (const w of corpus) {
  if (w.kind !== 'word') continue;
  const k = norm(w.term);
  (byTerm.get(k) ?? byTerm.set(k, []).get(k)!).push(w);
}

interface Row { lemma: string; term: string; from: CEFR; to: CEFR; why: string }
const promote: Row[] = [];
const already: string[] = [];
const gaps: string[] = [];
const skippedDupe: string[] = [];
const overridden: string[] = [];
const posMismatch: string[] = [];

for (const lemma of wanted) {
  if (isStem(lemma)) { gaps.push(`${lemma}\t(stem or multi-word — no single card)`); continue; }
  if (KEEP_ABOVE_A1[lemma]) { overridden.push(lemma); continue; }

  const all = byTerm.get(norm(lemma));
  if (!all?.length) { gaps.push(`${lemma}\t(absent from the corpus)`); continue; }

  // Same spelling, different word — see `expectsNoun` above.
  const cards = all.filter((c) => (c.pos === 'noun') === expectsNoun(lemma));
  if (!cards.length) {
    posMismatch.push(`${lemma}\tvs ${all.map((c) => `${c.term} [${c.level}/${c.pos}]`).join(', ')}`);
    gaps.push(`${lemma}\t(corpus has the spelling as a different part of speech)`);
    continue;
  }

  if (cards.some((c) => c.level === 'A1')) {
    // Already reachable. Any higher copies are the duplicate problem, not this one.
    if (cards.length > 1) skippedDupe.push(`${lemma} — ${cards.map((c) => c.level).join('/')}`);
    already.push(lemma);
    continue;
  }
  // Promote the lowest copy only; the rest are duplicates and would collide.
  const card = [...cards].sort((a, b) => rank(a.level) - rank(b.level))[0];
  promote.push({ lemma, term: card.term, from: card.level, to: 'A1', why: 'Goethe A1 Wortliste' });
  if (cards.length > 1) skippedDupe.push(`${lemma} — ${cards.map((c) => c.level).join('/')}, promoting the ${card.level} copy only`);
}

// ---- report ----------------------------------------------------------------
const byFrom = new Map<CEFR, number>();
for (const p of promote) byFrom.set(p.from, (byFrom.get(p.from) ?? 0) + 1);

console.log(`Goethe A1 Wortliste: ${wanted.length} entries`);
console.log(`  already at A1        ${already.length}`);
console.log(`  promote to A1        ${promote.length}   ${[...byFrom].map(([l, n]) => `${l}→A1 ${n}`).join(' · ')}`);
console.log(`  held above A1        ${overridden.length}   (see KEEP_ABOVE_A1)`);
console.log(`  not in the corpus    ${gaps.length}`);
if (skippedDupe.length) console.log(`  duplicate groups     ${skippedDupe.length}   (Now #3; not merged here)`);

// The collision guard. A promotion that would mint an id the corpus already holds
// is a bug in this script, not an acceptable outcome — fail loudly.
const ids = new Set(corpus.map((w) => w.id));
const collisions = promote.filter((p) => ids.has(`voc:A1:${p.term}`));
if (collisions.length) {
  console.error(`\n✗ ${collisions.length} promotions would collide with an existing id:`);
  for (const c of collisions.slice(0, 10)) console.error(`    voc:A1:${c.term}  (from ${c.from})`);
  process.exit(1);
}

// Only rewritten when there is something to record. Once the pass has been
// applied this script correctly finds nothing left to promote, and an
// unconditional write would then replace the record of what it did with an empty
// file — destroying the durable half of a pass whose input is deliberately not
// committed. Found by running it twice.
if (promote.length) {
  const tsv = [
    '# Generated by scripts/corpus/relevel-a1.ts — every level change, with its authority.',
    '# The input word list is not committed (see the header); this file is the record.',
    '# term\tfrom\tto\treason',
    ...promote.map((p) => `${p.term}\t${p.from}\t${p.to}\t${p.why}`),
    ...Object.entries(KEEP_ABOVE_A1).map(([t, why]) => `${t}\t—\theld\t${why}`),
  ].join('\n');
  writeFileSync(RULINGS, tsv + '\n');
  console.log(`\nrulings → ${RULINGS}`);
} else {
  console.log(`\nnothing to promote — ${RULINGS} left as it is`);
}

console.log('\n--- ID_MAP entries for src/data/idmap.ts ---');
for (const p of promote) console.log(`  "voc:${p.from}:${p.term}": "voc:A1:${p.term}",`);

if (posMismatch.length) {
  console.log(`\n--- same spelling, different word — not promoted (${posMismatch.length}) ---`);
  for (const m of posMismatch) console.log(`  ${m.replace('\t', '  ')}`);
}

if (gaps.length) {
  console.log(`\n--- on the A1 syllabus, absent from the corpus (${gaps.length}) ---`);
  for (const g of gaps) console.log(`  ${g.replace('\t', '  ')}`);
}

// ---- apply -----------------------------------------------------------------
if (!WRITE) { console.log('\n(dry run — pass --write to apply)'); process.exit(0); }

const move = new Map(promote.map((p) => [`voc:${p.from}:${p.term}`, `voc:A1:${p.term}`]));
let n = 0;
for (const w of corpus) {
  const to = move.get(w.id);
  if (!to) continue;
  w.id = to;
  w.level = 'A1';
  n++;
}
writeJSON(PATHS.vocab, corpus);
console.log(`\n✓ wrote ${n} level changes to ${PATHS.vocab}`);

// A card id is a foreign key, and three things hold it. Missing any one of them
// is a silent data loss rather than an error, which is why all three are done
// here and asserted by tests rather than left as a note in a commit message.
//
//   1. vocab.json           — above; detail.json/cards.json follow via corpus:split
//   2. provenance.json      — keyed by id; a stale key drops a card's sourcing
//   3. src/data/idmap.ts    — an *existing* entry may point at an id this pass has
//                             just moved, breaking the chain for a learner who was
//                             migrated once already. Re-pointed, never dropped.
const prov = readFileSync(PATHS.provenance, 'utf8');
const provRows = JSON.parse(prov) as { id: string }[];
let pn = 0;
for (const r of provRows) {
  const to = move.get(r.id);
  if (to) { r.id = to; pn++; }
}
writeJSON(PATHS.provenance, provRows);
console.log(`✓ migrated ${pn} provenance ids`);

const idmapSrc = readFileSync('src/data/idmap.ts', 'utf8');
const stale = [...idmapSrc.matchAll(/"([^"]+)":\s*"([^"]+)"/g)]
  .filter((m) => move.has(m[2]))
  .map((m) => ({ from: m[1], was: m[2], now: move.get(m[2])! }));
if (stale.length) {
  console.log(`\n--- ${stale.length} existing ID_MAP entries must be re-pointed ---`);
  for (const s of stale) console.log(`  "${s.from}": "${s.now}",   (was ${s.was})`);
}

console.log('\n  Next: paste the ID_MAP entries above into src/data/idmap.ts, then');
console.log('        npm run corpus:split && npm run corpus:validate && npm test');
