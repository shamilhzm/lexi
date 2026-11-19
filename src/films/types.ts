// A film is a short, animated, learner-paced explainer — Lexi's version of a
// Brilliant lesson. It is data, not video: a list of beats that `FilmPlayer`
// renders and animates. That makes a film a few kilobytes instead of megabytes,
// crisp at any size, right in both themes, readable by a screen reader, playable
// offline, and — the part a video cannot do — interactive: a learner guesses
// before the answer is shown.
//
// ## Two rules every beat keeps
//
// 1. **A film never grades.** A guess inside a film is a prediction, not evidence:
//    nothing here writes an FSRS card. The unit's *Üben* session does that, after.
// 2. **A fact about a word comes from the corpus, not from this file.** A beat
//    names a card (`der Tisch`); its gender, gloss, plural and examples are looked
//    up at runtime. Pattern counts ("-ung is die") are *measured* over the corpus
//    when the beat plays, exceptions listed — never asserted. What a film writes
//    by hand is the explanation and, for grammar beats, sentences checked by a
//    person; `films.test.ts` holds every card reference and every claim to the data.

export type Gender = 'der' | 'die' | 'das';

/** A column of German items. An item that is a card's term renders with its
 *  gender ink and can be heard; anything else renders as plain German. */
export interface Column { label: string; items: string[] }

export type Beat =
  /** The opening card: what this film is about, in one sentence. */
  | { kind: 'title'; title: string; line: string }
  /** Cards from the corpus, dealt one by one. */
  | { kind: 'words'; line: string; terms: string[] }
  /** Guess a card's article before it is revealed. */
  | { kind: 'gender'; line: string; term: string }
  /** Guess between authored options — for grammar, where no card holds the answer. */
  | { kind: 'choice'; line: string; prompt: string; options: string[]; answer: number; reveal: string }
  /** Cards' plurals, as the corpus has them: the ending and any umlaut light up,
   *  and every article becomes *die*. */
  | { kind: 'plural'; line: string; terms: string[] }
  /** A false friend, from the app's own list (`lib/falseFriends.ts`): what the
   *  word looks like, what it means, and what to say instead. */
  | { kind: 'trap'; line: string; term: string }
  /** Count, live, how the corpus genders nouns with these endings. `claim` is the
   *  article the line asserts; a test fails if the corpus stops agreeing. */
  | { kind: 'pattern'; line: string; endings: string[]; claim: Gender }
  /** Parts slide together into a compound; the last part's article carries over. */
  | { kind: 'compound'; line: string; parts: string[]; whole: string; glue?: string }
  /** Sentences stacked so one position lines up — the verb in second place. */
  | { kind: 'order'; line: string; rows: string[][]; slot: number; label: string }
  /** An arc between two words of one sentence: a separable verb, a clause frame. */
  | { kind: 'bracket'; line: string; tokens: string[]; from: number; to: number; label: string }
  /** One sentence becomes another; shared words glide to their new places. */
  | { kind: 'move'; line: string; from: string[]; to: string[] }
  /** Two columns side by side. Rows read left → right (verb → noun) unless
   *  `split`, which sets two parallel lists apart (Beruf | Hochschule). */
  | { kind: 'pair'; line: string; left: Column; right: Column; split?: boolean }
  /** The same meaning at different registers, casual to formal. */
  | { kind: 'scale'; line: string; steps: { label: string; de: string; term?: string }[] }
  /** A card's own example sentence, found by `match`, with `mark` highlighted. */
  | { kind: 'example'; line: string; term: string; match: string; mark: string[] }
  /** One German line, written for this film, with its English. */
  | { kind: 'say'; line: string; de: string; en?: string }
  /** A small bar chart and the sentence that describes it. */
  | { kind: 'chart'; line: string; bars: { label: string; value: number }[]; de: string; en: string }
  /** The hand-off to the unit's words. */
  | { kind: 'outro'; line: string };

export interface Film {
  id: string;
  title: string;
  /** Rough length when played at a reading pace — shown before you start. */
  minutes: number;
  beats: Beat[];
}
