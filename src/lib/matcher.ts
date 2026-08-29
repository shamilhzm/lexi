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
import { conjugate, canConjugate, recognitionPraesens, setKnownVerbs } from './conjugate.ts';
import type { Word } from '../types.ts';

const stripArticle = (term: string) => term.replace(/^(der|die|das)\s+/i, '');

/** A term carrying government notation — `warten auf + A`, `sich verlieben in + A`,
 *  `gehören zu + D` — is a **pattern**, not a lemma, and the distinction is the
 *  whole content of the card: a learner who has met `warten` has not met
 *  `warten auf`. The corpus writes the preposition and its case into the headword
 *  for exactly that reason.
 *
 *  Everything downstream nonetheless read the term as a lemma. `conjugate` was
 *  handed the string *"verzichten auf + A"*, produced nothing, and **0 of 44 such
 *  cards resolved in their own example** against a 95.6% control — they did not
 *  highlight on their own card and were invisible to the reader.
 *
 *  Returns the lemma to conjugate and the preposition that must be present for the
 *  pattern to count. `null` for an ordinary term. Multiword lemmas
 *  (`Rücksicht nehmen auf + A`, `Heimweh haben nach + D`) are deliberately not
 *  claimed: which of the two words carries the inflection is not decidable from the
 *  string, and a wrong match is worse than a miss. */
export function government(term: string): { lemma: string; prep: string } | null {
  const m = /^(.*?)\s+(\S+)\s*\+\s*[ADGN]$/i.exec(stripArticle(term).trim());
  if (!m) return null;
  const lemma = m[1].replace(/^sich\s+/i, '').trim();
  if (!lemma || lemma.includes(' ')) return null;
  return { lemma, prep: m[2].toLowerCase() };
}

/** Preposition + article, written as one word. German does this constantly and a
 *  governed preposition is hit by it hard: *«Das hängt **vom** Anlass ab»* carries
 *  `von`, but no token in that sentence spells it. Looking for the bare preposition
 *  alone missed every contracted object. */
const CONTRACTED: Record<string, string> = {
  am: 'an', ans: 'an', aufs: 'auf', beim: 'bei', durchs: 'durch', fürs: 'für',
  im: 'in', ins: 'in', überm: 'über', übers: 'über', ums: 'um', unterm: 'unter',
  unters: 'unter', vom: 'von', vorm: 'vor', vors: 'vor', zum: 'zu', zur: 'zu',
};
/** Does this clause contain `prep`, spelled plainly or contracted with an article? */
const hasPrep = (toks: string[], prep: string) =>
  toks.some((t) => t === prep || CONTRACTED[t] === prep);

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

  // ---- added 2026-08-11, measured against the telc B1 paper ----------------
  // These were 3.9% of the paper's content tokens and none of them is learnable
  // vocabulary; every one was being counted against the learner as an unknown
  // word. That is 3.9 points of a coverage figure whose entire claim is honesty,
  // and it is the largest single defect in the meter's denominator.
  //
  // Indefinite pronouns and quantifiers. Closed-class by definition: you cannot
  // add a new one to German the way you can add a noun.
  'etwas', 'alles', 'nichts', 'allem', 'aller', 'alle', 'allen',
  'jeder', 'jede', 'jedes', 'jeden', 'jedem', 'jemand', 'niemand',
  'andere', 'anderen', 'anderes', 'anderer', 'anderem', 'anders',
  'einige', 'einigen', 'einiges', 'manche', 'manchen', 'manches', 'solche', 'solchen', 'solches',
  'beide', 'beiden', 'beides', 'mehr', 'meisten', 'viele', 'vielen', 'vieles', 'wenige', 'wenigen',
  'man', 'selbst', 'welche', 'welcher', 'welches', 'welchen', 'welchem',
  'dieser', 'diese', 'dieses', 'diesen', 'diesem', 'jener', 'jene', 'jenes',
  // Possessive determiners beyond the bare stems already listed. `ihre` was here
  // and `ihren`/`ihrem`/`ihrer` were not, so the same word counted as known in
  // one case and unknown in three.
  'meinen', 'meinem', 'meiner', 'meines', 'deinen', 'deinem', 'deiner', 'deines',
  'seinen', 'seinem', 'seiner', 'seines', 'ihren', 'ihrem', 'ihrer', 'ihres',
  'unseren', 'unserem', 'unserer', 'unseres', 'unsere', 'euren', 'eurem', 'eurer', 'eures', 'eure',
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

