// How much German does an English speaker already own? Measured per card.
//
//   npm run corpus:transfer            (needs data/raw/kaikki-de.jsonl: npm run corpus:fetch)
//
// The instrument behind docs/LEARNING-WEB.md §transfer. Each teachable card gets the
// first class that holds, in this order:
//
//   borrowed   — Wiktionary says German took the word from English (das Team).
//   cognate    — Wiktionary lists an English cognate, and that word is in Lexi's
//                gloss, so the learner can see it (das Haus · house).
//   inferred   — no English word recorded, but the word is inherited and its
//                Proto-West/Proto-Germanic ancestor is spelled close to a word in the
//                gloss (der Bruder ← *brōþer · brother; die Milch ← *meluk · milk).
//   hidden     — Wiktionary lists an English cognate the gloss does not contain:
//                a link the learner owns without knowing it (die Zeit · tide), or a
//                false friend (bekommen · become). The script cannot tell which.
//   lookalike  — no recorded English link, but the headword is spelled like a word
//                in its gloss (die Information · information), mostly shared Latin,
//                French and Greek loans.
//   none
//
// `lookalike` is tried before `hidden`, because a word the reader can see beats a
// link they cannot.
//
// It is a lower bound, not a census: a cognate Wiktionary does not list, or a
// lookalike past the edit-distance threshold (der Kaffee · coffee), counts as none.
// A noun joins only the entries that agree with its gender and plural, because
// *der Tag, die Tage* and the loan *der Tag, die Tags* share a word and a gender
// (LESSONS, *der Tag was "borrowed from English"*). Other parts of speech have no
// such field, so a verb or adjective homograph can still merge.
// Nothing here writes to the corpus.
import { createReadStream, readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

interface Card { id: string; term: string; en: string; pos: string; level: string; kind: string; gender?: string; plural?: string }
type Klass = 'borrowed' | 'cognate' | 'inferred' | 'hidden' | 'lookalike' | 'none';
/** One Wiktionary entry. `genders`/`plural` come from its headword line, when it has one. */
interface Link { borrowed: boolean; cognates: Set<string>; ancestors: string[]; genders: Set<string>; plurals: Set<string> }

const RAW = 'scripts/corpus/data/raw/kaikki-de.jsonl';
if (!existsSync(RAW)) { console.error(`missing ${RAW} — run npm run corpus:fetch`); process.exit(1); }

const POS: Record<string, string[]> = {
  noun: ['noun'], verb: ['verb'], adjective: ['adj'], adverb: ['adv'], pronoun: ['pron'],
  interjection: ['intj'], number: ['num'], preposition: ['prep'], conjunction: ['conj'],
  particle: ['particle'], phrase: ['phrase', 'proverb', 'prep_phrase'],
};
const BORROW = new Set(['bor', 'bor+', 'ubor', 'lbor', 'der', 'pseudo-loan', 'sl']);

const bare = (t: string) => t.normalize('NFC').replace(/^(?:der|die|das)(?:\/(?:der|die|das))*\s+/, '').trim();
const cards = (JSON.parse(readFileSync('public/data/cards.json', 'utf8')) as Card[]).filter((c) => c.kind === 'word');
const wanted = new Set<string>();
for (const c of cards) { const b = bare(c.term); wanted.add(b); wanted.add(b.replace(/^sich\s+/, '')); }

const links = new Map<string, Link[]>(); // key: word|kaikkiPos → every entry, kept apart
const rl = createInterface({ input: createReadStream(RAW), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.includes('"etymology_')) continue;
  let j: { word?: string; pos?: string; lang_code?: string; etymology_text?: string; etymology_templates?: { name: string; args: Record<string, string> }[]; head_templates?: { expansion?: string }[] };
  try { j = JSON.parse(line); } catch { continue; }
  if (j.lang_code !== 'de' || !j.word || !wanted.has(j.word)) continue;
  const text = j.etymology_text ?? '';
  const head = j.head_templates?.[0]?.expansion ?? '';
  const link: Link = {
    borrowed: /^(?:Borrowed|Unadapted borrowing|Pseudo-anglicism) from English/.test(text)
      || (j.etymology_templates ?? []).some((t) => BORROW.has(t.name) && t.args['1'] === 'de' && t.args['2'] === 'en'),
    // Prose only: a `cog|en` template once named a Dutch word (LESSONS).
    // "English Monday" is capitalised: match the case, then fold it.
    cognates: new Set([...text.matchAll(/(?<!Middle |Old )English ([A-Za-z]+)/g)].map((m) => m[1].toLowerCase())),
    // Templates when there are any; some entries carry only an etymology tree in prose.
    ancestors: [
      ...(j.etymology_templates ?? [])
        .filter((t) => t.name === 'inh' && t.args['1'] === 'de' && (t.args['2'] === 'gmw-pro' || t.args['2'] === 'gem-pro') && t.args['3'])
        .map((t) => t.args['3']),
      ...[...text.matchAll(/Proto-(?:West )?Germanic (\*[^\s,.;()]+)/g)].map((m) => m[1]),
    ],
    // "Tag m (strong, genitive Tages or Tags, plural Tage)"
    genders: new Set((head.match(/^\S+ ((?:[mfn]|pl)(?: or (?:[mfn]|pl))*)\b/)?.[1] ?? '').split(' or ').filter(Boolean)),
    // "plural Parks or (less common) Parke": every alternative counts.
    plurals: new Set((head.match(/plural ([^,)]+(?:\)[^,)]*)?)/)?.[1] ?? '').replace(/\([^)]*\)/g, ' ').split(/\s+/).map((w) => w.replace(/[^\p{L}-]/gu, '')).filter((w) => /^\p{Lu}/u.test(w))),
  };
  const key = `${j.word}|${j.pos}`;
  links.set(key, [...(links.get(key) ?? []), link]);
}

