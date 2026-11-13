// Exam coverage — of the words an exam syllabus names, how many does Lexi teach,
// and at the level the exam asks for them?
//
// `corpus:kernwortschatz` asks whether Lexi teaches the words German runs on. This
// asks the narrower question a certificate candidate has: Goethe publishes the
// vocabulary its A1, A2 and B1 papers may use, and a word on that list with no
// card is a word the paper can print and Lexi never showed.
//
// ## What is measured, and what cannot be
//
//   A1, A2, B1   Goethe's own Wortlisten — the syllabus, lemma by lemma. telc's
//                A1–B1 papers are written against the same joint inventory (the B1
//                exam is literally shared: Goethe/ÖSD/telc "Zertifikat Deutsch").
//   B2, C1, C2   **No list exists.** Neither Goethe nor telc publishes one above
//                B1 — the papers assume open vocabulary. The only honest proxy is
//                frequency, which `corpus:kernwortschatz` already reports; this
//                script prints the pointer rather than inventing a syllabus.
//
// ## Four answers, because "missing" is three different failures
//
//   at level      a card exists at or below the list's level — the learner placed
//                 there meets it.
//   filed above   a card exists, but only at a higher level. The level filter is
//                 cumulative, so an A2 learner never sees a B2 card: the word is
//                 in the corpus and absent from their app. A relevel, not an
//                 authoring job.
//   lookup only   no card; the dictionary layer can answer it. An authoring job.
//   absent        neither layer knows the spelling. Usually a phrase, a stem or a
//                 regional variant — read these by hand before believing them.
//
// The lists are not committed (scripts/corpus/data/ is gitignored — third-party
// syllabi, fetched and never redistributed). To re-derive them: relevel-a1.ts
// REBUILD for A1, `goethe-wordlist.py` for A2 and B1.
//
// Run: npm run corpus:examcov
//      npm run corpus:examcov -- --missing B1          (lemmas with no card)
//      npm run corpus:examcov -- --above A2            (cards filed above the list)
//      npm run corpus:examcov -- --rulings A2 > r.tsv  (input for relevel-cards.ts)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type Level = typeof LEVELS[number];
const LISTS: { level: Level; file: string }[] = [
  { level: 'A1', file: 'goethe-a1-wordlist.txt' },
  { level: 'A2', file: 'goethe-a2-wordlist.txt' },
  { level: 'B1', file: 'goethe-b1-wordlist.txt' },
];

interface Card { id: string; term: string; level: Level; pos?: string; kind?: string }

/** No article, no reflexive pronoun, no government, lowercased — so `sich freuen
 *  auf + A` answers for `freuen`. */
const PREPS = new Set(['an', 'auf', 'aus', 'bei', 'für', 'gegen', 'in', 'mit', 'nach', 'über', 'um', 'unter', 'von', 'vor', 'zu']);
const fold = (t: string) => {
  let s = t
    .replace(/^(der\/die|der|die|das)\s+/i, '')
    .replace(/^sich\s+/i, '');
  // **The government, which is 62 cards.** `achten auf + A` must answer for
  // `achten`, `wegen + G` for `wegen`. The first version of this used `\w+` for
  // the preposition, and `\w` is ASCII: every `für` and `über` card — `nachdenken
  // über + A`, `sich eignen für + A` — stayed invisible, and `wegen + G` (no
  // preposition at all) never matched. A batch nearly authored `wegen` a second
  // time. LESSONS: no `\w` or `\b` over German text.
  if (/\s\+\s[ADG]$/.test(s)) {
    s = s.replace(/\s\+\s[ADG]$/, '');
    const words = s.split(/\s+/);
    if (words.length > 1 && PREPS.has(words[words.length - 1].toLowerCase())) words.pop();
    s = words.join(' ');
  }
  return s.replace(/[-–]$/, '').trim().toLowerCase();
};

/** Spellings a list entry is *taught under* when its own spelling is not a card:
 *  the list's stems (`all-`, `ander-`), its `X sein` predicates (the card is `X`),
 *  and its ß/ss and slash variants. Each maps an entry to forms of the same
 *  lexeme — nothing is aliased across two words. */
function variants(lemma: string): string[] {
  const f = fold(lemma);
  // `die Fantasie/Phantasie`, `das Hähnchen/Hühnchen`: either spelling answers.
  const out = [f, ...f.split('/').map((x) => x.trim()).filter((x) => x.length > 2)];
  for (const tail of [' sein', ' haben', ' werden', ' machen']) {
    if (f.endsWith(tail)) out.push(f.slice(0, -tail.length));
  }
  if (/^[a-zäöüß]+$/.test(f) && lemma.trim().endsWith('-')) out.push(f + 'e', f + 'er', f + 'es');
  const STEMS: Record<string, string[]> = {
    all: ['alle', 'alles'], ander: ['andere'], beid: ['beide'], dies: ['dieser', 'diese'],
    jed: ['jeder'], welch: ['welcher'], link: ['linke', 'links'], recht: ['rechte', 'rechts'],
    nächst: ['nächste', 'nächster'], letzt: ['letzte', 'letzter'], best: ['beste'],
    nächste: ['nächster', 'nächst'], letzte: ['letzter', 'letzt'], erste: ['erster', 'erst'],
  };
  out.push(...(STEMS[f] ?? []));
  if (f.includes(' ')) out.push(f.replace(/\s+/g, ''));        // spazieren gehen · leid tun
  return [...new Set(out)];
}

