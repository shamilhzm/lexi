// Rank what to author next — Phase 1 of docs/DICTIONARY.md.
//
// The corpus grows by batches through `authoring:new`, and the question every
// batch starts with is *which two hundred words*. Answering it by intuition is
// how a corpus ends up with nine words for kitchen utensils and none for the
// modal particles a learner meets in the first hour.
//
// So: take the forms real German actually uses, subtract what Lexi already
// reaches, and rank what is left by how much of a page each one would light up.
//
// ## Two filters, and the second one is the interesting one
//
// **Dark, by the app's own matcher** — not "absent from vocab.json". A form the
// matcher already resolves through an inflection or a compound is not a gap, and
// a card for it would be a review spent on something the learner has.
//
// **Attested as a lemma in Wiktionary** — which does three jobs at once. It
// drops the subtitle noise that dominates the raw dark list (`oh, hey, ok, ach,
// hi, ne, n, s`), it drops inflected forms in favour of the lemma that would
// actually be taught, and it hands the author the facts — part of speech,
// gender, plural, IPA, a gloss to start from — so a batch is written from data
// rather than from memory. The authoring gate re-checks all of it against
// de.wiktionary anyway; this is about proposing well, not about trusting.
import './shim.ts';
import { PATHS, SOURCES } from './config.ts';
import { loadCorpus, primeApp, fileExists } from './lib.ts';
import { loadFrequencies } from './sources/frequency.ts';
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const LIMIT = Number(process.env.LIMIT ?? 400);
const SKIP = Number(process.env.SKIP ?? 0);
const OUT = join(process.cwd(), 'scripts', 'authoring', 'batches', 'candidates.json');

const corpus = loadCorpus(PATHS.vocab);
const matcher = await primeApp(corpus);
const paths = [SOURCES.frequency, SOURCES.frequencySpoken]
  .map((s: { file: string }) => join(PATHS.raw, s.file)).filter(fileExists);
const freq = loadFrequencies(paths, Infinity);

// **A candidate must appear in the news corpus, not only in subtitles.**
//
// The merged ranking is right for *measuring* coverage — a learner meets spoken
// German too — and wrong for *choosing what to teach*. Ranked on the merge, the
// top thirty came out: `Ach, Scheiße, Dad, Mom, Mama, Arsch, new, super, Mist,
// Sex, Boss, frank, Idiot, Arschloch, Colonel, Madame`. That is a dubbing
// studio's vocabulary — English words spoken by German actors, interjections,
// and swearing — not the next two hundred words a B1 learner needs.
//
// Requiring the news list removes almost all of it in one line, and what it
// removes is exactly what it should: a word that appears in a million words of
// German journalism is a word worth a card.
const newsPath = join(PATHS.raw, SOURCES.frequency.file);
const news = new Map<string, number>();
if (fileExists(newsPath)) for (const e of loadFrequencies([newsPath], Infinity)) {
  news.set(e.word.toLowerCase(), Math.max(news.get(e.word.toLowerCase()) ?? 0, e.freq));
}
if (!news.size) { console.error('no news frequency list — run npm run corpus:fetch'); process.exit(1); }

// 1. What is dark: every form the matcher cannot claim at all.
const dark = new Map<string, number>();
for (const e of freq) {
  const seg = matcher.annotate(e.word)[0];
  if (seg?.word) continue;                       // a card, an inflection, or a compound
  if (matcher.isNeutralWord(e.word)) continue;   // function words are handled, not taught
  if (matcher.isLikelyEntity(e.word)) continue;  // proper nouns are excluded on purpose
  if (e.word.length < 3) continue;
  // **Ranked by the news count, not the merged one.** Filtering on presence in
  // the news list was not enough: *Dad*, *Boss*, *new* and *Scheiße* all occur in
  // German journalism, just rarely, and the merged score kept them at the top
  // because a dubbing studio says them constantly. Ranking on the news count
  // moves them to where their actual weight in written German puts them.
  const lc = e.word.toLowerCase();
  const n = news.get(lc);
  if (n === undefined) continue;
  dark.set(lc, n);
}

// 2. Which of those Wiktionary knows as a lemma, and what it says about them.
const POS = { noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb' } as const;
const GENDER: Record<string, 'der' | 'die' | 'das'> = {
  masculine: 'der', feminine: 'die', neuter: 'das',
};

interface Cand {
  term: string; pos: string; gloss: string[]; freq: number;
  gender?: string; plural?: string; ipa?: string;
}
const found = new Map<string, Cand>();

const rl = createInterface({ input: createReadStream(join(PATHS.raw, 'kaikki-de.jsonl')) });
for await (const line of rl) {
  let j: {
    word?: string; pos?: string;
    senses?: { glosses?: string[]; tags?: string[]; form_of?: { word?: string }[] }[];
    sounds?: { ipa?: string }[];
    forms?: { form?: string; tags?: string[] }[];
  };
  try { j = JSON.parse(line); } catch { continue; }
  if (!j.word || !j.pos || !(j.pos in POS)) continue;
  const lc = j.word.toLowerCase();
  const f = dark.get(lc);
  if (!f) continue;

  // Real senses only. An entry whose every sense is `form_of` is an inflection,
  // and the lemma it points at is either already a card or dark in its own right
  // — either way this is not the row to author.
  const senses = (j.senses ?? []).filter((s) => !s.form_of?.[0]?.word);
  const gloss = senses.flatMap((s) => s.glosses ?? []).slice(0, 3);
  if (!gloss.length) continue;

  const pos = POS[j.pos as keyof typeof POS];
  const prev = found.get(lc);
  if (prev && prev.freq >= f) continue;

  const tags = new Set(senses.flatMap((s) => s.tags ?? []));
  const c: Cand = { term: j.word, pos, gloss, freq: f };
  if (pos === 'noun') {
    for (const [t, g] of Object.entries(GENDER)) if (tags.has(t)) { c.gender = g; break; }
    const pl = j.forms?.find((x) => x.tags?.includes('plural') && x.form && x.form !== '-');
    if (pl?.form) c.plural = `die ${pl.form}`;
  }
  const ipa = j.sounds?.find((s) => s.ipa)?.ipa;
  if (ipa) c.ipa = ipa.replace(/^[[/]|[\]/]$/g, '');
  found.set(lc, c);
}

const ranked = [...found.values()].sort((a, b) => b.freq - a.freq);
const slice = ranked.slice(SKIP, SKIP + LIMIT);
writeFileSync(OUT, JSON.stringify(slice, null, 1));

const tokens = ranked.reduce((n, c) => n + c.freq, 0);
const darkTokens = [...dark.values()].reduce((a, b) => a + b, 0);
console.log(`dark forms                ${dark.size.toLocaleString()}`);
console.log(`  of those, real lemmas   ${ranked.length.toLocaleString()}   (${(ranked.length / dark.size * 100).toFixed(1)}%)`);
console.log(`  their share of dark mass ${(tokens / darkTokens * 100).toFixed(1)}%`);
console.log(`written                   ${slice.length} candidates, ranks ${SKIP + 1}–${SKIP + slice.length}`);
console.log(`→ ${OUT}`);
console.log(`\ntop 30: ${ranked.slice(SKIP, SKIP + 30).map((c) => c.term).join(', ')}`);
