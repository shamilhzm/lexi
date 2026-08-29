// Coverage against a real course book — *Schritte plus Neu 6* (Hueber, Niveau B1/2).
//
// The frequency audit (`corpus:coverage`) answers "would the reader light this up?".
// This one answers a different question a learner actually asks: **if I am sitting in
// the B1.2 course most DTZ candidates sit in, does Lexi teach me the words and the
// grammar my book teaches me this term?**
//
// Two inputs, both committed so the numbers re-derive:
//
//   schritte6-lernwortschatz.tsv   the book's own Lernwortschatz, Lektionen 8-14
//   schritte6-grammar.tsv          the book's Grammatikübersicht, mapped to grammar.json
//
// The grammar map's third column separates multiple topics with ` ; ` and NOT with
// ` + `, because ` + ` occurs inside two of the titles it has to carry (`Präposition:
// außer + Dativ`, `statt / ohne … zu + Infinitiv`). A delimiter that also occurs in
// the data reported both of those as uncovered on the first run.
//
// Matching is deliberately loose on the surface and strict on identity: the article,
// a leading `sich`, and a trailing hyphen (`morgig-`) are stripped from both sides,
// because those are notation, not the word. Everything else must match exactly — a
// near-miss is a miss, since a learner looking up `die Reportage` is not helped by
// `der Reporter`.
//
// Three buckets, because "missing" over-reports badly if you do not split it:
//
//   grammar-covered  the two-part connectors (sowohl … als auch, je … desto, als ob).
//                    They ship as grammar topics, not as cards. Not a gap.
//   feminine-pair    die Managerin, where der Manager is already carded. Derivable
//                    by a rule the learner has, so a real but low-value absence.
//   real-gap         everything else. This is the number worth acting on.
//
// Run: `npm run corpus:schritte6`  ·  `--tsv` also writes the gap list next to this
// file so an authoring batch can be built from it.
import { PATHS } from './config.ts';
import { loadCorpus } from './lib.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Word } from '../../src/types.ts';

const HERE = PATHS.corpusDir;
const LWS = join(HERE, 'schritte6-lernwortschatz.tsv');
const GRAM = join(HERE, 'schritte6-grammar.tsv');
const GAPS_OUT = join(HERE, 'schritte6-gaps.tsv');

const LEKTIONEN: Record<string, string> = {
  '8': 'Unter Kollegen',
  '9': 'Virtuelle Welt',
  '10': 'Werbung und Konsum',
  '11': 'Miteinander',
  '12': 'Soziales Engagement',
  '13': 'Aus Politik und Geschichte',
  '14': 'Alte und neue Heimat',
};

/** Notation off, word left. `die Maßnahme` → `maßnahme`; `sich einsetzen` →
 *  `einsetzen`; `morgig-` → `morgig`. Applied to both sides so the corpus and the
 *  book meet on the same form.
 *
 *  **Government notation counts as notation.** The corpus writes the preposition
 *  and its case into the headword — `hinweisen auf + A`, `warten auf + A`,
 *  `gehören zu + D` — because the pattern is the thing being taught. The first
 *  version of this function did not strip it, so `hinweisen` was reported as an
 *  absence while `hinweisen auf + A` was sitting in the corpus at A2; the card
 *  was authored, written, and only then refused by `corpus:validate` as a form of
 *  the card that already existed. One hit out of 72, and it would have been
 *  silent if the validator had not been run. */
const norm = (s: string) =>
  s.trim().toLowerCase()
    .replace(/^(der|die|das)\s+/, '')
    .replace(/^sich\s+/, '')
    .replace(/\s+\S+\s*\+\s*[adgn]$/, '')
    .replace(/-$/, '')
    .trim();

function readTsv(path: string): string[][] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('\t'));
}

/** `die Managerin` → the masculine forms that would make it derivable. Two
 *  candidates because both `-erin → -er` and a bare `-in → ∅` occur. */
function masculineForms(feminine: string): string[] {
  const base = feminine.replace(/^die\s+/, '');
  const out = [`der ${base}`];
  if (base.endsWith('in')) out.push(`der ${base.slice(0, -2)}`);
  return out;
}

const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1) : '0.0');

