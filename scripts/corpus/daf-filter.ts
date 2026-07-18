// Temp maintainer helper: filter a DaF lemma list against corpus + reference.
import './shim.ts';
import { readFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, primeApp, existingTerms } from './lib.ts';
import { loadReference } from './level.ts';

const listPath = process.argv[2];
const lemmas = readFileSync(listPath, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const full = loadCorpus(PATHS.vocab);
const matcher = await primeApp(full);
const known = existingTerms(full.filter(w => w.kind === 'word'));
const ref = loadReference(PATHS.cefrReference);

const covered: string[] = [], inRef: string[] = [], todo: string[] = [];
for (const l of lemmas) {
  const hit = matcher.annotate(l)[0]?.word;
  if (hit || known.has(l.toLowerCase())) { covered.push(l); continue; }
  if (ref.has(l.toLowerCase()) || ref.has(l)) { inRef.push(l); continue; }
  todo.push(l);
}
console.log(`total ${lemmas.length} · already covered ${covered.length} · in reference (uncovered) ${inRef.length} · TODO ${todo.length}`);
console.log('\n== TODO (uncovered, not in reference) ==');
console.log(todo.join('\n'));
