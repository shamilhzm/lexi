// npm run corpus:ownership [-- <git-ref>] — which tokens did the new cards take?
//
// The authoring gate checks that a new card's *own* examples light up. It cannot
// see what the card takes from everybody else's: when *die Schwere* shipped,
// *in schweren Zeiten* stopped being `schwer` (LESSONS, *A new card can steal its
// neighbour's forms*). So this builds the matcher twice — over the corpus and
// inflections at `<git-ref>` (default HEAD) and over the files on disk, with the
// *current* matcher code both times, so only the data differs — and walks every
// example sentence the old corpus shipped.
//
// It prints every token whose owner moved **to a card that did not exist at the
// ref**, grouped and counted. `∅ → new` is a gap filled; `old → new` is either a
// fix or a theft, and only reading the sentence says which.
import './shim.ts';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { buildMatcher } from '../../src/lib/matcher.ts';
import type { Word } from '../../src/types.ts';

const ref = process.argv[2] ?? 'HEAD';
const atRef = (path: string) => JSON.parse(execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8', maxBuffer: 1 << 30 }));
const onDisk = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const words = (v: Word[]) => v.filter((w) => w.kind !== 'grammar');

const old = words(atRef('public/data/vocab.json'));
const cur = words(onDisk('public/data/vocab.json'));
const oldIds = new Set(old.map((w) => w.id));
const a = buildMatcher(old, atRef('public/data/inflections.json'));
const b = buildMatcher(cur, onDisk('public/data/inflections.json'));

const moved = new Map<string, { n: number; ex: string }>();
for (const w of old) for (const e of w.ex ?? []) {
  const sa = a.annotate(e.de), sb = b.annotate(e.de);
  sa.forEach((x, i) => {
    const y = sb[i];
    if (!x.isWord || !y?.word || x.word?.id === y.word.id || oldIds.has(y.word.id)) return;
    const k = `${x.text.toLowerCase()}: ${x.word?.term ?? '∅'} → ${y.word.term}`;
    const c = moved.get(k) ?? { n: 0, ex: e.de };
    c.n++;
    moved.set(k, c);
  });
}
const rows = [...moved].sort((p, q) => q[1].n - p[1].n);
const taken = rows.filter(([k]) => !k.includes(': ∅ →'));
console.log(`new cards since ${ref}: ${cur.filter((w) => !oldIds.has(w.id)).length}`);
console.log(`tokens moved to them: ${rows.reduce((s, r) => s + r[1].n, 0)} — ${rows.length - taken.length} gap kinds filled, ${taken.length} taken from an old card`);
console.log('\n— taken from an old card (read each one) —');
for (const [k, v] of taken) console.log(`${String(v.n).padStart(4)}  ${k}   «${v.ex.slice(0, 80)}»`);
