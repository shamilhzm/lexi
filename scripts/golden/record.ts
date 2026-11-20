// Record what the matcher and the conjugator do, for `src/lib/golden/golden.test.ts`.
//
//   npm run golden:record                       report what changed against the recording
//   npm run golden:record -- --write            re-record the outputs, inputs unchanged
//   npm run golden:record -- --refresh --write  also re-snapshot the inputs from public/data
//
// **Re-record only to accept a change you meant.** The report lists every sentence
// whose resolution moved. Read it before `--write`, the way `authoring:new
// --report` is read before its `--write`, and commit the re-recorded files with the
// code change that moved them. A re-record nobody read turns this check into one
// that always passes.
//
// `--refresh` takes a new corpus snapshot (vocab.json, inflections.json, every
// example). Do it on its own, with no matcher change in the tree, so the outputs it
// records are the committed code's and nothing else.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { PATHS } from '../corpus/config.ts';
import { replay, compare, explain, toText, fromText, type Inputs, type Outputs, type CardRow } from '../../src/lib/golden/replay.ts';
import type { Word } from '../../src/types.ts';

const DIR = join(process.cwd(), 'src', 'lib', 'golden');
const F = { inputs: join(DIR, 'inputs.json.gz'), annotate: join(DIR, 'annotate.txt'), conjugate: join(DIR, 'conjugate.txt') };
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const REFRESH = args.includes('--refresh');

const git = (cmd: string) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
const dirty = (paths: string) => git(`status --porcelain -- ${paths}`) !== '';
const CODE = 'src/lib/matcher.ts src/lib/conjugate.ts src/data/government.ts';

const have = existsSync(F.inputs) && existsSync(F.annotate) && existsSync(F.conjugate);
let inputs: Inputs;
if (REFRESH || !have) {
  if (dirty('public/data')) {
    console.error('golden: public/data has uncommitted changes. Commit the corpus first, so the snapshot names a commit that holds it.');
    process.exit(1);
  }
  if (dirty(CODE)) {
    console.error(`golden: ${CODE} has uncommitted changes. A new snapshot records the committed code; commit or set the change aside first.`);
    process.exit(1);
  }
  const vocab = JSON.parse(readFileSync(PATHS.vocab, 'utf8')) as Word[];
  inputs = {
    inputsFrom: git('rev-parse --short HEAD'),
    corpus: vocab.map((w): CardRow => [w.id, w.term, w.pos, w.gender ?? null, w.plural ?? null]),
    attested: JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'inflections.json'), 'utf8')) as Record<string, string[]>,
    sentences: vocab.flatMap((w) => (w.ex ?? []).map((e) => e.de)),
  };
} else {
  inputs = JSON.parse(gunzipSync(readFileSync(F.inputs)).toString('utf8')) as Inputs;
}

// Twice, because a recording of a non-deterministic function is a flaky test.
const now = replay(inputs);
if (JSON.stringify(now) !== JSON.stringify(replay(inputs))) {
  console.error('golden: two replays of the same inputs disagree. The matcher or the conjugator is not deterministic; fix that before recording.');
  process.exit(1);
}

console.log(`inputs from ${inputs.inputsFrom}: ${inputs.corpus.length} cards, ${inputs.sentences.length} sentences, ${Object.keys(inputs.attested).length} attested tables`);
console.log(`outputs: ${now.annotate.length} annotated lines, ${now.conjugate.length} verbs`);

if (have && !REFRESH) {
  const was: Outputs = { annotate: fromText(readFileSync(F.annotate, 'utf8')), conjugate: fromText(readFileSync(F.conjugate, 'utf8')) };
  const changes = compare(inputs, was, now);
  const by = (k: string) => changes.filter((c) => c.kind === k).length;
  console.log(`against the recording: ${by('annotate')} annotated lines and ${by('conjugate')} verbs changed`);
  for (const c of changes.slice(0, 40)) console.log(`  ${explain(c)}`);
  if (changes.length > 40) console.log(`  … and ${changes.length - 40} more`);
  if (!changes.length) { console.log('nothing changed; nothing to write.'); process.exit(0); }
}

if (!WRITE) { console.log('dry run. Re-run with --write to record.'); process.exit(0); }
mkdirSync(DIR, { recursive: true });
if (REFRESH || !have) writeFileSync(F.inputs, gzipSync(JSON.stringify(inputs), { level: 9 }));
writeFileSync(F.annotate, toText(now.annotate));
writeFileSync(F.conjugate, toText(now.conjugate));
const kb = (p: string) => `${(readFileSync(p).length / 1024).toFixed(0)} KB`;
console.log(`wrote src/lib/golden/: inputs.json.gz ${kb(F.inputs)}, annotate.txt ${kb(F.annotate)}, conjugate.txt ${kb(F.conjugate)}`);
