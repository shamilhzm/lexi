// Word order, and the one thing the sentence-builder was giving away for free.
//
// German capitalises the first word of a sentence *and* every noun. So when the
// builder shuffles a sentence into tiles, a capital carries two very different
// kinds of information — "I am a noun", which the learner must know, and "I was
// first", which is the whole answer. «Ich · treffe · meine · Freunde · am ·
// Wochenende» can be solved without reading a word of it, exactly like the cloze
// answer that was the only capitalised option.
//
// The fix is to show the tiles in **citation case**: the case each word carries in
// the middle of a sentence. Nouns keep their capital because they always have one;
// a positional capital is dropped because it was never about the word.
//
// **4,565 of 6,020 order drills (75.8%) are corrected.** The 23.7% that remain open
// with something this list cannot name, and each is an *open* class: imperatives
// (Mach, Öffne, Setz), full finite verbs (Kommst), adjectives (Nächste). They still
// leak. Enumerating them is the pattern-instead-of-lexicon mistake LESSONS records,
// and the obvious lexicon does not work here — see the note on `lookupSurface`
// below. `Sie` is in the remainder deliberately and is *not* a defect.
//
// This also makes the builder honest about something more interesting than the
// leak. German lets any single element hold first position, so a sentence usually
// has several correct arrangements — see the B1 point `Das Vorfeld`. Tiles frozen
// in the original sentence's casing quietly assert that only one arrangement was
// ever intended.

/** Words that are lowercase in mid-sentence, so a capital on them is positional.
 *
 *  A closed list on purpose. The alternative — "lowercase it if it is not a noun" —
 *  needs to know what a noun is, and German's answer to that is *it is capitalised*,
 *  which is the very thing being decided. Listing the function words instead can
 *  only ever be too small, never wrong.
 *
 *  `sie`, `ihr` and `ihre` are deliberately **absent**: the formal *Sie* / *Ihr* is
 *  capitalised everywhere, and nothing in the token distinguishes it from the
 *  lowercase pronoun. */
const POSITIONAL_OPENERS = new Set([
  // personal and indefinite pronouns
  'ich', 'du', 'er', 'es', 'wir', 'man', 'mich', 'mir', 'uns', 'dich', 'dir',
  // possessives (the formal Ihr is excluded above)
  'mein', 'meine', 'meinen', 'meinem', 'meiner', 'dein', 'deine', 'deinen', 'deinem',
  'sein', 'seine', 'seinen', 'seinem', 'unser', 'unsere', 'unseren', 'unserem',
  // determiners
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer',
  'dieser', 'diese', 'dieses', 'diesen', 'diesem', 'alle', 'jeder', 'jede', 'jedes', 'jeden',
  'viele', 'manche', 'kein', 'keine', 'keinen',
  // adverbs that commonly open
  'heute', 'morgen', 'gestern', 'jetzt', 'hier', 'dort', 'dann', 'bald', 'oft', 'immer',
  'manchmal', 'nie', 'selten', 'später', 'früher', 'danach', 'abends', 'nachts', 'gerade',
  // question words
  'was', 'wie', 'wo', 'wann', 'warum', 'wer', 'wen', 'wem', 'wohin', 'woher', 'welche', 'welcher',
  // prepositions and conjunctions
  'in', 'an', 'auf', 'über', 'unter', 'vor', 'hinter', 'neben', 'mit', 'nach', 'bei', 'seit',
  'von', 'zu', 'aus', 'durch', 'für', 'ohne', 'um', 'gegen', 'im', 'am', 'beim', 'vom', 'zum', 'zur',
  'und', 'aber', 'oder', 'denn', 'wenn', 'weil', 'dass', 'ob', 'als', 'obwohl', 'damit',
  // particles
  'nicht', 'sehr', 'ganz', 'nur', 'auch', 'schon', 'noch', 'leider', 'vielleicht', 'natürlich',
  // Finite auxiliaries and modals — what opens a German yes/no question, and the
  // largest group still leaking after the list above. 219 of the drills are
  // questions: «Habt ihr Hilfe angeboten?» rendered *Habt* capitalised among
  // lowercase tiles, which is the answer. A closed class, so it can be listed;
  // full verbs are open and are deliberately left alone.
  //
  // Not extended to a lexicon lookup on purpose. `lookupSurface` is case-sensitive
  // by design — its own comment is "`Essen` stays the noun and `Morgen` stays the
  // morning" — so asking it about a capitalised first token resolves *Können* to
  // the noun *das Können*, and acting on that would lowercase a real noun.
  'bin', 'bist', 'ist', 'sind', 'seid', 'war', 'warst', 'waren', 'wart',
  'habe', 'hast', 'hat', 'haben', 'habt', 'hatte', 'hattest', 'hatten', 'hattet',
  'werde', 'wirst', 'wird', 'werden', 'werdet', 'wurde', 'wurden',
  'kann', 'kannst', 'können', 'könnt', 'konnte', 'konnten',
  'muss', 'musst', 'müssen', 'müsst', 'musste', 'mussten',
  'will', 'willst', 'wollen', 'wollt', 'wollte', 'wollten',
  'soll', 'sollst', 'sollen', 'sollt', 'sollte', 'sollten',
  'darf', 'darfst', 'dürfen', 'dürft', 'durfte', 'durften',
  'mag', 'magst', 'mögen', 'mögt', 'möchte', 'möchtest', 'möchten', 'möchtet',
]);

/** Tiles as the learner should see them: the case each word carries mid-sentence.
 *
 *  Only the first token can hold a positional capital, so only it is considered —
 *  and it is left alone unless two things hold: it is a known function word, and it
 *  does not appear capitalised *elsewhere* in the same sentence. The second guard
 *  matters because a handful of examples are two sentences joined by a dash or a
 *  colon («Das Konzert fällt aus. – Das ist schade»), where the later capital is
 *  another opener and lowercasing only the first would look like an error. */
export function citationTiles(tokens: string[]): string[] {
  if (!tokens.length) return tokens;
  const first = tokens[0];
  if (!/^[A-ZÄÖÜ]/.test(first)) return tokens;
  const lower = first.toLowerCase();
  if (!POSITIONAL_OPENERS.has(lower)) return tokens;
  const capitalisedLater = tokens.slice(1).some((t) => t.toLowerCase() === lower && /^[A-ZÄÖÜ]/.test(t));
  if (capitalisedLater) return tokens;
  return [lower, ...tokens.slice(1)];
}

/** Restore the opening capital for a rendered sentence — the answer line, where the
 *  learner is reading German rather than choosing it. */
export function sentenceCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Case-insensitive comparison of two token orders.
 *
 *  Case is not something the builder lets the learner choose — the tiles arrive
 *  with whatever case they were given — so it cannot be part of what is graded.
 *  Grading it meant the *pool* had to spell position 1 for the answer to be
 *  reachable, which is where the leak above came from. */
export function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t, i) => t.toLowerCase() === b[i].toLowerCase());
}
