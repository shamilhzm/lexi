// Emit `public/data/freq.json` — the card-id → rank map the session builder uses
// to put the commonest words in a CEFR band first.
//
// ## Why this was rewritten *(2026-09-09)*
//
// The projection used to read `provenance.json`, which carries a rank only for
// cards that were **discovered through** a frequency list. That is a rank for the
// cards nobody needed one for. Measured: **87 of 1,170 A1 cards**, and not one of
// `sein`, `haben`, `werden`, `gehen`, `Zeit`, `Kind`, `nicht`, `ich` or `gut`.
//
// `byFrequency` sorts unranked cards *last*, so every one of those fell into a tail
// ordered by nothing but position in the build — and `grillen` was introduced 70th
// against `sein` at 118th. That is the persona complaint from Round 4, surviving the
// fix that was written for it: the sort was correct and the signal was missing.
//
// The ranking that fixes it was already in the repo. `data/kernwortschatz.tsv` has
// been the coverage target for `npm run corpus:kernwortschatz` since it arrived, and
// it covers what provenance does not: **5,307 of the 6,844 word cards, 1,010 of
// 1,170 at A1**, `sein` at 4 and `grillen` at 8,451. The old projection's 87 was
// never going to grow — a card only earned a rank by being *found* through the list.
//
// ## Which of the four rankings, and why not a blend
//
// The reference is four lists — `gesamt`, `zeitung` (print), `forum` (spoken-ish),
// `kinder` — and the disagreements between them are the point of having four. They
// are also why a blend is refused here: averaging four register rankings invents a
// fifth that nobody validated, and this file feeds a scheduler, not a report.
//
// **`gesamt` is the ordering rank**, because it is the one ranking that is not about
// a register and Lexi does not know which register its learner needs. The other
// three stay where they are useful — in `corpus:kernwortschatz`, as the instrument
// that finds *holes*. A row the balanced list does not rank at all falls back to its
// best position among the other three: it is the same kind of number over a
// sub-corpus, and a word that is 200th in children's material is a word a learner
// meets early whatever the whole corpus says.
//
// The scale-mixing that implies is bounded by where the number is used: the sort is
// **CEFR band first, rank second**, so a rank is only ever compared against other
// cards of the same level. It decides which of two A1 cards comes first. It never
// decides that an A1 card comes before a B2 one.
//
// ## The tail, and why it is offset rather than merged
//
// 171 cards carry a provenance rank and no reference rank, and printing them says
// what they are: `der Berliner` (521), `der Wiener` (756), `der Hamburger`, `der
// Frankfurter`, `der Salzburger`, `die Bundespolizei`, `die Unfallstelle`,
// `der Schiedsrichter`. Demonyms and news vocabulary — high in a newswire count,
// and not words to teach in week one. Those are the same class `corpus:candidates`
// now filters out of the authoring queue.
//
// So they keep their rank *behind* the reference: `CORE_CEILING + provenanceRank`.
// A word the core list has never heard of does not outrank one it ranks 9,000th.
//
// ## Licence
//
// This is the change that makes the reference **ship**, where before it was build
// time only, so `ATTRIBUTIONS.md` §6 is updated with it. The obligation is already
// met: the source is CC BY-SA 4.0 and `public/data/*` is already CC BY-SA 4.0 via
// Wiktionary. It is named here because a ranking is closer to fact than to
// expression but is still somebody's work, and VISION's open decision 2a says that
// is a call to make out loud rather than by quietly sorting a list.
//
// ## What it costs
//
// The file goes from 50 KB to 135 KB, **16 KB to 44 KB gzipped**, and it is fetched
// in parallel with `cards.json` (294 KB gz) on the boot path. That is a real 28 KB
// against work that spent a whole track buying bytes back, and it is the right
// trade: the alternative is a scheduler that introduces `so` before `sein`. It stays
// optional by construction — a failed fetch leaves the index empty and the sort falls
// back to corpus order, which is exactly what 71% of the corpus had anyway.
//
// Deterministic, needs no network, touches nothing but its own output.
//
// Run: npm run corpus:freq
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const PROVENANCE = join(ROOT, 'public/data/provenance.json');
const VOCAB = join(ROOT, 'public/data/vocab.json');
const TSV = join(import.meta.dirname, 'data', 'kernwortschatz.tsv');
const OUT = join(ROOT, 'public/data/freq.json');

/** The reference ranks 10,000 lemmas per list. Anything ranked only by the older
 *  projection sorts after all of them. */
const CORE_CEILING = 10_000;
type Corpus = 'gesamt' | 'zeitung' | 'forum' | 'kinder';
const CORPORA: Corpus[] = ['gesamt', 'zeitung', 'forum', 'kinder'];

interface ProvRow { id: string; freqRank: number | null }
interface VocabRow { id: string; term: string; level: string; kind?: string }

