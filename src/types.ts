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
  def: string | null;  // definition (for grammar: the rule)
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
