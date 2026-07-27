export type CEFR = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export const ALL_LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface Example { de: string; en: string; lvl: string; }

/** One card — vocabulary or a grammar point — from the merged lexicon. */
export interface Word {
  id: string;
  term: string;        // German front; nouns include the article ("der Tisch")
  en: string;          // English gloss (for grammar: the one-line summary)
  pos: string;         // noun | verb | adjective | … | "grammar"
  level: CEFR;
  gender: 'der' | 'die' | 'das' | null;
  plural: string | null;
  ipa: string | null;
  def: string | null;  // English learner definition (for grammar: the rule)
  /** German definition of a German word — the monolingual layer B2 upward needs,
   *  and the level at which a bilingual gloss stops being enough (persona B2 #38).
   *
   *  Separate from `def` rather than replacing it: 367 of these shipped *inside*
   *  `def`, where 318 sat at A1–B1 on an English-base card, so a beginner met a
   *  definition they could not read. Same text, right field, shown to the readers
   *  it is for. */
  defDe?: string | null;
  syn: string[];
  ant: string[];
  ex: Example[];
  field: string;       // fine-grained semantic sector
  kind: 'word' | 'grammar';
}

export interface SectorMeta {
  name: string;
  count: number;
  levels: CEFR[];
  group: string;       // coarse themed group (the market tile)
}

/** A unit with live, FSRS-derived stats. */
export interface Stat {
  name: string;
  count: number;
  learned: number;     // cards touched (left the New state)
  known: number;       // cards consolidated (reached the Review state)
  due: number;
  newCount: number;
  coverage: number;    // learned / count (0..1) -> tile colour
}

export interface GroupStat extends Stat { sectors: number; }
export interface SectorStat extends Stat { group: string; levels: CEFR[]; }

/** What a study session / map / deck list is scoped to. */
export type Target =
  | { kind: 'all'; name: string }
  | { kind: 'group'; name: string }
  | { kind: 'sector'; name: string }
  | { kind: 'custom'; name: string; ids: string[] }; // explicit id list (briefing, mining)
