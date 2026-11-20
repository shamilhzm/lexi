// Holds the matcher and the conjugator to their recording (see replay.ts).
// A failure lists the sentences whose tokens moved. If the move is what you meant,
// read `npm run golden:record`, then `npm run golden:record -- --write`, and commit
// the re-recorded files with the change.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { replay, compare, explain, fromText, type Inputs, type Outputs } from './replay.ts';

const DIR = 'src/lib/golden';
const inputs = JSON.parse(gunzipSync(readFileSync(`${DIR}/inputs.json.gz`)).toString('utf8')) as Inputs;
const recorded: Outputs = {
  annotate: fromText(readFileSync(`${DIR}/annotate.txt`, 'utf8')),
  conjugate: fromText(readFileSync(`${DIR}/conjugate.txt`, 'utf8')),
};
const report = (changes: ReturnType<typeof compare>) =>
  `${changes.length} lines moved:\n${changes.slice(0, 15).map(explain).join('\n')}\nRe-record only if this is the change you meant: npm run golden:record`;

describe('the matcher and the conjugator replay their recording', () => {
  const now = replay(inputs);

  it('records the whole corpus, not a sample', () => {
    expect(inputs.sentences.length).toBeGreaterThan(20_000);
    expect(recorded.annotate.length).toBe(inputs.sentences.length + inputs.corpus.length);
    expect(recorded.conjugate.length).toBeGreaterThan(1_500);
  });

  it('the check can see a change', () => {
    // Drop the first verb from a copy of the corpus: its forms must resolve elsewhere.
    const i = inputs.corpus.findIndex((r) => r[2] === 'verb');
    const changed = compare(inputs, recorded, replay({ ...inputs, corpus: inputs.corpus.filter((_, j) => j !== i) }));
    expect(changed.length).toBeGreaterThan(0);
  });

  it('every sentence and headword resolves as recorded', () => {
    const changes = compare(inputs, recorded, now).filter((c) => c.kind === 'annotate');
    expect(changes, report(changes)).toEqual([]);
  });

  it('every verb conjugates as recorded', () => {
    const changes = compare(inputs, recorded, now).filter((c) => c.kind === 'conjugate');
    expect(changes, report(changes)).toEqual([]);
  });
}, 60_000);
