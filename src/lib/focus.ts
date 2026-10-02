// Focus — Lexi does one thing: it grows the German words you know.
//
// Decided with the owner on 2026-10-02 (VISION, *Focus*). Everything here is
// built, tested and kept; these flags only decide whether the learner meets it.
// Flip one back to `true` and that part of the app returns exactly as it was,
// because nothing a hidden feature stored is touched while it is hidden — the
// drill mutes, the pace and the retention target all stay in localStorage, and
// every FSRS row keeps its schedule. The same shape as the grammar-card filter
// in `data/index.ts`: one line to reverse.
//
// No imports, on purpose: `store.ts` reads this at module load.

export interface Focus { grammar: boolean; speaking: boolean; writing: boolean; tuning: boolean }

export const FOCUS: Readonly<Focus> = {
  /** Drills that test a rule of the language rather than a fact of the word —
   *  verb forms and comparison — the session's drill toggles, and the case a
   *  verb's preposition governs. Gender and plural are *not* in here: in German
   *  they are part of knowing a noun (`der Tisch, die Tische`), and they stay. */
  grammar: false,
  /** *Sag es*, the pronunciation game. Speech, not vocabulary. */
  speaking: false,
  /** Writing back to a story, with the tutor's corrections. The tutor's
   *  *explain this sentence* stays: it helps you read the words you are saving. */
  writing: false,
  /** Daily pace and review intensity. Hidden means the defaults apply. */
  tuning: false,
};

/** Practice modes that test a rule of the language, hidden while `grammar` is off. */
export const GRAMMAR_MODES: ReadonlySet<string> = new Set(['conjugate', 'degree']);

/** Whether a drill mode is part of the app the learner can currently see. */
export function visibleMode(m: string): boolean {
  return FOCUS.grammar || !GRAMMAR_MODES.has(m);
}
