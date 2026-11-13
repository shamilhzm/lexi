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
  'aufhören': ['mit+D'],
  'aufpassen': ['auf+A'],
  'basieren': ['auf+D'],
  'berichten': ['über+A'],
  'diskutieren': ['über+A'],
  'entschuldigen': ['für+A'],
  'erzählen': ['von+D'],
  'gratulieren': ['zu+D'],
  'hoffen': ['auf+A'],
  'informieren': ['über+A'],
  'kämpfen': ['für+A'],
  'lachen': ['über+A'],
  'leiden': ['unter+D'],
  'protestieren': ['gegen+A'],
  'reagieren': ['auf+A'],
  'schützen': ['vor+D'],
  'sich aufregen': ['über+A'],
  'sich bemühen': ['um+A'],
  'sich beschweren': ['über+A'],
  'sich entscheiden': ['für+A'],
  'sich erkundigen': ['nach+D'],
  'sich freuen': ['über+A'],
  'sich gewöhnen': ['an+A'],
  'sich kümmern': ['um+A'],
  'sich sehnen': ['nach+D'],
  'sich unterhalten': ['über+A'],
  'sich verabschieden': ['von+D'],
  'sich verstehen': ['mit+D'],
  'sprechen': ['über+A'],
  'streiten': ['über+A'],
  'suchen': ['nach+D'],
  'telefonieren': ['mit+D'],
  'träumen': ['von+D'],
  'überzeugen': ['von+D'],
  'vergleichen': ['mit+D'],
  'wundern': ['über+A'],
  'zweifeln': ['an+D'],
  'zwingen': ['zu+D'],
};

/** `auf+A` → `{ prep: 'auf', kase: 'A' }`. */
export function governed(term: string): { prep: string; kase: 'A' | 'D' }[] {
  return (GOVERNMENT[term] ?? []).map((g) => {
    const [prep, kase] = g.split('+');
    return { prep, kase: kase as 'A' | 'D' };
  });
}
