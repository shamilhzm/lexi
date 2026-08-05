// The corpus matcher. Tokenises German text and decides whether each word already
// "lights up" against a given corpus — plus the closed-class and proper-noun
// heuristics that keep un-learnable tokens out of a coverage denominator.
//
// It lived in `scripts/corpus/` from the July prune until 2026-08-04, because the
// pipeline needed it and the app's `lib/mining.ts` had just been deleted. That put
// it the wrong way round: this is app logic that the *pipeline* borrows, not build
// tooling the app happens to want. The comprehension meter needs it at runtime, and
// two copies of a matcher would mean the meter and `corpus:coverage` could disagree
// about what "known" means — which is the one number the feature exists to state
// honestly. One implementation, here; `scripts/corpus/lib.ts` imports it.
//
// Deliberately takes the corpus explicitly rather than reaching for the global
// `WORDS`, so the pipeline can point it at a candidate build and the app can point
// it at the shipped one.
import { conjugate, canConjugate, setKnownVerbs } from './conjugate.ts';
import type { Word } from '../types.ts';

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

  // A verb form's own index, consulted when the primary index's only claim on a
  // token is a noun plural. `die Rufe` and `ich rufe` collide, and first-wins gave
  // the noun every time — so "Ich rufe dich an" resolved to *der Ruf*.
  const verbIndex = new Map<string, Word>();
  const addVerb = (k: string, w: Word) => { if (k && !verbIndex.has(k)) verbIndex.set(k, w); };
  /** Keys whose only reason to be in `index` is a noun's plural form. */
  const pluralOnly = new Set<string>();

  // Separable verbs, keyed by the *stem* token with the particle recorded beside it.
  // `conjugate('anrufen')` yields "rufe an" — a two-token string that single-token
  // lookup could never reach, which is why every separable verb missed entirely.
  const sepIndex = new Map<string, { word: Word; particle: string }[]>();
  const addSep = (stem: string, particle: string, w: Word) => {
    if (!stem || !particle) return;
    const list = sepIndex.get(stem) ?? [];
    if (!list.some((e) => e.word.id === w.id)) list.push({ word: w, particle });
    sepIndex.set(stem, list);
  };

  // Base forms first, so a lemma always wins over another word's inflection.
  for (const w of corpus) {
    add(w.term.toLowerCase(), w);
    add(stripArticle(w.term).toLowerCase(), w);
    if (w.plural) {
      const k = stripArticle(w.plural).toLowerCase();
      if (!index.has(k)) pluralOnly.add(k);
      add(k, w);
    }
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
    if (extra) for (const f of extra) { add(f, w); addVerb(f, w); }
    if (!canConjugate(inf)) continue;
    try {
      const c = conjugate(inf);
      for (const f of [...c.praesens, ...c.praeteritum, c.partizip]) {
        const lc = f.toLowerCase();
        // A separable form arrives as "rufe an": index the stem alone, remembering
        // the particle, so `annotate` can confirm the particle really is in the
        // clause before claiming the token for the separable verb.
        const space = lc.indexOf(' ');
        if (space > 0) {
          const stem = lc.slice(0, space);
          // Deliberately NOT added to `verbIndex`: a separable stem must be
          // reachable only through `sepIndex`, which requires the particle. Adding
          // it here let *anrufen* outrank the simplex *rufen* in "Ich rufe laut",
          // where there is no particle and the simplex is the right answer.
          addSep(stem, lc.slice(space + 1), w);
        } else {
          add(lc, w);
          addVerb(lc, w);
        }
      }
      // Imperatives. The conjugator does not emit them and they are extremely
      // common in example sentences ("Gib mir das Buch", "Ruf mich an") — every
      // one of them missed. Derived from the du-form rather than re-deriving the
      // stem: `gibst`→`gib`, `machst`→`mach`, and `liest`→`lies`, which is why
      // both the -st and -t strips are indexed. Over-generating here is cheap
      // (`lie` is not a word, so it can never be wrongly claimed); under-
      // generating is a silent miss. Strong verbs drop the a→ä umlaut in the
      // imperative (`fährst` → *fahr*), so the de-umlauted form goes in too.
      // The zu-infinitive of a separable verb is one word with the `zu` infixed:
      // an + zu + rufen = "anzurufen". It is the ordinary way to write "trying to
      // call someone", and nothing else in the index could ever reach it.
      if (c.separable) {
        const rest = inf.toLowerCase().slice(c.separable.length);
        add(`${c.separable}zu${rest}`, w);
        addVerb(`${c.separable}zu${rest}`, w);
      }
      const du = c.praesens[1];
      if (du && !du.includes(' ')) {
        const cands = [du.replace(/st$/, ''), du.replace(/t$/, '')];
        for (const cand of cands) {
          if (cand.length < 2) continue;
          for (const form of [cand, deUmlaut(cand)]) { add(form.toLowerCase(), w); addVerb(form.toLowerCase(), w); }
        }
      } else if (du) {
        // Separable: "rufst an" → imperative "ruf an", stem indexed with its particle.
        const [stem, particle] = du.split(/\s+/);
        for (const cand of [stem.replace(/st$/, ''), stem.replace(/t$/, '')]) {
          if (cand.length < 2) continue;
          for (const form of [cand, deUmlaut(cand)]) addSep(form.toLowerCase(), particle, w);
        }
      }
    } catch { /* skip unconjugable */ }
  }

  /** Nominative personal pronouns. A finite verb follows one of these in German's
   *  verb-second order, which is what disambiguates a token that is both an
   *  adjective lemma and a verb form. */
  const SUBJECT_PRONOUN = new Set(['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man']);

  /** @param after tokens following this one in the same sentence, lowercased —
   *  used only to confirm a separable verb's particle actually landed.
   *  @param prev the immediately preceding token, lowercased.
   *  @param pos 0-based position of this token within its own sentence. */
  const matchWord = (tok: string, after: string[] = [], prev = '', pos = -1): Word | null => {
    const lc = tok.toLowerCase();

    // 1. A separable verb, but only when the particle is genuinely present later in
    //    the clause. German puts it at the end ("Ich *rufe* dich später *an*"), so
    //    requiring it *after* the verb both matches the grammar and stops a
    //    preposition earlier in the sentence from being read as a particle. Both
    //    halves observed is stronger evidence than any single-token lookup, so this
    //    runs first.
    const sep = sepIndex.get(lc);
    if (sep) {
      const hit = sep.find((e) => after.includes(e.particle));
      if (hit) return hit.word;
    }

    const direct = index.get(lc);
    // 2. A token that is both a lemma of some other class and a finite verb form —
    //    *weiß* is the colour and it is `wissen`'s 1st/3rd singular.
    //
    //    German is verb-**second**, and that word "second" is load-bearing. A first
    //    version of this rule asked only whether the previous token was a subject
    //    pronoun, and it broke *"Hier ist es sicher"*: the pronoun is third, the
    //    adjective fourth, and `sicher` was handed to the verb `sichern`. Requiring
    //    the token to sit in second position with the pronoun first is the actual
    //    rule — "Ich weiß es nicht" qualifies, "Hier ist es sicher" does not.
    //
    //    Only fires when a verb reading already exists, so it cannot invent one.
    if (direct && direct.pos !== 'verb' && pos === 1 && SUBJECT_PRONOUN.has(prev)) {
      const verb = verbIndex.get(lc);
      if (verb) return verb;
    }
    // 3. `die Rufe` (noun plural) and `ich rufe` (verb) collide. German capitalises
    //    nouns, so a *lowercase* token whose only claim in the primary index is a
    //    noun's plural is far likelier to be the verb. Sentence-initial words are
    //    capitalised regardless of class, which is why the test is on the token
    //    being lowercase rather than on it being capitalised.
    if (direct && pluralOnly.has(lc) && tok[0] === tok[0].toLowerCase()) {
      const verb = verbIndex.get(lc);
      if (verb) return verb;
    }
    if (direct) return direct;
    // 3. A verb form that lost the first-wins race to an unrelated lemma.
    const verb = verbIndex.get(lc);
    if (verb) return verb;
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
    // Two passes, because a separable verb cannot be resolved from its own token:
    // "rufe" is only *anrufen* if an "an" follows it. Tokenise first, then match
    // each token knowing what comes after it in the same sentence.
    const toks: { text: string; start: number }[] = [];
    WORD_RE.lastIndex = 0;
    for (let m = WORD_RE.exec(text); m; m = WORD_RE.exec(text)) toks.push({ text: m[0], start: m.index });
    // Sentence boundaries bound the particle search: a particle in the next
    // sentence has nothing to do with this verb.
    const sentenceEnd = (i: number) => {
      for (let j = i + 1; j < toks.length; j++) {
        const between = text.slice(toks[j - 1].start + toks[j - 1].text.length, toks[j].start);
        if (/[.!?;]/.test(between)) return j;
      }
      return toks.length;
    };

    const out: Segment[] = [];
    let last = 0;
    let posInSentence = 0;
    for (let i = 0; i < toks.length; i++) {
      const { text: tok, start } = toks[i];
      if (start > last) out.push({ text: text.slice(last, start), word: null, isWord: false });
      const after = toks.slice(i + 1, sentenceEnd(i)).map((t) => t.text.toLowerCase());
      const prev = i > 0 ? toks[i - 1].text.toLowerCase() : '';
      out.push({ text: tok, word: tok.length >= 2 ? matchWord(tok, after, prev, posInSentence) : null, isWord: true });
      last = start + tok.length;
      // Reset at a sentence boundary so "second position" means second in *this*
      // clause, not the paragraph.
      const gap = i + 1 < toks.length ? text.slice(last, toks[i + 1].start) : '';
      posInSentence = /[.!?;]/.test(gap) ? 0 : posInSentence + 1;
    }
    if (last < text.length) out.push({ text: text.slice(last), word: null, isWord: false });
    return out;
  };

  return { annotate, isNeutralWord, isLikelyEntity };
}
