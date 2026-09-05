// How much of a dictionary is *new information*, and how much does the app
// already handle? Sampled, because the matcher would otherwise run 135,000 times.
import './shim.ts';
import { PATHS } from './config.ts';
import { loadCorpus, primeApp } from './lib.ts';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const corpus = loadCorpus(PATHS.vocab);
const matcher = await primeApp(corpus);
const have = new Set(corpus.map((w) => w.term.replace(/^(der|die|das)\s+/i, '').toLowerCase()));

const rl = createInterface({ input: createReadStream(join(PATHS.raw, 'kaikki-de.jsonl')) });
let nouns = 0, sampled = 0, decomposable = 0, alreadyCard = 0, genuinelyNew = 0;
const newExamples: string[] = [];
for await (const line of rl) {
  let j: { word: string; pos: string };
  try { j = JSON.parse(line); } catch { continue; }
  if (j.pos !== 'noun') continue;
  nouns++;
  if (nouns % 17 !== 0) continue;         // deterministic 1-in-17 sample
  sampled++;
  if (have.has(j.word.toLowerCase())) { alreadyCard++; continue; }
  const seg = matcher.annotate(j.word)[0];
  if (seg?.word && seg.viaCompound) { decomposable++; continue; }
  if (seg?.word) { alreadyCard++; continue; }
  genuinelyNew++;
  if (newExamples.length < 14) newExamples.push(j.word);
}
const pc = (n: number) => ((n / sampled) * 100).toFixed(1) + '%';
console.log(`Wiktionary German nouns      ${nouns.toLocaleString()}`);
console.log(`sampled (1 in 17)            ${sampled.toLocaleString()}`);
console.log(`  already a card / inflection ${pc(alreadyCard)}`);
console.log(`  a compound Lexi decomposes  ${pc(decomposable)}   ← readable already, not worth a card`);
console.log(`  genuinely new to the app    ${pc(genuinelyNew)}`);
console.log(`\nsample of the genuinely new: ${newExamples.join(', ')}`);