function main() {
  const corpus = loadCorpus(PATHS.vocab) as Word[];
  const byNorm = new Map<string, Word[]>();
  for (const w of corpus) {
    const k = norm(w.term);
    // Push, never overwrite: the corpus has known near-duplicates and a
    // last-wins Map would quietly answer for the wrong one. LESSONS, class 3.
    const bucket = byNorm.get(k);
    if (bucket) bucket.push(w);
    else byNorm.set(k, [w]);
  }
  const terms = new Set(corpus.map((w) => w.term));

  // ---- vocabulary -------------------------------------------------------
  const rows = readTsv(LWS);
  type Gap = { lek: string; term: string; pos: string };
  const hit: { lek: string; term: string; levels: string }[] = [];
  const grammarCovered: Gap[] = [];
  const femininePair: Gap[] = [];
  const realGap: Gap[] = [];

  for (const [lek, term, pos] of rows) {
    const found = byNorm.get(norm(term));
    if (found) {
      hit.push({ lek, term, levels: [...new Set(found.map((w) => w.level))].sort().join('|') });
      continue;
    }
    const g: Gap = { lek, term, pos };
    // A two-part connector is taught as a grammar topic and has no card by design.
    if (pos === 'grammar' || term === 'als ob' || term === 'derselbe') grammarCovered.push(g);
    else if (/^die .*(in|frau|leute)$/.test(term) && masculineForms(term).some((m) => terms.has(m)))
      femininePair.push(g);
    else realGap.push(g);
  }

  const covered = hit.length + grammarCovered.length + femininePair.length;
  console.log('Schritte plus Neu 6 — Lernwortschatz coverage (Lektionen 8-14)\n');
  console.log(`  headwords in the book       ${rows.length}`);
  console.log(`  carded in Lexi              ${hit.length}  (${pct(hit.length, rows.length)}%)`);
  console.log(`  taught as a grammar topic   ${grammarCovered.length}  ${grammarCovered.map((g) => g.term).join(', ')}`);
  console.log(`  feminine of a carded noun   ${femininePair.length}  ${femininePair.map((g) => g.term).join(', ')}`);
  console.log(`  effectively covered         ${covered}  (${pct(covered, rows.length)}%)`);
  console.log(`  REAL GAPS                   ${realGap.length}\n`);

  console.log('--- real gaps by Lektion ---');
  for (const [n, title] of Object.entries(LEKTIONEN)) {
    const g = realGap.filter((x) => x.lek === n);
    const total = rows.filter((r) => r[0] === n).length;
    console.log(`  L${n.padEnd(2)} ${title.padEnd(28)} ${String(g.length).padStart(2)}/${total}  ${g.map((x) => x.term).join(', ')}`);
  }

  const byPos = new Map<string, number>();
  for (const g of realGap) byPos.set(g.pos, (byPos.get(g.pos) ?? 0) + 1);
  console.log(`\n  by part of speech: ${[...byPos].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(' · ')}`);

  // ---- grammar ----------------------------------------------------------
  const gram = readTsv(GRAM);
  const titles = new Set<string>();
  const grammar = JSON.parse(readFileSync(PATHS.grammar, 'utf8')) as Record<string, { title: string }[]>;
  for (const [level, topics] of Object.entries(grammar)) for (const t of topics) titles.add(`${level}:${t.title}`);

  const gramMissing: string[] = [];
  console.log('\n--- Grammatikübersicht (GR 5-8), item by item ---');
  for (const [lek, item, mapped] of gram) {
    const ok = mapped !== '-' && mapped.split(' ; ').every((m) => titles.has(m));
    if (!ok) gramMissing.push(item);
    console.log(`  ${ok ? '✓' : '✗'} L${lek.padEnd(2)} ${item.padEnd(48)} ${mapped}`);
  }
  console.log(`\n  ${gram.length - gramMissing.length}/${gram.length} covered` +
    (gramMissing.length ? ` · missing: ${gramMissing.join(', ')}` : ''));

  if (process.argv.includes('--tsv')) {
    const out = ['# Schritte plus Neu 6 headwords with no card in Lexi. Regenerate: npm run corpus:schritte6 -- --tsv',
      '# lektion\tterm\tpos', ...realGap.map((g) => `${g.lek}\t${g.term}\t${g.pos}`)].join('\n');
    writeFileSync(GAPS_OUT, out + '\n');
    console.log(`\nwrote ${GAPS_OUT}`);
  }

  // A gap list is a finding, not a failure — this script never exits non-zero.
}

main();
