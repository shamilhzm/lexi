// Temp maintainer driver: run the standard build against pre-filtered raw
// sources (sandbox has a 45s exec cap; kaikki/tatoeba are pre-shrunk to the
// DaF batch's lemmas — same code path, same gates).
import './shim.ts';
import { join } from 'node:path';
import { PATHS, SOURCES } from './config.ts';
import { fileExists } from './lib.ts';
import { runBuild } from './build.ts';

const flag = (n: string) => process.argv.includes(`--${n}`);
const freqPath = join(PATHS.raw, SOURCES.frequency.file);
const spokenPath = join(PATHS.raw, SOURCES.frequencySpoken.file);
const summary = await runBuild({
  vocabPath: PATHS.vocab,
  sectorsPath: PATHS.sectors,
  provenancePath: PATHS.provenance,
  freqPath,
  freqPaths: [spokenPath, freqPath].filter(fileExists),
  wiktPath: '/tmp/kaikki-daf.jsonl',
  wordlistDir: PATHS.wordlistDir,
  tatoeba: { de: '/tmp/tat-deu.tsv', en: '/tmp/tat-eng.tsv', links: '/tmp/links.csv' },
  refPath: PATHS.cefrReference,
  sectorRefPath: PATHS.sectorReference,
  referenceOnly: true,
  scanN: 250000,
  write: flag('write'),
});
console.log(JSON.stringify(summary, null, 2));
