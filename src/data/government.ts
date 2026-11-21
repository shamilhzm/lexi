// The preposition a verb takes, for the cards whose headword does not say it.
//
// 49 cards carry their preposition in the headword — `warten auf + A`. The rest of
// the verbs that have one do not: *antworten*, *hoffen*, *sich kümmern*, *träumen*
// are plain cards, and their preposition lives only in their example sentences,
// where nothing can ask for it. `lib/valency.ts` says why it is not mined from
// those sentences: one preposition in twelve after a verb is its government, the
// rest are adverbials (*gehen nach Hause*, *trinken bei der Hitze*).
//
// So this is the other thing: **ruled, not mined.** Each row is a judgement that a
// preposition is the verb's own — the standard *Verben mit Präpositionen* of the
// B1 syllabus — and each is held to evidence the corpus already has:
// `government.test.ts` refuses a row unless the card exists and **its own example
// sentences use the verb with that preposition**. A row cannot assert something
// the card does not already show; it can only say which of the things it shows is
// government. Add a verb by adding an example that proves it first.
//
// Keyed by the card's headword exactly as written, reflexive and all: *sich
// verstehen* (mit) is not *verstehen*, *sich unterhalten* (über) is not
// *unterhalten*. The first preposition listed is the one the drill asks for; the
// others are also right and are never offered as wrong answers. `A`/`D` is the
// case, recorded because a two-way preposition's case cannot be derived — and
// shown only where `lib/focus.ts` shows cases at all.
export const GOVERNMENT: Readonly<Record<string, readonly string[]>> = {
  'anfangen': ['mit+D'],
  'antworten': ['auf+A'],
  'appellieren': ['an+A'],
  'arbeiten': ['an+D'],
  'aufhören': ['mit+D'],
  'aufpassen': ['auf+A'],
  'basieren': ['auf+D'],
  'befassen': ['mit+D'],
  'bekennen': ['zu+D'],
  'berichten': ['über+A'],
  'beruhen': ['auf+D'],
  'beziehen': ['auf+A'],
  'diskutieren': ['über+A'],
  'einladen': ['zu+D', 'auf+A'],
  'entschuldigen': ['für+A'],
  'erkranken': ['an+D'],
  'erzählen': ['von+D'],
  'gratulieren': ['zu+D'],
  'hoffen': ['auf+A'],
  'informieren': ['über+A'],
  'kämpfen': ['für+A'],
  'lachen': ['über+A'],
  'leiden': ['unter+D'],
  'neigen': ['zu+D'],
  'protestieren': ['gegen+A'],
  'reagieren': ['auf+A'],
  'schützen': ['vor+D'],
  'sich abfinden': ['mit+D'],
  'sich anpassen': ['an+A'],
  'sich aufregen': ['über+A'],
  'sich auseinandersetzen': ['mit+D'],
  'sich bemühen': ['um+A'],
  'sich beschweren': ['über+A'],
  'sich engagieren': ['für+A'],
  'sich entscheiden': ['für+A'],
  'sich erkundigen': ['nach+D'],
  'sich freuen': ['über+A'],
  'sich gewöhnen': ['an+A'],
  'sich kümmern': ['um+A'],
  'sich schämen': ['für+A'],
  'sich sehnen': ['nach+D'],
  'sich spezialisieren': ['auf+A'],
  'sich unterhalten': ['über+A'],
  'sich verabschieden': ['von+D'],
  'sich verstehen': ['mit+D'],
  'sich wehren': ['gegen+A'],
  'sprechen': ['über+A'],
  'staunen': ['über+A'],
  'streiten': ['über+A'],
  'suchen': ['nach+D'],
  'telefonieren': ['mit+D'],
  'träumen': ['von+D'],
  'übereinstimmen': ['mit+D'],
  'überreden': ['zu+D'],
  'überzeugen': ['von+D'],
  'vergleichen': ['mit+D'],
  'verhandeln': ['über+A'],
  'verstoßen': ['gegen+A'],
  'wundern': ['über+A'],
  'zweifeln': ['an+D'],
  'zwingen': ['zu+D'],
};

/** Prepositions a word also takes in standard German, which the drill must never
 *  offer as the wrong answer. Keyed by lemma: lowercase, no *sich*, as `prepsFor`
 *  ties a word's cards together, so a headword card (`warten auf + A`) is covered
 *  as well as a ruled one.
 *
 *  The drill draws three wrong answers from fifteen prepositions and skipped only
 *  those the corpus attests for the word, so *kämpfen* (*für*) could be offered
 *  *gegen* as wrong, and *schützen* (*vor*) *gegen* (2026-11-21). Unlike a
 *  GOVERNMENT row, this is not held to the card's examples: it is never asked, and
 *  leaving an option out can only make an item easier. It can never mark German
 *  wrong. What belongs here is a prepositional object or a pattern as common as
 *  one (*mit jemandem sprechen*), not every adverbial a verb can take. */
export const ALSO_TAKES: Readonly<Record<string, readonly string[]>> = {
  'antworten': ['mit'],
  'arbeiten': ['bei', 'für', 'mit', 'in', 'über'],
  'berichten': ['von'],
  'beschweren': ['bei'],
  'bestehen': ['auf', 'in'],
  'bewerben': ['bei', 'für'],
  'beziehen': ['von'],
  'denken': ['über', 'von'],
  'diskutieren': ['mit'],
  'eignen': ['zu'],
  'einladen': ['in', 'nach'],
  'einsetzen': ['gegen'],
  'eintreten': ['in'],
  'engagieren': ['gegen', 'in'],
  'entscheiden': ['gegen', 'über'],
  'entschuldigen': ['bei'],
  'erkundigen': ['bei'],
  'erzählen': ['über'],
  'freuen': ['für'],
  'gelangen': ['an', 'in', 'nach'],
  'informieren': ['bei'],
  'kommen': ['von'],
  'kämpfen': ['gegen', 'um', 'mit'],
  'leiden': ['an'],
  'reagieren': ['mit'],
  'rechnen': ['auf'],
  'schämen': ['vor'],
  'schützen': ['gegen'],
  'sprechen': ['mit', 'von'],
  'stammen': ['von'],
  'streiten': ['mit', 'um'],
  'unterhalten': ['mit'],
  'verhandeln': ['mit', 'um'],
  'übereinstimmen': ['in'],
  'warten': ['mit'],
  'wenden': ['gegen'],
  'ziehen': ['in', 'zu', 'aus', 'an'],
};

/** `auf+A` → `{ prep: 'auf', kase: 'A' }`. */
export function governed(term: string): { prep: string; kase: 'A' | 'D' }[] {
  return (GOVERNMENT[term] ?? []).map((g) => {
    const [prep, kase] = g.split('+');
    return { prep, kase: kase as 'A' | 'D' };
  });
}