const cards: Card[] = (JSON.parse(readFileSync(join(ROOT, 'public/data/vocab.json'), 'utf8')) as Card[])
  .filter((c) => c.kind !== 'grammar');

/** **The part-of-speech guard** — `relevel-a1.ts` found it the hard way. Folding
 *  drops the article, so Goethe's noun `der Dank` finds Lexi's preposition `dank`,
 *  `das Lokal` finds the adjective `lokal`, the verb `reisen` finds `das Reisen`.
 *  The list prints an article for nouns and none otherwise, so the entry itself
 *  says which it is: a noun entry is only answered by a noun card, and vice versa.
 *  (The first run of this script had no guard and called all three covered.) */
const expectsNoun = (lemma: string) => /^(der\/die|der|die|das)\s+[A-ZÄÖÜ]/.test(lemma);
const key = (folded: string, noun: boolean) => `${noun ? 'n' : 'x'}:${folded}`;

/** key → the lowest-levelled card for it. */
const LOWEST = new Map<string, Card>();
for (const c of cards) {
  const k = key(fold(c.term), c.pos === 'noun');
  const had = LOWEST.get(k);
  if (!had || LEVELS.indexOf(c.level) < LEVELS.indexOf(had.level)) LOWEST.set(k, c);
}

const ANSWERED = new Set<string>();
const LEX_DIR = join(ROOT, 'public/data/lex');
if (existsSync(LEX_DIR)) {
  for (const f of readdirSync(LEX_DIR)) {
    if (f === 'index.json' || !f.endsWith('.json')) continue;
    const shard = JSON.parse(readFileSync(join(LEX_DIR, f), 'utf8')) as
      { e?: { w?: string }[]; f?: Record<string, unknown> };
    for (const e of shard.e ?? []) if (e?.w) ANSWERED.add(fold(e.w));
    for (const k of Object.keys(shard.f ?? {})) ANSWERED.add(k.toLowerCase());
  }
}

type Verdict =
  | { kind: 'at' } | { kind: 'above'; level: Level; card: Card } | { kind: 'lookup' } | { kind: 'absent' };

export function classify(lemma: string, level: Level): Verdict {
  const vs = variants(lemma);
  const noun = expectsNoun(lemma);
  let best: Card | undefined;
  for (const v of vs) {
    const c = LOWEST.get(key(v, noun));
    if (c && (!best || LEVELS.indexOf(c.level) < LEVELS.indexOf(best.level))) best = c;
  }
  if (best) {
    return LEVELS.indexOf(best.level) <= LEVELS.indexOf(level)
      ? { kind: 'at' } : { kind: 'above', level: best.level, card: best };
  }
  return vs.some((v) => ANSWERED.has(v)) ? { kind: 'lookup' } : { kind: 'absent' };
}

function load(file: string): string[] | null {
  const p = join(import.meta.dirname, 'data', file);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

function main() {
  const [, , flag, arg] = process.argv;
  const pick = (arg ?? '').toUpperCase() as Level;

  if (flag === '--missing' || flag === '--above' || flag === '--rulings') {
    const list = LISTS.find((l) => l.level === pick);
    const lemmas = list && load(list.file);
    if (!lemmas) { console.error(`no list for "${arg}" — one of: ${LISTS.map((l) => l.level).join(', ')}`); process.exit(1); }
    for (const lemma of lemmas) {
      const v = classify(lemma, pick);
      if (flag === '--missing' && (v.kind === 'lookup' || v.kind === 'absent')) console.log(`${lemma}\t${v.kind}`);
      if (flag === '--above' && v.kind === 'above') console.log(`${lemma}\t${v.level}`);
      // A rulings file for `relevel-cards.ts`: card_id, to_level, reason. Review
      // it by hand before `--write` — the largest jumps first.
      if (flag === '--rulings' && v.kind === 'above') console.log(`${v.card.id}\t${pick}\tGoethe ${pick} Wortliste (${lemma})`);
    }
    return;
  }

  console.log(`examcov — ${cards.length} cards · ${ANSWERED.size} lookup keys\n`);
  console.log('  list          entries   at level        filed above   lookup only   absent');
  const pc = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`.padStart(6);
  for (const { level, file } of LISTS) {
    const lemmas = load(file);
    if (!lemmas) { console.log(`  Goethe ${level}     (list not on disk — see the header of this script)`); continue; }
    const n = { at: 0, above: 0, lookup: 0, absent: 0 };
    for (const lemma of lemmas) n[classify(lemma, level).kind]++;
    const t = lemmas.length;
    console.log(`  Goethe ${level}   ${String(t).padStart(7)}   ${String(n.at).padStart(5)} ${pc(n.at, t)}` +
      `   ${String(n.above).padStart(5)} ${pc(n.above, t)}   ${String(n.lookup).padStart(5)} ${pc(n.lookup, t)}` +
      `   ${String(n.absent).padStart(4)} ${pc(n.absent, t)}`);
  }
  console.log('\n  B2 · C1 · C2: no published list exists (Goethe and telc assume open');
  console.log('  vocabulary above B1). The frequency proxy is `npm run corpus:kernwortschatz`.');
}

if (import.meta.filename === process.argv[1]) main();