// Cardinal numbers, spelled out. German writes them as one word, so `fünfzehn`,
// `achtzig` and `zweihundertfünfzig` are single tokens that no corpus can list —
// the set is infinite. They are excluded for the same reason ordinals already
// were: knowing "eighty" is arithmetic, not vocabulary, and counting it as an
// unknown word makes a coverage figure worse than the learner's actual position.
const NUM_PARTS = [
  'null', 'eins', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun',
  'zehn', 'elf', 'zwölf', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig',
  'achtzig', 'neunzig', 'hundert', 'tausend', 'million', 'millionen', 'milliarde', 'milliarden',
  'und', 'zig',
];
// Longest-first so `sechzig` is consumed before `sechs`.
const NUM_RE = new RegExp(`^(?:${[...NUM_PARTS].sort((a, b) => b.length - a.length).join('|')})+$`);
/** A spelled-out cardinal ("fünfzehn", "einundzwanzig", "zweihundert"). */
export const isCardinal = (tok: string) => {
  const lc = tok.toLowerCase();
  // `und` and `ein` are in the parts list and are words in their own right, so a
  // bare part is only a number when it is unambiguously one.
  if (lc.length < 3 || lc === 'und' || lc === 'ein') return false;
  return NUM_RE.test(lc);
};

/** True for words the gap scan shouldn't count as missing vocab: function words,
 *  ordinals and spelled-out cardinals. */
export const isNeutralWord = (tok: string) => isFunctionWord(tok) || isOrdinal(tok) || isCardinal(tok);

/** Structurally obvious proper nouns/acronyms: two or more capital letters
 *  (ARD-Hauptstadtstudio, AfD-Abgeordneten, Sachsen-Anhalt). German common nouns
 *  carry a single leading capital, so this rarely misfires on real vocabulary. */
export const isLikelyEntity = (tok: string) => (tok.match(/[A-ZÄÖÜ]/g) ?? []).length >= 2;

const deUmlaut = (s: string) => s.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
/** Nouns whose lowercase `-s` form is an adverb of time: *montags*, *abends*,
 *  *nachmittags*. The only place the adverbial genitive is still productive. */
const TIME_NOUNS = new Set([
  'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonnabend', 'sonntag',
  'morgen', 'vormittag', 'mittag', 'nachmittag', 'abend', 'nacht', 'wochenende', 'werktag', 'feiertag',
]);

/** Umlaut the last plain back vowel — the change German makes when deriving
 *  `Ärztin` from `Arzt` or `Köchin` from `Koch`.
 *
 *  Case matters here and used to be missed: this matched `[aou]` only, so a noun
 *  whose only back vowel is its capitalised initial was returned unchanged —
 *  *Angst* stayed *Angst* and produced the plural *Angste*, and *Arzt* never
 *  reached *Ärztin*. German capitalises every noun, so that is not an edge case. */