const GENDER: Record<string, string> = { der: 'm', die: 'f', das: 'n' };
/** Does this entry describe this card, as far as the entry's headword line can say? */
const agrees = (c: Card, l: Link) => {
  if (c.pos !== 'noun') return true;
  const g = c.gender && GENDER[c.gender];
  if (g && l.genders.size && !l.genders.has(g) && !(c.gender === 'die' && l.genders.has('pl'))) return false;
  const pl = c.plural?.replace(/^die\s+/, '');
  return !(pl && /^\p{Lu}/u.test(pl) && l.plurals.size && !l.plurals.has(pl));
};

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'something', 'someone', 'sth', 'one', 'that', 'this', 'very', 'not', 'are', 'was', 'been']);
const glossWords = (en: string) => en.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOP.has(w));
const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
const lev = (a: string, b: string) => {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let k = 1; k <= b.length; k++) { const t = d[k]; d[k] = Math.min(d[k] + 1, d[k - 1] + 1, prev + (a[i - 1] === b[k - 1] ? 0 : 1)); prev = t; }
  }
  return d[b.length];
};
/** Spelling folded across the two orthographies: ph/f, th/t, c/k, sch/ch, z/s, y/ie,
 *  doubled letters, a final -e. *Telefon · telephone*, *Familie · family*. */
const norm = (s: string) => fold(s).replace(/ph/g, 'f').replace(/th/g, 't').replace(/sch/g, 'sh').replace(/ch/g, 'sh')
  .replace(/ck/g, 'k').replace(/c/g, 'k').replace(/z/g, 's').replace(/y/g, 'i').replace(/ie/g, 'i')
  .replace(/(.)\1/g, '$1').replace(/e$/, '');
const close = (a: string, b: string, max: number, min: number) =>
  a.length >= min && b.length >= min && lev(a, b) / Math.max(a.length, b.length) <= max;