/** Lifted from `kernwortschatz.ts`, deliberately, and the duplication is the lesser
 *  evil: that script is a *report* and this one writes a shipped file, so a change
 *  to one must not silently change the other. `kernwortschatz.test.ts` pins the
 *  shared cases. */
const STEM_FORMS: Record<string, string[]> = {
  ander: ['andere', 'anderer', 'anderes'],
  sonstig: ['sonstige', 'sonstiger', 'sonstiges'],
  jeglich: ['jegliche', 'jeglicher', 'jegliches'],
  irgendein: ['irgendeine', 'irgendeiner', 'irgendeines'],
  letzt: ['letzte', 'letzter', 'letztes'],
  keine: ['kein'], jede: ['jeder'], viele: ['viel'], wenige: ['wenig'], lange: ['lang'],
};

/** No article, no reflexive, no government: `sich erinnern an + A` and `erinnern`
 *  are one lemma to a frequency list. The government strip is load-bearing — 47
 *  governed cards were invisible to the coverage check for want of it. */
export const fold = (t: string) => t
  .replace(/^(der|die|das)\s+/i, '')
  .replace(/^sich\s+/i, '')
  .replace(/\s+\w+\s+\+\s+[ADG]$/i, '')
  .trim()
  .toLowerCase();

/** form → best rank, built once. First row wins on a duplicate form, which is the
 *  higher-ranked one because the file is in rank order. */
function referenceRanks(): Map<string, number> {
  const byForm = new Map<string, number>();
  for (const line of readFileSync(TSV, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [cell, ...cols] = line.split('\t');
    if (!cell) continue;
    const rank: Partial<Record<Corpus, number>> = {};
    CORPORA.forEach((c, i) => { const v = cols[i]; if (v && v !== '-') rank[c] = Number(v); });
    const others = CORPORA.slice(1).map((c) => rank[c]).filter((n): n is number => n != null);
    const r = rank.gesamt ?? (others.length ? Math.min(...others) : null);
    if (r == null) continue;
    const forms = cell.split(',').map((s) => s.trim()).filter(Boolean);
    for (const f of [...forms, ...forms.flatMap((x) => STEM_FORMS[x.toLowerCase()] ?? [])]) {
      const k = f.toLowerCase();
      if (!byForm.has(k)) byForm.set(k, r);
    }
  }
  return byForm;
}

const reference = referenceRanks();
const vocab: VocabRow[] = JSON.parse(readFileSync(VOCAB, 'utf8'));
const prov: ProvRow[] = JSON.parse(readFileSync(PROVENANCE, 'utf8'));
const live = new Set(vocab.map((w) => w.id));
const provRank = new Map<string, number>();
let dangling = 0;
for (const row of prov) {
  if (row.freqRank == null) continue;
  // A rank for a card the corpus no longer ships is dead weight in a file the app
  // loads at boot. The id-map merges (see src/data/idmap.ts) retire ids routinely.
  if (!live.has(row.id)) { dangling++; continue; }
  provRank.set(row.id, row.freqRank);
}

const out: Record<string, number> = {};
let fromReference = 0;
let fromProvenance = 0;
for (const w of vocab) {
  // The 110 `kind: 'grammar'` rows are filtered at load (`src/data/index.ts`) and
  // never reach a session, so a rank for one is a byte the app downloads to drop.
  if (w.kind === 'grammar') continue;
  const r = reference.get(fold(w.term));
  if (r != null) { out[w.id] = r; fromReference++; continue; }
  const p = provRank.get(w.id);
  if (p != null) { out[w.id] = CORE_CEILING + p; fromProvenance++; }
}

// Sorted by id so the file is diff-stable: without this a reorder upstream would
// rewrite every line and make a one-word change unreviewable.
const sorted: Record<string, number> = {};
for (const id of Object.keys(out).sort()) sorted[id] = out[id];
writeFileSync(OUT, JSON.stringify(sorted) + '\n');

const covered = Object.keys(sorted).length;
const words = vocab.filter((w) => w.kind !== 'grammar');
const a1 = words.filter((w) => w.level === 'A1');
const a1Covered = a1.filter((w) => sorted[w.id] != null).length;
const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`;
const bytes = readFileSync(OUT).length;

console.log(`freq.json: ${covered} of ${words.length} cards (${pct(covered, words.length)}), ${(bytes / 1024).toFixed(0)} KB`);
console.log(`  ${fromReference} from the Kernwortschatz reference, ${fromProvenance} from provenance (offset past ${CORE_CEILING})`);
console.log(`  A1: ${a1Covered} of ${a1.length} (${pct(a1Covered, a1.length)}) — this is the band the first session comes from`);
if (dangling) console.log(`  skipped ${dangling} rank(s) for ids the corpus no longer ships`);
if (covered < words.length) {
  console.log(`  ${words.length - covered} cards have no rank; they sort after ranked ones (see byFrequency in src/lib/freq.ts).`);
}
