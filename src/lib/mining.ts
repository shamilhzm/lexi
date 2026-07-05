// Sentence mining — turn pasted German text into review cards. Tokenise, match
// against the lexicon, and split into words you already know, words in the
// lexicon you haven't learned yet, and words not in the lexicon at all. The last
// group can be auto-enriched into user cards via an optional LLM API key.
import { WORDS } from '../data/index.ts';
import { conjugate, canConjugate } from './conjugate.ts';
import { chat, parseLooseJSON, type AiConfig } from './ai.ts';
import type { Word, CEFR } from '../types.ts';

const stripArticle = (term: string) => term.replace(/^(der|die|das)\s+/i, '');

/** Closed-class words (articles, pronouns, prepositions, conjunctions,
 *  contractions) that aren't learnable vocab. The reader treats them as plain
 *  text rather than "new to you", so the count reflects real content words. */
export const FUNCTION_WORDS = new Set<string>([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines',
  'ich', 'du', 'er', 'es', 'wir', 'ihr', 'mich', 'dich', 'sich', 'uns', 'euch',
  'mir', 'dir', 'ihm', 'ihn', 'ihnen', 'mein', 'meine', 'dein', 'deine', 'seine', 'ihre', 'unser', 'euer',
  'in', 'an', 'auf', 'mit', 'von', 'bei', 'nach', 'aus', 'über', 'unter', 'vor', 'hinter', 'neben',
  'zwischen', 'um', 'durch', 'gegen', 'ohne', 'bis', 'seit', 'während', 'wegen', 'trotz', 'gegenüber',
  'und', 'oder', 'aber', 'denn', 'sondern', 'weil', 'dass', 'ob', 'als', 'wenn', 'damit', 'obwohl',
  'am', 'im', 'beim', 'zum', 'zur', 'ans', 'ins', 'vom', 'aufs',
]);
export const isFunctionWord = (tok: string) => FUNCTION_WORDS.has(tok.toLowerCase());

/** Ordinal stems (erste, zweiten, …). Like function words, ordinals aren't
 *  learnable vocab, so the reader treats them as neutral. */
const ORDINAL_STEMS = new Set<string>([
  'erst', 'zweit', 'dritt', 'viert', 'fünft', 'sechst', 'siebt', 'siebent', 'acht', 'neunt', 'zehnt',
  'elft', 'zwölft', 'dreizehnt', 'vierzehnt', 'fünfzehnt', 'sechzehnt', 'siebzehnt', 'achtzehnt',
  'neunzehnt', 'zwanzigst', 'dreißigst', 'vierzigst', 'fünfzigst', 'hundertst', 'tausendst',
]);
export const isOrdinal = (tok: string) =>
  ORDINAL_STEMS.has(tok.toLowerCase().replace(/(ens|en|es|em|er|e)$/, ''));

/** True for words the reader shouldn't count as "new to you": function words and ordinals. */
export const isNeutralWord = (tok: string) => isFunctionWord(tok) || isOrdinal(tok);

const deUmlaut = (s: string) => s.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
// Adjective endings, longest first, so "schärfere" strips "ere" before "e".
const ADJ_SUFFIXES = ['eren', 'erem', 'erer', 'eres', 'sten', 'ere', 'ste', 'en', 'em', 'er', 'es', 'e'];

let index: Map<string, Word> | null = null;
let adjIndex: Map<string, Word> | null = null; // adjective lemma -> Word, for de-inflection
/** lowercased surface form -> Word: dictionary term, article-stripped term,
 *  plural, and (for verbs) every conjugated form, so inflections match too. */
function lexIndex(): Map<string, Word> {
  if (index) return index;
  const m = new Map<string, Word>();
  const adj = new Map<string, Word>();
  const add = (k: string, w: Word) => { if (k && !m.has(k)) m.set(k, w); };
  // Base forms first, so a lemma always wins over another word's inflection.
  for (const w of WORDS) {
    add(w.term.toLowerCase(), w);
    add(stripArticle(w.term).toLowerCase(), w);
    if (w.plural) add(stripArticle(w.plural).toLowerCase(), w);
    if (w.pos === 'adjective') { const k = w.term.toLowerCase(); if (!adj.has(k)) adj.set(k, w); }
  }
  // Then verb inflections (präsens, präteritum, Partizip II) → their infinitive.
  for (const w of WORDS) {
    if (w.pos !== 'verb') continue;
    const inf = stripArticle(w.term);
    if (!canConjugate(inf)) continue;
    try {
      const c = conjugate(inf);
      for (const f of [...c.praesens, ...c.praeteritum, c.partizip]) add(f.toLowerCase(), w);
    } catch { /* skip unconjugable */ }
  }
  index = m;
  adjIndex = adj;
  return m;
}

