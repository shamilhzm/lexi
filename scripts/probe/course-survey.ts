// What each course unit teaches, card by card — the instrument behind choosing a
// film's words. Prints a unit's assigned cards with level, gender, plural, gloss and
// every example sentence, so a film's `example` beat can be chosen by *sense*, not
// only by the gate's proof that an inflection is present (LESSONS, *A film quotes
// the example, so the example's sense is now a claim*).
//
//   node scripts/probe/course-survey.ts a1-essen a2-feste …
//   node scripts/probe/course-survey.ts --all-missing      (every unit without a film)
//   node scripts/probe/course-survey.ts --pool a1-essen    (the unit's whole sector pool)
import { readFileSync } from 'node:fs';
import { registerWords, WORDS_BY_SECTOR } from '../../src/data/index.ts';
import { primeFreq, freqRankOf } from '../../src/lib/freq.ts';
import { COURSE, UNIT_BY_ID, unitCards } from '../../src/data/course.ts';
import type { Word } from '../../src/types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
registerWords(corpus.filter((w) => w.kind !== 'grammar'));
primeFreq(JSON.parse(readFileSync('public/data/freq.json', 'utf8')));

const args = process.argv.slice(2);
const pool = args.includes('--pool');
const ids = args.includes('--all-missing') ? COURSE.filter((u) => !u.film).map((u) => u.id) : args.filter((a) => !a.startsWith('--'));

const show = (w: Word) => {
  const head = `${w.term}${w.plural ? ` (${w.plural})` : ''} · ${w.level} · ${w.pos} · ${w.en}`;
  const ex = (w.ex ?? []).map((e, k) => `      ${k}: ${e.de}  — ${e.en}`).join('\n');
  return `  ${head}\n${ex}`;
};

for (const id of ids) {
  const u = UNIT_BY_ID.get(id);
  if (!u) { console.log(`?? ${id}`); continue; }
  console.log(`\n== ${u.id} · ${u.title} · ${u.focus} · ${u.sectors.join(', ')} · ${(u.levels ?? [u.level]).join('/')}`);
  if (pool) {
    const levels = new Set(u.levels ?? [u.level]);
    const ws = u.sectors.flatMap((s) => WORDS_BY_SECTOR.get(s) ?? []).filter((w) => levels.has(w.level));
    const rank = (w: Word) => freqRankOf(w.id) ?? Number.MAX_SAFE_INTEGER;
    for (const w of [...new Map(ws.map((w) => [w.id, w])).values()].sort((a, b) => rank(a) - rank(b))) console.log(show(w));
  } else {
    for (const w of unitCards(u)) console.log(show(w));
  }
}
