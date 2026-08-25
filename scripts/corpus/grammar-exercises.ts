// Add exercises to grammar points that already exist.
//
// `grammar-supplement.ts` can do this through its `upgrade` flag, but that flag
// also overwrites the point's `summary`, `rule` and `sections` — so deepening a
// point by four questions means restating its whole teaching text, and any slip
// in the restatement silently rewrites what the learner reads. This does the one
// job: **append exercises, touch nothing else.**
//
// ## Append-only is a correctness requirement, not a style
//
// `lib/grammar.ts` mints exercise ids as `gex:<level>:<pointIndex>:<exerciseIndex>`
// — positions, not names — and every learner's FSRS schedule is keyed on them.
// Inserting an exercise anywhere but the end of a point silently re-points every
// later schedule at a different question. So new exercises go on the end, and the
// guard below refuses a batch that would do anything else.
//
//   npm run corpus:gex -- <batch.json>            report
//   npm run corpus:gex -- <batch.json> --write    apply
import { readFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { readJSON, writeJSON } from './lib.ts';
import type { GExercise, GPoint, GrammarByLevel } from '../../src/lib/grammar.ts';
import type { CEFR } from '../../src/types.ts';

interface Batch { level: CEFR; title: string; exercises: GExercise[] }

const [batchPath, ...rest] = process.argv.slice(2);
const WRITE = rest.includes('--write');
if (!batchPath) {
  console.error('usage: node scripts/corpus/grammar-exercises.ts <batch.json> [--write]');
  process.exit(1);
}

const batches = JSON.parse(readFileSync(batchPath, 'utf8')) as Batch[];
const grammar = readJSON<GrammarByLevel>(PATHS.grammar);

/** Everything that must be true of an exercise before it can reach a learner. */
function problems(e: GExercise, where: string): string[] {
  const out: string[] = [];
  if (!e.prompt?.trim()) out.push(`${where}: no prompt`);
  // `type`, `order` and `error` were refused outright until 2026-08-25, which was a
  // limitation of this checker and not a ruling: the bank has always held all five
  // kinds, and the six *authored* items in a typical point are exactly the ones a
  // four-option shape cannot express. Refusing them meant every appended exercise
  // had to be multiple choice, which is a large part of why the tense points read
  // like conjugation tables. Each kind is checked on its own terms below.
  if (e.kind === 'type') {
    if (!e.accept?.length) out.push(`${where}: a "type" exercise needs at least one accepted answer`);
    else if (e.accept.some((a) => !a?.trim())) out.push(`${where}: an empty accepted answer`);
    else if (new Set(e.accept).size !== e.accept.length) out.push(`${where}: duplicate accepted answers`);
    if (!/_{2,}|…|\.\.\./.test(e.prompt)) out.push(`${where}: a "type" prompt with no gap marker`);
    if (!e.explain?.trim()) out.push(`${where}: no explanation`);
    return out;
  }
  if (e.kind === 'order') {
    const t = e.tiles ?? [];
    if (t.length < 3) out.push(`${where}: an "order" exercise needs at least three tiles`);
    if (t.some((x) => !x?.trim())) out.push(`${where}: an empty tile`);
    if (!e.explain?.trim()) out.push(`${where}: no explanation`);
    return out;
  }
  if (e.kind === 'error') {
    // `answer` indexes the whitespace tokens of the prompt — see GrammarDrill.
    const tokens = e.prompt.trim().split(/\s+/);
    if (e.answer == null || e.answer < 0 || e.answer >= tokens.length) {
      out.push(`${where}: answer ${e.answer} is outside the prompt's ${tokens.length} tokens`);
    }
    if (!e.fix?.trim()) out.push(`${where}: an "error" exercise needs the corrected sentence`);
    else if (e.fix.trim() === e.prompt.trim()) out.push(`${where}: the fix is identical to the prompt`);
    else {
      // `answer` must point at the token the `fix` actually changes. Get it wrong
      // and the learner clicks the genuinely wrong word and is marked wrong — a
      // silent defect no reviewer catches by reading, because the prompt and the
      // fix are each correct on their own. Three of six authored on 2026-08-25
      // had it off by one or more.
      //
      // **Only checkable when `fix` is a full-sentence rewrite.** The bank writes
      // it both ways: most items give just the corrected *word* ("hätte",
      // "größer", "durch"), and comparing that against the prompt token-by-token
      // is meaningless — the first version of this check "found" 49 defects in
      // the shipped bank and every one was a single-word fix. Restricted to a
      // rewrite of the same length differing in exactly one place, it finds the
      // real ones and nothing else.
      const fixed = e.fix.trim().split(/\s+/);
      if (fixed.length === tokens.length) {
        const diff = tokens.map((t, n) => (t === fixed[n] ? -1 : n)).filter((n) => n >= 0);
        if (diff.length === 1 && e.answer !== diff[0]) {
          out.push(`${where}: answer ${e.answer} ("${tokens[e.answer ?? 0]}") is not the token the fix changes ("${tokens[diff[0]]}" at ${diff[0]})`);
        }
      }
    }
    if (!e.explain?.trim()) out.push(`${where}: no explanation`);
    return out;
  }
  if (e.kind !== 'choose' && e.kind !== 'mc') {
    out.push(`${where}: unknown kind "${e.kind}"`);
    return out;
  }
  if (!e.options?.length) out.push(`${where}: no options`);
  else {
    if (e.options.length < 2) out.push(`${where}: needs at least two options`);
    if (new Set(e.options).size !== e.options.length) out.push(`${where}: duplicate options`);
    if (e.answer == null || e.answer < 0 || e.answer >= e.options.length) {
      out.push(`${where}: answer ${e.answer} is outside the options`);
    }
  }
  // A gapped prompt whose gap is missing is the commonest authoring slip, and it
  // reads as a complete sentence with an inexplicable set of choices under it.
  if (e.kind === 'choose' && !/_{2,}|…|\.\.\./.test(e.prompt)) {
    out.push(`${where}: a "choose" prompt with no gap marker`);
  }
  if (!e.explain?.trim()) out.push(`${where}: no explanation`);
  return out;
}

let added = 0;
let skipped = 0;
const errors: string[] = [];
const report: string[] = [];

for (const b of batches) {
  const points: GPoint[] = grammar[b.level] ?? [];
  const point = points.find((p) => p.title === b.title);
  if (!point) { errors.push(`${b.level} · "${b.title}" — no such point`); continue; }

  const have = new Set(point.exercises.map((e) => e.prompt.trim()));
  const fresh: GExercise[] = [];
  for (const [i, e] of b.exercises.entries()) {
    const errs = problems(e, `${b.level} · ${b.title} #${i + 1}`);
    if (errs.length) { errors.push(...errs); continue; }
    if (have.has(e.prompt.trim())) { skipped++; continue; }
    have.add(e.prompt.trim());
    fresh.push(e);
  }
  if (fresh.length) {
    report.push(`${b.level} · ${b.title}: ${point.exercises.length} → ${point.exercises.length + fresh.length}`);
    if (WRITE) point.exercises = [...point.exercises, ...fresh];   // append; never splice
    added += fresh.length;
  }
}

const before = Object.values(grammar).reduce((n, ps) => n + ps.reduce((m, p) => m + p.exercises.length, 0), 0);
console.log(`points touched ${report.length} · exercises added ${added} · already present ${skipped}`);
for (const r of report) console.log(`  ${r}`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} rejected`);
  for (const e of errors) console.error(`  ${e}`);
}

if (!WRITE) { console.log('\n(dry run — pass --write to apply)'); process.exit(errors.length ? 1 : 0); }
if (errors.length) { console.error('\nnothing written — fix the batch first'); process.exit(1); }

writeJSON(PATHS.grammar, grammar);
console.log(`\n✓ ${before - added} → ${before} exercises in ${PATHS.grammar}`);
console.log('  Next: npm run corpus:validate && npm test');