/** Match a token to a Word: exact/verb/plural form first, then an adjective
 *  de-inflection (strip an ending, match an adjective lemma — with an umlaut
 *  fallback for comparatives like schärfere → scharf). Constrained to adjective
 *  lemmas, so it can't misfire (e.g. gefahren never resolves to the noun Gefahr). */
function matchWord(tok: string): Word | null {
  const idx = lexIndex();
  const lc = tok.toLowerCase();
  const direct = idx.get(lc);
  if (direct) return direct;
  if (lc.length >= 4 && adjIndex) {
    for (const suf of ADJ_SUFFIXES) {
      if (lc.length - suf.length < 3 || !lc.endsWith(suf)) continue;
      const stem = lc.slice(0, -suf.length);
      const w = adjIndex.get(stem) ?? adjIndex.get(deUmlaut(stem));
      if (w) return w;
    }
  }
  return null;
}

/** Invalidate the cached indexes (after user words are added). */
export function resetMiningIndex() { index = null; adjIndex = null; }

/** Unique tokens in reading order, with a display form (as first seen). */
export function tokenize(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const matches = text.match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*/g) ?? [];
  for (const raw of matches) {
    if (raw.length < 2) continue;
    const lc = raw.toLowerCase();
    if (seen.has(lc)) continue;
    seen.add(lc);
    out.push(raw);
  }
  return out;
}

export interface Analysis {
  inLexicon: { token: string; word: Word }[]; // token matched a lexicon entry
  unknown: string[];                          // not in lexicon (display form)
}

const WORD_RE = /[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*/g;

/** A run of text: either a word token (with its lexicon match, if any) or the
 *  separator between words. Order and whitespace are preserved so the reader can
 *  render the original text verbatim with per-word tinting. */
export interface Segment { text: string; word: Word | null; isWord: boolean }

/** Positional annotation of `text` for the reader: every word token in reading
 *  order, matched to a Word where possible, with separators kept between them. */
export function annotate(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (let m = WORD_RE.exec(text); m; m = WORD_RE.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), word: null, isWord: false });
    const tok = m[0];
    out.push({ text: tok, word: tok.length >= 2 ? matchWord(tok) : null, isWord: true });
    last = m.index + tok.length;
  }
  if (last < text.length) out.push({ text: text.slice(last), word: null, isWord: false });
  return out;
}

export function analyze(text: string): Analysis {
  const idx = lexIndex();
  const inLexicon: { token: string; word: Word }[] = [];
  const unknown: string[] = [];
  for (const tok of tokenize(text)) {
    const w = idx.get(tok.toLowerCase());
    if (w) inLexicon.push({ token: tok, word: w });
    else unknown.push(tok);
  }
  return { inLexicon, unknown };
}

// ---- optional LLM enrichment ---------------------------------------------
export interface Enriched {
  term: string; en: string; pos: string; level: CEFR;
  gender: 'der' | 'die' | 'das' | null; plural: string | null;
  ipa: string | null; example_de: string; example_en: string;
}

export type { AiConfig } from './ai.ts';

/** Enrich out-of-lexicon words into Word cards via any OpenAI-compatible API. */
export async function enrich(tokens: string[], cfg: AiConfig): Promise<Word[]> {
  const prompt = `For each German word below, return ONLY a JSON array (no prose, no code fences). Each item: {"input": the word as given, "term": dictionary form (nouns include article der/die/das), "en": short English gloss, "pos": one of noun|verb|adjective|adverb|other, "level": CEFR A1-C2 estimate, "gender": der|die|das or null, "plural": plural form with article or null, "ipa": IPA without slashes or null, "example_de": one short example sentence, "example_en": its English translation}.\n\nWords:\n${tokens.join('\n')}`;

  const content = await chat([{ role: 'user', content: prompt }], cfg, { temperature: 0.2 });
  const parsed = parseLooseJSON(content);
  const arr: any[] = Array.isArray(parsed) ? parsed : (parsed.words ?? parsed.items ?? parsed.result ?? []);

  return arr.map((e): Word => ({
    id: `usr:${(e.term || e.input || '').toLowerCase()}`,
    term: e.term || e.input,
    en: e.en || '',
    pos: e.pos || '',
    level: (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(e.level) ? e.level : 'B1') as CEFR,
    gender: ['der', 'die', 'das'].includes(e.gender) ? e.gender : null,
    plural: e.plural || null,
    ipa: e.ipa || null,
    def: null,
    syn: [], ant: [],
    ex: e.example_de ? [{ de: e.example_de, en: e.example_en || '', lvl: e.level || 'B1' }] : [],
    field: 'Mein Wortschatz',
    kind: 'word',
  })).filter((w) => w.term);
}
