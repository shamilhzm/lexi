// Build-time corpus matcher for the pipeline. A self-contained port of the match
// half of the app's former reader/mining module (removed in the July prune): it
// tokenises a German surface form and decides whether it already "lights up"
// against a given corpus — plus the closed-class and proper-noun heuristics the
// gap discovery needs. Kept here (not in the app) so the pipeline no longer depends
// on the deleted `src/lib/mining.ts`. Takes the corpus explicitly (no global
// WORDS), and imports only still-present app modules (conjugate, types).
import { conjugate, canConjugate, setKnownVerbs } from '../../src/lib/conjugate.ts';
import type { Word } from '../../src/types.ts';

const stripArticle = (term: string) => term.replace(/^(der|die|das)\s+/i, '');

/** Closed-class words (articles, pronouns, prepositions, conjunctions,
 *  contractions) that aren't learnable vocab. */
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

/** Ordinal stems (erste, zweiten, …) — like function words, not learnable vocab. */
const ORDINAL_STEMS = new Set<string>([
  'erst', 'zweit', 'dritt', 'viert', 'fünft', 'sechst', 'siebt', 'siebent', 'acht', 'neunt', 'zehnt',
  'elft', 'zwölft', 'dreizehnt', 'vierzehnt', 'fünfzehnt', 'sechzehnt', 'siebzehnt', 'achtzehnt',
  'neunzehnt', 'zwanzigst', 'dreißigst', 'vierzigst', 'fünfzigst', 'hundertst', 'tausendst',
]);
export const isOrdinal = (tok: string) =>
  ORDINAL_STEMS.has(tok.toLowerCase().replace(/(ens|en|es|em|er|e)$/, ''));

/** True for words the gap scan shouldn't count as missing vocab: function words + ordinals. */
export const isNeutralWord = (tok: string) => isFunctionWord(tok) || isOrdinal(tok);

/** Structurally obvious proper nouns/acronyms: two or more capital letters
 *  (ARD-Hauptstadtstudio, AfD-Abgeordneten, Sachsen-Anhalt). German common nouns
 *  carry a single leading capital, so this rarely misfires on real vocabulary. */
export const isLikelyEntity = (tok: string) => (tok.match(/[A-ZÄÖÜ]/g) ?? []).length >= 2;

const deUmlaut = (s: string) => s.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
// Adjective endings, longest first, so "schärfere" strips "ere" before "e".
const ADJ_SUFFIXES = ['eren', 'erem', 'erer', 'eres', 'sten', 'ere', 'ste', 'en', 'em', 'er', 'es', 'e'];

// High-frequency finite forms the conjugation generator doesn't produce (modal +
// haben/werden Konjunktiv II, sein's Konjunktiv I/II), keyed by infinitive.
const EXTRA_VERB_FORMS: Record<string, string[]> = {
  dürfen: ['dürfte', 'dürftest', 'dürften', 'dürftet'],
  können: ['könnte', 'könntest', 'könnten', 'könntet'],
  müssen: ['müsste', 'müsstest', 'müssten', 'müsstet'],
  mögen: ['möchte', 'möchtest', 'möchten', 'möchtet'],
  werden: ['würde', 'würdest', 'würden', 'würdet'],
  haben: ['hätte', 'hättest', 'hätten', 'hättet'],
  sein: ['wäre', 'wärest', 'wärst', 'wären', 'wäret', 'sei', 'seist', 'seiest', 'seien', 'seiet'],
};

// Closed-class inflections neither the conjugator nor the adjective de-inflector
// produce: declined demonstratives, non-neutral possessive endings, passive "worden".
const EXTRA_CLOSED_FORMS: Record<string, string[]> = {
  dieser: ['diese', 'dieses', 'diesem', 'diesen'],
  mein: ['meiner', 'meinem', 'meines'],
  werden: ['worden'],
};

const WORD_RE = /[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*/g;

/** A run of text: a word token (with its corpus match, if any) or a separator. */
export interface Segment { text: string; word: Word | null; isWord: boolean }

export interface Matcher {
  /** Positional annotation: each word token matched to a corpus Word where possible. */
  annotate(text: string): Segment[];
  isNeutralWord(tok: string): boolean;
  isLikelyEntity(tok: string): boolean;
}

/** Build a matcher over the given corpus. Primes the conjugation engine and an
 *  index of surface forms (terms, article-stripped terms, plurals, and every
 *  conjugated verb form) so inflections resolve to their lemma card. */
export function buildMatcher(corpus: Word[]): Matcher {
  setKnownVerbs(corpus.filter((w) => w.pos === 'verb').map((w) => w.term));

  const index = new Map<string, Word>();
  const adjIndex = new Map<string, Word>(); // adjective lemma -> Word, for de-inflection
  const add = (k: string, w: Word) => { if (k && !index.has(k)) index.set(k, w); };

  // Base forms first, so a lemma always wins over another word's inflection.
  for (const w of corpus) {
    add(w.term.toLowerCase(), w);
    add(stripArticle(w.term).toLowerCase(), w);
    if (w.plural) add(stripArticle(w.plural).toLowerCase(), w);
    if (w.pos === 'adjective') { const k = w.term.toLowerCase(); if (!adjIndex.has(k)) adjIndex.set(k, w); }
  }
  // Closed-class inflections → their lemma card.
  for (const w of corpus) {
    const forms = EXTRA_CLOSED_FORMS[stripArticle(w.term).toLowerCase()];
    if (forms) for (const f of forms) add(f, w);
  }
  // Verb inflections (präsens, präteritum, Partizip II) + extra subjunctive forms → infinitive.
  for (const w of corpus) {
    if (w.pos !== 'verb') continue;
    const inf = stripArticle(w.term);
    const extra = EXTRA_VERB_FORMS[inf.toLowerCase()];
    if (extra) for (const f of extra) add(f, w);
    if (!canConjugate(inf)) continue;
    try {
      const c = conjugate(inf);
      for (const f of [...c.praesens, ...c.praeteritum, c.partizip]) add(f.toLowerCase(), w);
    } catch { /* skip unconjugable */ }
  }

  const matchWord = (tok: string): Word | null => {
    const lc = tok.toLowerCase();
    const direct = index.get(lc);
    if (direct) return direct;
    // Dative plural adds -n (Wählern → Wähler). Accept only a noun match.
    if (lc.length >= 5 && lc.endsWith('n')) {
      const w = index.get(lc.slice(0, -1));
      if (w && w.pos === 'noun') return w;
    }
    // Adjective de-inflection (strip an ending, match an adjective lemma; umlaut fallback).
    if (lc.length >= 4) {
      for (const suf of ADJ_SUFFIXES) {
        if (lc.length - suf.length < 3 || !lc.endsWith(suf)) continue;
        const stem = lc.slice(0, -suf.length);
        const w = adjIndex.get(stem) ?? adjIndex.get(deUmlaut(stem));
        if (w) return w;
      }
    }
    return null;
  };

  const annotate = (text: string): Segment[] => {
    const out: Segment[] = [];
    let last = 0;
    WORD_RE.lastIndex = 0;
    for (let m = WORD_RE.exec(text); m; m = WORD_RE.exec(text)) {
      if (m.index > last) out.push({ text: text.slice(last, m.index), word: null, isWord: false });
      const tok = m[0];
      out.push({ text: tok, word: tok.length >= 2 ? matchWord(tok) : null, isWord: true });
      last = m.index + tok.length;
    }
    if (last < text.length) out.push({ text: text.slice(last), word: null, isWord: false });
    return out;
  };

  return { annotate, isNeutralWord, isLikelyEntity };
}