const looksLike = (c: Card) => {
  let g = bare(c.term).replace(/^sich\s+/, '');
  if (g.includes(' ')) return false;
  if (c.pos === 'verb') g = g.replace(/e?n$/, '');
  const ng = norm(g);
  return glossWords(c.en).some((w) => close(ng, norm(w), 0.25, 4));
};
/** A Proto-(West-)Germanic reconstruction, spelled like a modern word: *brōþer → broter. */
const ancestral = (r: string) => norm(r.replace(/^\*/, '').replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/ƀ/g, 'b').replace(/ǥ/g, 'g')
  .normalize('NFD').replace(/\p{M}/gu, '')).replace(/(?:az|iz|uz|ja|jo|o|u|a|i)$/, '');

const classify = (c: Card): { k: Klass; cog?: string } => {
  const b = bare(c.term);
  const entries: Link[] = [];
  for (const w of new Set([b, b.replace(/^sich\s+/, '')])) for (const p of POS[c.pos] ?? []) {
    for (const l of links.get(`${w}|${p}`) ?? []) if (agrees(c, l)) entries.push(l);
  }
  // Borrowed only when every entry that could be this card says so: *der Pass* has
  // four entries with one gender and one plural, and only the football pass is English.
  if (entries.length && entries.every((l) => l.borrowed)) return { k: 'borrowed' };
  const cognates = new Set(entries.flatMap((l) => [...l.cognates]));
  const gw = new Set(c.en.toLowerCase().split(/[^a-z]+/).filter(Boolean)); // "to go" keeps "go"
  const seen = [...cognates].find((x) => gw.has(x));
  if (seen) return { k: 'cognate', cog: seen };
  for (const r of entries.flatMap((l) => l.ancestors)) {
    const a = ancestral(r);
    const hit = glossWords(c.en).find((w) => close(a, norm(w), 0.4, 3));
    if (hit) return { k: 'inferred', cog: `${hit} ← ${r}` };
  }
  if (looksLike(c)) return { k: 'lookalike' };
  if (cognates.size) return { k: 'hidden', cog: [...cognates][0] };
  return { k: 'none' };
};

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const KS: Klass[] = ['borrowed', 'cognate', 'inferred', 'lookalike', 'hidden', 'none'];
const VISIBLE: Klass[] = ['borrowed', 'cognate', 'inferred', 'lookalike'];
const tally: Record<string, Record<Klass, number>> = {};
const examples = Object.fromEntries(KS.map((k) => [k, [] as string[]])) as Record<Klass, string[]>;
for (const lv of [...LEVELS, 'all']) tally[lv] = Object.fromEntries(KS.map((k) => [k, 0])) as Record<Klass, number>;
for (const c of cards) {
  const { k, cog } = classify(c);
  tally[c.level][k]++; tally.all[k]++;
  if (examples[k].length < 8 && c.level <= 'A2') examples[k].push(`${c.term} (${c.en.slice(0, 32)}${cog ? ` · ${cog}` : ''})`);
}
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
console.log(`level   cards${KS.map((k) => k.padStart(10)).join('')}   visible`);
for (const lv of [...LEVELS, 'all']) {
  const t = tally[lv]; const n = KS.reduce((s, k) => s + t[k], 0);
  console.log(`${lv.padEnd(6)}${String(n).padStart(7)}${KS.map((k) => pct(t[k], n).padStart(10)).join('')}   ${pct(VISIBLE.reduce((s, k) => s + t[k], 0), n).padStart(6)}`);
}
console.log('\nvisible = borrowed + cognate + inferred + lookalike: a word an English reader can recognise.');
for (const k of KS.slice(0, 5)) console.log(`\n${k}: ${examples[k].join(' · ')}`);

// `-- --list none` prints every A1 card in one class, for hand-checking the misses.
const list = process.argv.indexOf('--list');
if (list > 0) {
  const k = process.argv[list + 1] as Klass;
  console.log(`\nA1 · ${k}: ${cards.filter((c) => c.level === 'A1' && classify(c).k === k).map((c) => bare(c.term)).join(', ')}`);
}
