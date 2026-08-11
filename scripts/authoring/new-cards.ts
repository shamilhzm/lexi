// Write new cards — but only the ones the verifier will vouch for.
//
// The third member of the authoring family, and the one that adds rows rather
// than repairing them:
//
//   apply-authored.ts  fill-only; never overwrites a non-empty field
//   fix-authored.ts    expect-guarded repair of an existing field
//   new-cards.ts       new rows, each gated by scripts/authoring/verify.ts
//
// Every candidate is checked against de.wiktionary for the facts (gender, plural,
// part of speech, IPA) and against the app's own matcher for the prose (the
// example must genuinely contain an inflection of the headword). **A candidate
// that fails any check is not written and is printed with its reasons.** The
// batch is not all-or-nothing: good cards land, bad ones are reported, and
// re-running after a fix picks up only what changed.
//
//   node scripts/authoring/new-cards.ts <batch.json>            report
//   node scripts/authoring/new-cards.ts <batch.json> --write    apply
import { readFileSync } from 'node:fs';
import { PATHS } from '../corpus/config.ts';
import { loadCorpus, writeJSON } from '../corpus/lib.ts';
import { verifyAll, type Candidate } from './verify.ts';
import type { Word } from '../../src/types.ts';

const [batchPath, ...rest] = process.argv.slice(2);
const WRITE = rest.includes('--write');
const VERBOSE = rest.includes('--report');

if (!batchPath) {
  console.error('usage: node scripts/authoring/new-cards.ts <batch.json> [--write] [--report]');
  process.exit(1);
}

const cands = JSON.parse(readFileSync(batchPath, 'utf8')) as Candidate[];
const corpus = loadCorpus(PATHS.vocab);
const existing = new Set(corpus.map((w) => w.term.toLowerCase()));

// A batch that names the same term twice would write two cards with one id.
const seen = new Set<string>();
const dupes = cands.filter((c) => !seen.has(c.term.toLowerCase()) ? (seen.add(c.term.toLowerCase()), false) : true);
if (dupes.length) {
  console.error(`✗ batch names the same term twice: ${dupes.map((d) => d.term).join(', ')}`);
  process.exit(1);
}

const verdicts = await verifyAll(cands, existing);
const ok = verdicts.filter((v) => v.ok);
const bad = verdicts.filter((v) => !v.ok);

console.log(`candidates ${cands.length} · verified ${ok.length} · rejected ${bad.length}`);

if (bad.length) {
  console.log('\n--- rejected ---');
  for (const v of bad) console.log(`  ${v.term}\n      ${v.reasons.join('\n      ')}`);
}

if (VERBOSE && ok.length) {
  console.log('\n--- verified, for reading ---');
  for (const v of ok) {
    const c = v.card!;
    console.log(`  ${c.term} [${c.level}/${c.field}] — ${c.en}`);
    console.log(`      ${c.plural ?? '(no plural)'} · /${c.ipa ?? '—'}/ · ${v.notes.join(', ') || 'nothing from dictionary'}`);
    for (const e of c.ex) console.log(`      « ${e.de} »  ${e.en}`);
  }
}

if (!WRITE) { console.log('\n(dry run — pass --write to apply)'); process.exit(bad.length ? 1 : 0); }
if (!ok.length) { console.log('\nnothing verified; nothing written'); process.exit(1); }

// Ids are minted the way the corpus mints them, and a collision is a bug rather
// than something to resolve — the `existing` check above should have caught it.
const ids = new Set(corpus.map((w) => w.id));
const clash = ok.map((v) => v.card!).filter((c) => ids.has(c.id));
if (clash.length) {
  console.error(`✗ id collision: ${clash.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

const next: Word[] = [...corpus, ...ok.map((v) => v.card!)];
writeJSON(PATHS.vocab, next);
console.log(`\n✓ ${corpus.length} → ${next.length} cards`);
console.log('  Next: npm run corpus:split && npm run corpus:validate && npm test');
if (bad.length) process.exit(1);