const UMLAUT: Record<string, string> = { a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' };
const umlautStem = (s: string) => s.replace(/([aouAOU])(?!.*[aouAOU])/, (m) => UMLAUT[m] ?? m);
// Adjective endings, longest first, so "schärfere" strips "ere" before "e".
const ADJ_SUFFIXES = ['eren', 'erem', 'erer', 'eres', 'sten', 'ere', 'ste', 'en', 'em', 'er', 'es', 'e'];

/** The plural **surface form** a card describes, or `null` when it describes none.
 *
 *  The corpus writes plurals six ways and this used to index only one of them. The
 *  rest were added to the index *verbatim*: a card reading `¨-e` contributed the
 *  literal key `"¨-e"`, and `Vorschläge` — the form a reader actually meets — was
 *  never indexed at all. Measured over the six exam papers, `Vorschläge`, `Höfe`,
 *  `Läden`, `Einwände` and `Patienten` all failed to resolve against cards the
 *  corpus already teaches, which is the worst direction for a coverage meter to be
 *  wrong in: it under-reports words the learner has studied.
 *
 *    die Namen   full form, already worked
 *    -en / -e    append:            Patient  + en  -> Patienten
 *    -wände      splice on overlap: Einwand  + wände -> Einwände
 *    ¨-e / ¨-    umlaut, then append: Vorschlag -> Vorschläge, Laden -> Läden
 *    -           unchanged:         Pullover -> Pullover
 *    nur Singular / nur Plural / —  no plural form to index
 *
 *  Exported for the tests, which assert each notation against a real card. */
export function pluralForm(term: string, plural: string | null | undefined): string | null {
  const singular = stripArticle(term).trim();
  const p = (plural ?? '').trim();
  if (!p || /^nur\s/i.test(p) || p === '—') return null;
  if (!p.startsWith('-') && !p.startsWith('¨')) return stripArticle(p).trim() || null;
  if (p === '-') return singular;

  const umlaut = p.startsWith('¨');
  const suffix = p.replace(/^¨/, '').replace(/^-/, '');
  const base = umlaut ? umlautStem(singular) : singular;
  if (!suffix) return umlaut ? base : singular;
  // `-wände` on *Einwand* names the whole tail, not an ending to append. Splice at
  // the longest overlap the singular actually ends with, comparing without umlauts
  // so `wänd` still matches `wand`.
  for (let k = suffix.length; k > 0; k--) {
    const head = deUmlaut(suffix.slice(0, k).toLowerCase());
    if (base.length > k && deUmlaut(base.toLowerCase()).endsWith(head)) {
      return base.slice(0, base.length - k) + suffix;
    }
  }
  return base + suffix;
}

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

/** Suppletive comparison — the handful of adjectives whose comparative and
 *  superlative are different words. `besser` and `besten` cannot be reached from
 *  `gut` by stripping an ending, so no amount of de-inflection finds them; they
 *  are irregular in the way *good/better/best* is, and there are only six. */
const SUPPLETIVE: Record<string, string[]> = {
  gut: ['besser', 'bessere', 'besseren', 'besserer', 'besseres', 'besserem',
    'best', 'beste', 'besten', 'bester', 'bestes', 'bestem'],
  viel: ['mehr', 'meist', 'meiste', 'meisten', 'meister', 'meistes', 'meistem'],
  gern: ['lieber', 'liebsten', 'am liebsten'],
  hoch: ['höher', 'höhere', 'höheren', 'höherer', 'höheres', 'höherem',
    'höchst', 'höchste', 'höchsten', 'höchster', 'höchstes', 'höchstem'],
  nah: ['näher', 'nähere', 'näheren', 'näherer', 'näheres', 'näherem',
    'nächst', 'nächste', 'nächsten', 'nächster', 'nächstes', 'nächstem'],
  groß: ['größer', 'größere', 'größeren', 'größerer', 'größeres', 'größerem',
    'größt', 'größte', 'größten', 'größter', 'größtes', 'größtem'],
};

// Closed-class inflections neither the conjugator nor the adjective de-inflector
// produce: declined demonstratives, non-neutral possessive endings, passive "worden".
const EXTRA_CLOSED_FORMS: Record<string, string[]> = {
  dieser: ['diese', 'dieses', 'diesem', 'diesen'],
  mein: ['meiner', 'meinem', 'meines'],
  werden: ['worden'],
};

// Loanwords keep their diacritics in German — Café, Büro's fine but Café, Résumé,
// Portemonnaie — and a class limited to the umlauts split *Café* into `Caf` and a
// stray `é`, which then failed to resolve and was reported as a missing word.
// `\p{L}` is the actual rule: a letter is a letter.
const WORD_RE = /\p{L}[\p{L}-]*/gu;

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
  // A governed verb's root is its lemma, not its term. Priming the conjugator with
  // "verzichten auf + A" taught it a root that appears in no German sentence.
  setKnownVerbs(corpus.filter((w) => w.pos === 'verb')
    .map((w) => government(w.term)?.lemma ?? w.term));

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

  // A noun form's own index, and the exact mirror of `verbIndex` above.
  //
  // `pluralOnly` only helps where the **noun** won the first-wins race for the
  // index key; where the verb won it there was no way back to the noun at all, and
  // `corpus:matcher-gaps` measured that as **200 of 214** unresolved forms — every
  // one a capitalised noun losing to a lowercase verb infinitive. `Angeboten` went
  // to `anbieten`, `Zahlen` to `zahlen`, `Lügen` to `lügen`, and `die Frage` has
  // shipped since A1 unable to be lit up by its own plural.
  const nounFormIndex = new Map<string, Word>();
  const addNounForm = (k: string, w: Word) => { if (k && !nounFormIndex.has(k)) nounFormIndex.set(k, w); };
  /** The dative plural adds -n unless the plural already ends in -n or -s. */
  const dativePlural = (pl: string) => (/[ns]$/i.test(pl) ? pl : `${pl}n`);

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

  // Governed verbs (`warten auf + A`), keyed by an inflected form of the lemma with
  // the required preposition recorded beside it — the same shape as `sepIndex`, and
  // for the same reason: the evidence for the card is two tokens, not one.
  //
  // Deliberately kept out of `index` and `verbIndex`. `warten` and `denken` are
  // already A1 cards in their own right, and letting a bare *«Ich warte»* resolve to
  // `warten auf + A` would credit a learner with a pattern they have not met and
  // inflate the comprehension meter — the one number the app exists to state honestly.
  //
  // A *reflexive* governed pattern carries two more things, because the
  // preposition alone is not enough evidence for one. `sich erinnern an + A` was
  // claiming «Das Lied erinnert mich an meine Kindheit» — a transitive sentence
  // with no reflexive in it — because *erinnert* is a form of the lemma and *an*
  // is in the clause. That credits a learner with a reflexive pattern card on a
  // sentence that does not contain it, which is the same inflation the comment
  // above exists to prevent, and it also made the plain `erinnern` card
  // unillustratable: every example written for it resolved to the reflexive.
  //
  // The decidable test is **person agreement**, not "is there a pronoun": *mich*
  // is reflexive after *ich erinnere* and an ordinary object after *das Lied
  // erinnert*. So each indexed form remembers which persons it can be, and a
  // reflexive pattern requires the matching pronoun.
  const patIndex = new Map<string, { word: Word; prep: string; refl: boolean; persons: Set<number> | null; participle: boolean }[]>();
  const addPat = (form: string, prep: string, w: Word, refl: boolean, persons: Set<number> | null, participle = false) => {
    if (!form || !prep) return;
    const list = patIndex.get(form) ?? [];
    if (list.some((e) => e.word.id === w.id)) return;
    list.push({ word: w, prep, refl, persons: persons ? new Set(persons) : null, participle });
    patIndex.set(form, list);
  };

  /** Finite forms of haben and sein — the tell that a participle reading is live. */
  const AUX = new Set(['habe', 'hast', 'hat', 'haben', 'habt', 'hatte', 'hattest', 'hatten', 'hattet',
    'bin', 'bist', 'ist', 'sind', 'seid', 'war', 'warst', 'waren', 'wart', 'wird', 'werde', 'werden', 'wirst', 'werdet']);

  /** The reflexive pronoun each person takes. Index matches `conjugate()`'s. */
  const REFL_PRONOUN: string[][] = [
    ['mich', 'mir'], ['dich', 'dir'], ['sich'], ['uns'], ['euch'], ['sich'],
  ];
  const ALL_REFL = new Set(REFL_PRONOUN.flat());

  // Base forms first, so a lemma always wins over another word's inflection.
  for (const w of corpus) {
    add(w.term.toLowerCase(), w);
    add(stripArticle(w.term).toLowerCase(), w);
    const pl = pluralForm(w.term, w.plural);
    if (pl) {
      const k = pl.toLowerCase();
      if (!index.has(k)) pluralOnly.add(k);
      add(k, w);
      if (w.pos === 'noun') {
        addNounForm(k, w);
        addNounForm(dativePlural(pl).toLowerCase(), w);
      }
    }
    if (w.pos === 'adjective') { const k = w.term.toLowerCase(); if (!adjIndex.has(k)) adjIndex.set(k, w); }
  }
  // Closed-class inflections → their lemma card.
  for (const w of corpus) {
    const forms = EXTRA_CLOSED_FORMS[stripArticle(w.term).toLowerCase()];
    if (forms) for (const f of forms) add(f, w);
    const sup = SUPPLETIVE[stripArticle(w.term).toLowerCase()];
    if (sup) for (const f of sup) add(f, w);
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
          // A separable verb is written as ONE word whenever the clause pushes the
          // finite verb to the end — every Nebensatz, every relative clause:
          // *"…, wer mitkommt"*, *"…, wenn der Zug ankommt"*. `sepIndex` only ever
          // held the split form, so those forms — which are most of the subordinate
          // clauses in any real text — resolved to nothing at all.
          const joined = lc.slice(space + 1) + lc.slice(0, space);
          add(joined, w);
          addVerb(joined, w);
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
      // The Partizip II, declined as an attributive adjective. German does this
      // constantly and Lexi could not read any of it: *sehr geehrte Damen*, *die
      // gestrichene Strecke*, *ein eingeteilter Kurs*. `geehrt` was indexed and
      // `geehrte` was not, which made the commonest salutation in the language an
      // unknown word in all five papers. The bare participle is already indexed
      // above; these are the five endings it takes in front of a noun.
      // …unless the participle is itself an adjective card. *geeignet*, *bekannt*
      // and *gelernt* are lemmas in their own right, and pre-indexing `geeignete`
      // here would beat the adjective de-inflection path — which resolves at
      // lookup and so always loses to a literal index hit — and gloss the word as
      // a verb the learner did not meet. Caught by the reader probe: adjectives
      // went 0.955 to 0.945 the first time this shipped without the guard.
      if (!c.partizip.includes(' ') && !adjIndex.has(c.partizip.toLowerCase())) {
        for (const end of ['e', 'en', 'em', 'er', 'es']) {
          add((c.partizip + end).toLowerCase(), w);
        }
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

  // Governed terms: conjugate the lemma, key every form by the preposition it needs.
  for (const w of corpus) {
    const g = government(w.term);
    if (!g) continue;
    const forms = new Set<string>([g.lemma.toLowerCase()]);
    /** form → the persons it can be, or null once a form is reachable by a
     *  person the conjugator does not label (the Partizip II, the imperative). */
    const formPersons = new Map<string, Set<number> | null>();
    const participles = new Set<string>();
    const addForm = (f: string, person: number | null) => {
      if (!f) return;
      forms.add(f);
      // The Partizip II is not a person, and for every weak verb it is spelled
      // exactly like the 3rd singular — *erinnert*, *gefragt*, *bedankt*. Merging
      // it into the person set as "unknown" threw away the agreement information
      // for precisely the commonest form, so it is tracked on its own.
      if (person == null) { participles.add(f); return; }
      const cur = formPersons.get(f);
      if (cur) cur.add(person);
      else formPersons.set(f, new Set([person]));
    };
    // `arbeiten als + N` and `gelten als + N` are tagged `phrase`, not `verb`, and
    // gating on pos alone left them with an uninflected lemma — so the card missed
    // its own «Sie *arbeitet* als Krankenschwester». The lemma either conjugates or
    // it does not; that is the better question to ask. Adjectives (`abhängig von`)
    // and the genitive prepositions keep the bare form, as they should.
    if ((w.pos === 'verb' || w.pos === 'phrase') && canConjugate(g.lemma)) {
      try {
        const c = conjugate(g.lemma);
        const withPerson: [string, number | null][] = [
          ...c.praesens.map((f, i) => [f, i] as [string, number]),
          ...c.praeteritum.map((f, i) => [f, i] as [string, number]),
          [c.partizip, null] as [string, null],
        ];
        for (const [f, person] of withPerson) {
          const lcf = f.toLowerCase();
          const space = lcf.indexOf(' ');
          if (space < 0) { addForm(lcf, person); continue; }
          // Governed *and* separable — `abhängen von + D`, `sich einsetzen für + A`.
          // The conjugator hands back "hängt ab"; the text has the stem here and the
          // particle at the clause end. Key the stem, as `sepIndex` does, and the
          // joined form a Nebensatz produces ("…, weil das vom Wetter abhängt").
          addForm(lcf.slice(0, space), person);
          addForm(lcf.slice(space + 1) + lcf.slice(0, space), person);
        }
        const du = c.praesens[1];
        if (du && !du.includes(' ')) addForm(du.replace(/st$/, '').toLowerCase(), 1);
      } catch { /* fall back to the lemma alone */ }
    }
    const refl = /^sich\s/i.test(w.term);
    for (const f of forms) {
      addPat(f, g.prep, w, refl, formPersons.get(f) ?? null, participles.has(f));
    }
  }

  // Present tense of the verbs the conjugator refuses to drill.
  //
  // `canConjugate` is a gate on *teaching*, and the loop above used it as a gate
  // on *reading* too, which is a category error: a strong verb outside the
  // irregular table produced no indexed forms at all, so `hängt`, `klingt`,
  // `gilt` and `schafft` were unresolvable while `hängen`, `klingen`, `gelten`
  // and `schaffen` sat in the lexicon. The present tense is where a verb spends
  // most of its life in running text, and it was the part that was missing.
  //
  // Also **after** the reliable pass, and for the same reason as the feminines:
  // `add` is first-wins, so anything a properly conjugated verb already claimed
  // stays claimed. See `recognitionPraesens` for why the past tense is not here.
  for (const w of corpus) {
    if (w.pos !== 'verb') continue;
    const inf = stripArticle(w.term);
    if (canConjugate(inf)) continue;
    for (const f of recognitionPraesens(inf)) {
      const lc = f.toLowerCase();
      const space = lc.indexOf(' ');
      if (space > 0) {
        const [stem, particle] = lc.split(/\s+/);
        addSep(stem, particle, w);
        add(lc.slice(space + 1) + lc.slice(0, space), w);     // "…, wenn er mitkommt"
        addVerb(lc.slice(space + 1) + lc.slice(0, space), w);
      } else {
        add(lc, w);
        addVerb(lc, w);
      }
    }
  }

  // Feminine derivation — and deliberately the **last** pass over the corpus.
  //
  // Exam texts use paired and Binnen-I forms constantly ("acht Schülerinnen und
  // fünf Schüler"), and Sprecherin, Muttersprachlerin, Besucherin, Teilnehmerin
  // and Kundin are all absent as cards, so every one counted against the learner.
  // A derivation rather than several hundred new cards, because that is what it
  // is: -in is productive, and someone who knows *der Lehrer* is not missing a
  // separate item when they meet *die Lehrerin*.
  //
  // **Last, because `add` is first-wins and 111 of these forms are real cards.**
  // Run inside the base-form loop it stole `die Freundin`, `die Ärztin` and
  // `die Kollegin` from themselves whenever the masculine happened to come first
  // in corpus order — and, worse, took `Freundinnen` off `die Freundin`'s plural,
  // which is how it showed up: `corpus:validate`'s reader probe went 168/200 to
  // 165/200 on plurals. Deriving after every real form is indexed means a real
  // card always wins and only the genuinely missing feminines are invented.
  for (const w of corpus) {
    if (w.pos !== 'noun' || w.gender !== 'der') continue;
    const base = stripArticle(w.term).toLowerCase();
    // `der Kunde` → `die Kundin`, so the schwa is dropped as well as kept, and
    // the umlauted stem goes in too: Arzt → Ärztin, Koch → Köchin.
    const stems = new Set([base, base.replace(/e$/, '')]);
    for (const s of [...stems]) stems.add(umlautStem(s));
    for (const s of stems) {
      if (s.length < 3) continue;
      add(`${s}in`, w);
      add(`${s}innen`, w);
    }
  }

  /** Nominative personal pronouns. A finite verb follows one of these in German's
   *  verb-second order, which is what disambiguates a token that is both an
   *  adjective lemma and a verb form. */
  const SUBJECT_PRONOUN = new Set(['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man']);

  /** @param after tokens following this one in the same sentence, lowercased —
   *  used only to confirm a separable verb's particle actually landed.
   *  @param prev the immediately preceding token, lowercased.
   *  @param pos 0-based position of this token within its own sentence. */
  const matchWord = (tok: string, after: string[] = [], prev = '', pos = -1, before: string[] = []): Word | null => {
    const lc = tok.toLowerCase();

    // 1. A governed verb, when the preposition the card teaches is really in the
    //    clause. *«Sie wartet auf ihr Visum»* is the pattern; *«Sie wartet»* is the
    //    plain A1 `warten` and falls through to it below.
    //
    //    **Ranked above the separable check, which is not obvious and was measured.**
    //    `abhängen von + D` and plain `abhängen` both claim *hängt* in
    //    *«Das hängt vom Anlass ab»*; with `sepIndex` first the plain card won every
    //    time on the particle alone, and the pattern card — the more specific of the
    //    two, and the one carrying the teaching — could never be reached. A hit here
    //    requires the preposition, so it is strictly the stronger evidence.
    const pat = patIndex.get(lc);
    if (pat) {
      const clause = before.concat(after);
      const hit = pat.find((e) => {
        if (!hasPrep(clause, e.prep)) return false;
        if (!e.refl) return true;
        // A reflexive pattern needs its pronoun, agreeing with the person of the
        // form that was matched. Where the person is unknown (Partizip II,
        // imperative) any reflexive pronoun will do — a participle in a clause
        // with the right preposition and *some* reflexive is evidence enough.
        const lower = clause.map((t) => t.toLowerCase());
        // As a participle the form carries no person, so any reflexive pronoun is
        // evidence — but only where an auxiliary makes that reading available.
        // Without the auxiliary guard, «Das Lied erinnert mich …» matched on the
        // participle branch and the transitive verb lost its own sentence.
        if (e.participle && lower.some((t) => AUX.has(t))) {
          return lower.some((t) => ALL_REFL.has(t));
        }
        const persons = e.persons ? [...e.persons] : [0, 1, 2, 3, 4, 5];
        const want = new Set(persons.flatMap((n) => REFL_PRONOUN[n] ?? []));
        return lower.some((t) => want.has(t));
      });
      if (hit) return hit.word;
    }

    // 2. A separable verb, but only when the particle is genuinely present later in
    //    the clause. German puts it at the end ("Ich *rufe* dich später *an*"), so
    //    requiring it *after* the verb both matches the grammar and stops a
    //    preposition earlier in the sentence from being read as a particle.
    const sep = sepIndex.get(lc);
    if (sep) {
      const hit = sep.find((e) => after.includes(e.particle));
      if (hit) return hit.word;
    }

    const direct = index.get(lc);
    // 3. A token that is both a lemma of some other class and a finite verb form —
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
    // 4. `die Rufe` (noun plural) and `ich rufe` (verb) collide. German capitalises
    //    nouns, so a *lowercase* token whose only claim in the primary index is a
    //    noun's plural is far likelier to be the verb. Sentence-initial words are
    //    capitalised regardless of class, which is why the test is on the token
    //    being lowercase rather than on it being capitalised.
    if (direct && pluralOnly.has(lc) && tok[0] === tok[0].toLowerCase()) {
      const verb = verbIndex.get(lc);
      if (verb) return verb;
    }
    // 4b. The same collision from the other side. Rule 4 can only reach the case
    //     where the noun holds the index key; when the *verb* holds it — `lügen`
    //     is a lemma, `Lügen` is only a plural — there was no path back, and that
    //     is where 200 of the 214 forms in `corpus:matcher-gaps` were going.
    //
    //     German capitalises its nouns, so a capitalised token spelling a noun form
    //     is that noun. The exception rule 4's comment names is real and is excluded
    //     here rather than worked around: a **sentence-initial** word is capitalised
    //     whatever its class, so «Fragen Sie mich!» must stay the verb. `pos > 0`
    //     says "not sentence-initial"; `!after.length` lets a citation form through,
    //     because a German noun quoted alone *is* written with its capital and a
    //     verb quoted alone is not.
    if (direct && direct.pos !== 'noun' && tok[0] !== tok[0].toLowerCase()
        && (pos > 0 || after.length === 0)) {
      const noun = nounFormIndex.get(lc);
      if (noun) return noun;
    }
    if (direct) return direct;
    // 5. A verb form that lost the first-wins race to an unrelated lemma.
    const verb = verbIndex.get(lc);
    if (verb) return verb;
    // Dative plural adds -n (Wählern → Wähler). Accept only a noun match.
    if (lc.length >= 5 && lc.endsWith('n')) {
      const w = index.get(lc.slice(0, -1));
      if (w && w.pos === 'noun') return w;
    }
    // Adjective de-inflection (strip an ending, match an adjective lemma; umlaut fallback).
    //
    // The `stem + 'e'` fallback exists because a handful of adjective cards are
    // stored in their *weak* form rather than their stem — `letzte`, not `letzt`.
    // That is the right thing to print on a card (nobody writes "letzt"), and it
    // meant `letzten`, `letztes` and `letzter` all resolved to nothing while
    // `letzte` resolved fine. Only consulted after the bare stem misses, so it
    // cannot take a word away from an adjective stored the ordinary way.
    if (lc.length >= 4) {
      for (const suf of ADJ_SUFFIXES) {
        if (lc.length - suf.length < 3 || !lc.endsWith(suf)) continue;
        const stem = lc.slice(0, -suf.length);
        const w = adjIndex.get(stem) ?? adjIndex.get(deUmlaut(stem)) ?? adjIndex.get(`${stem}e`);
        if (w) return w;
      }
    }
    // Genitive singular, and the adverbial -s that looks exactly like it.
    //
    // `des Kurses`, `des Vaters`, `des Hauses`, `des Romans` — and `montags`,
    // `samstags`, `abends`, `nachmittags`, which are the same suffix doing a
    // different job and are extremely common in listening texts. Both fall out of
    // one rule. Restricted to a noun result for the same reason the dative-plural
    // rule above is: `liest` and `heißt` must not be stripped into nouns.
    //
    // **Deliberately after the adjective block, and gated on capitalisation.**
    // Adjective endings and the genitive are spelled identically: `festes` is the
    // adjective `fest` in "ein festes Programm", and an ungated rule handed it to
    // the noun `das Fest`. Ordering alone did not fix that, because the corpus has
    // no `fest` adjective card for the earlier rule to find — so the wrong answer
    // survived, which is the failure mode this file already warns about for verb
    // homographs: a miss is visible, a wrong lemma is not.
    //
    // German capitalises nouns, so `Kurses`/`Vaters`/`Hauses` are capitalised and
    // an inflected adjective is not. That is the actual distinguishing signal, and
    // rule 3 above already leans on it. Sentence-initial words are capitalised
    // regardless, which costs an occasional miss and never causes a wrong claim.
    const capitalised = tok[0] === tok[0].toUpperCase() && tok[0] !== tok[0].toLowerCase();
    if (capitalised && lc.length >= 5 && lc.endsWith('s')) {
      const w = index.get(lc.slice(0, -1)) ?? (lc.endsWith('es') ? index.get(lc.slice(0, -2)) : undefined);
      if (w && w.pos === 'noun') return w;
    }
    // The adverbial -s is the same suffix doing a different job — `montags`,
    // `samstags`, `abends`, `nachmittags` — and it is lowercase, so it needs its
    // own door. Scoped to time nouns because that is the only place the pattern is
    // productive; a general lowercase -s rule is what let `festes` through.
    if (!capitalised && lc.length >= 5 && lc.endsWith('s')) {
      const w = index.get(lc.slice(0, -1));
      if (w && w.pos === 'noun' && TIME_NOUNS.has(stripArticle(w.term).toLowerCase())) return w;
    }
    // Dative -e, the form that survives in fixed phrases: "zu Hause", "im Jahre".
    if (capitalised && lc.length >= 5 && lc.endsWith('e')) {
      const w = index.get(lc.slice(0, -1));
      if (w && w.pos === 'noun') return w;
    }

    // Compounds, last of all.
    //
    // German builds nouns by concatenation and the set is genuinely infinite —
    // *Deutschkurs*, *Gruppenticket*, *Besprechungsraum*, *Fahrradanhänger*. No
    // corpus can list them, and listing them would be the wrong answer anyway: a
    // learner who knows *Deutsch* and *Kurs* can read *Deutschkurs*, and teaching
    // it as a separate item spends a review on something they already have.
    //
    // So a compound resolves to its **head** — the last element, which carries the
    // gender and the core meaning — but only when every element is itself known.
    // That constraint is what keeps this honest: an unknown stem plus a known head
    // stays unresolved, because *Bohrmaschine* is not readable from *Maschine*.
    //
    // Runs last so it can never outrank a real lemma, and is capped at two splits
    // because three-element compounds that are not already covered are rare enough
    // to be worth leaving visible.
    const compound = splitCompound(lc, 0);
    if (compound) return compound;
    return null;
  };

  /** Linking elements German inserts between compound elements. */
  const FUGEN = ['s', 'es', 'n', 'en', 'er', 'e', ''];
  const MIN_ELEMENT = 4;

  /** Resolve `lc` as a compound whose every element is known. Returns the head. */
  function splitCompound(lc: string, depth: number): Word | null {
    if (depth > 1 || lc.length < MIN_ELEMENT * 2) return null;
    // Longest head first: prefer *Gruppen|ticket* over *Gruppenti|cket*.
    for (let cut = lc.length - MIN_ELEMENT; cut >= MIN_ELEMENT; cut--) {
      const head = index.get(lc.slice(cut));
      // Only a noun head, and only a noun compound. Verb and adjective compounds
      // change meaning far more freely (`umfahren` is two opposite verbs).
      if (!head || head.pos !== 'noun') continue;
      const front = lc.slice(0, cut);
      for (const fuge of FUGEN) {
        if (fuge && !front.endsWith(fuge)) continue;
        const stem = fuge ? front.slice(0, -fuge.length) : front;
        if (stem.length < MIN_ELEMENT) continue;
        if (index.get(stem) || adjIndex.get(stem) || splitCompound(stem, depth + 1)) return head;
      }
    }
    return null;
  }

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
    /** Mirror of `sentenceEnd`, walking back — bounds the governed-preposition
     *  search so a preposition in the previous sentence cannot be claimed. */
    const sentenceStart = (i: number) => {
      for (let j = i; j > 0; j--) {
        const between = text.slice(toks[j - 1].start + toks[j - 1].text.length, toks[j].start);
        if (/[.!?;]/.test(between)) return j;
      }
      return 0;
    };

    const out: Segment[] = [];
    let last = 0;
    let posInSentence = 0;
    for (let i = 0; i < toks.length; i++) {
      const { text: tok, start } = toks[i];
      if (start > last) out.push({ text: text.slice(last, start), word: null, isWord: false });
      const after = toks.slice(i + 1, sentenceEnd(i)).map((t) => t.text.toLowerCase());
      const prev = i > 0 ? toks[i - 1].text.toLowerCase() : '';
      // Tokens before this one, back to the last sentence boundary. A separable
      // particle only ever lands *after* its verb, but a governed preposition does
      // not: German puts the prepositional object in front of the closing bracket,
      // so *«hat sich in sie verliebt»* and *«mit Geld umgehen»* carry it before the
      // verb form. Looking only forward missed every Perfekt and every modal.
      const before = toks.slice(sentenceStart(i), i).map((t) => t.text.toLowerCase());
      out.push({ text: tok, word: tok.length >= 2 ? matchWord(tok, after, prev, posInSentence, before) : null, isWord: true });
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
