// How ready are you, and what should you do next.
//
// The exam surface could tell a learner what they scored on a paper they had
// already sat. It could not tell them anything before that, which is the whole
// period that matters — the weeks in which the answer to "am I ready?" changes
// what you study today.
//
// ## Two numbers, never one
//
// The app knows two different kinds of thing and they must not be averaged into a
// single reassuring percentage:
//
//   **Preparation** — how much of the level's material the learner has actually
//   consolidated. Derived from FSRS state over the corpus and the grammar bank.
//   Always available, and completely unable to say whether they can sit an exam.
//
//   **Performance** — what they scored the last time they were tested. Only
//   exists once they have been. Says far more, and says nothing at all until then.
//
// Reporting one blended figure would let a learner with 90% preparation and no
// measured performance believe they were ready. The result screen already refuses
// the same trick for telc's two halves; this is that rule applied earlier.
//
// ## Nothing here is telc-shaped
//
// Strands are the six things any language certificate tests. A provider that
// weights them differently supplies its own weights; a learner with no exam
// target at all still gets a readiness read on their level, because "am I a solid
// B1 yet" is a question worth answering whether or not you have booked anything.
import type { CEFR } from '../types.ts';

export type StrandKey = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'writing' | 'speaking';

export interface Strand {
  key: StrandKey;
  label: string;
  /** 0..1, or null when nothing has measured it yet. A null is information: it
   *  is the difference between "you are weak here" and "nobody has checked". */
  score: number | null;
  /** Where the number came from, in the learner's words. */
  basis: string;
}

export interface Action {
  /** Sort key — lower is more urgent. */
  rank: number;
  label: string;
  why: string;
  /** Where the UI should send them. */
  to: { kind: 'quiz'; preset: string } | { kind: 'paper' } | { kind: 'speaking' }
    | { kind: 'grammar'; point?: string } | { kind: 'session' };
}

export interface Readiness {
  level: CEFR;
  /** Consolidated share of the level's own material, 0..1. */
  preparation: number;
  /** Best measured share of an actual test, 0..1, or null if never sat. */
  performance: number | null;
  strands: Strand[];
  actions: Action[];
  /** Whole days until the exam date, or null if none set. Negative once past. */
  daysLeft: number | null;
}

export interface ReadinessInput {
  level: CEFR;
  /** Cumulative counts over every card at or below `level`. */
  vocab: { known: number; count: number };
  /** Mean mastery over grammar points at or below `level`, 0..1, or null when
   *  the bank has not loaded. */
  grammar: number | null;
  /** Per-strand results from the best sitting, 0..1, absent when never measured. */
  measured?: Partial<Record<StrandKey, number>>;
  /** Recurring weaknesses, worst first — `store.missStats` tags. */
  blindSpots?: { tag: string; count: number }[];
  /** YYYY-MM-DD. */
  examDate?: string | null;
  today?: Date;
}

// Short names on purpose. "Schriftlicher Ausdruck" truncates at 375px in the
// strand list, and "Schreiben"/"Sprechen" are what the parts are called out loud
// anyway — including by the examiners.
const LABEL: Record<StrandKey, string> = {
  vocabulary: 'Wortschatz', grammar: 'Grammatik', reading: 'Leseverstehen',
  listening: 'Hörverstehen', writing: 'Schreiben', speaking: 'Sprechen',
};

/** The bar most certificates set, and the one Lexi reports against by default.
 *  telc and Goethe both pass at 60%. */
export const PASS_MARK = 0.6;

export function daysUntil(date: string, today = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const then = Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((then - now) / 86_400_000);
}

export function readiness(input: ReadinessInput): Readiness {
  const prep = input.vocab.count ? input.vocab.known / input.vocab.count : 0;
  const measured = input.measured ?? {};

  const strands: Strand[] = [
    {
      key: 'vocabulary', label: LABEL.vocabulary, score: prep,
      basis: `${input.vocab.known} of ${input.vocab.count} words at ${input.level} and below consolidated`,
    },
    {
      key: 'grammar', label: LABEL.grammar, score: input.grammar,
      basis: input.grammar == null ? 'grammar bank not loaded' : 'mean mastery across the concepts at your level',
    },
    ...(['reading', 'listening', 'writing', 'speaking'] as StrandKey[]).map((key) => ({
      key, label: LABEL[key],
      score: measured[key] ?? null,
      basis: measured[key] == null ? 'not measured yet — sit a paper' : 'your best sitting',
    })),
  ];

  const scored = strands.map((s) => s.score).filter((n): n is number => n != null);
  const perfKeys: StrandKey[] = ['reading', 'listening', 'writing', 'speaking'];
  const perfScores = perfKeys.map((k) => measured[k]).filter((n): n is number => n != null);
  const performance = perfScores.length ? perfScores.reduce((a, b) => a + b, 0) / perfScores.length : null;

  const daysLeft = input.examDate ? daysUntil(input.examDate, input.today) : null;

  // ---- what to do next -----------------------------------------------------
  // Ranked by what actually moves a mark, not by what is easiest to render. The
  // ordering rule: measure before you optimise (an unsat paper is the biggest
  // unknown), then the weakest measured strand, then the weakest prepared one.
  const actions: Action[] = [];

  if (!perfScores.length) {
    actions.push({
      rank: 0,
      label: 'Sit a full paper',
      why: 'Four of the six strands have never been measured. Until one has, every '
        + 'readiness number here is a guess about the two that have.',
      to: { kind: 'paper' },
    });
  }

  const weakestMeasured = perfKeys
    .filter((k) => measured[k] != null && measured[k]! < PASS_MARK)
    .sort((a, b) => measured[a]! - measured[b]!)[0];
  if (weakestMeasured) {
    actions.push({
      rank: 1,
      label: `${LABEL[weakestMeasured]} is under the pass mark`,
      why: `You scored ${Math.round(measured[weakestMeasured]! * 100)}% — the bar is 60%, and it is `
        + 'a bar on each part separately, so a strong part cannot carry a weak one.',
      to: weakestMeasured === 'speaking' ? { kind: 'speaking' }
        : weakestMeasured === 'writing' ? { kind: 'paper' }
        : { kind: 'quiz', preset: weakestMeasured === 'reading' ? 'context' : 'vocab' },
    });
  }

  const spot = input.blindSpots?.[0];
  if (spot && spot.count >= 3) {
    actions.push({
      rank: 2,
      label: `Drill ${spot.tag}`,
      why: `${spot.count} misses logged there recently — your most repeated structural mistake.`,
      to: { kind: 'grammar', point: spot.tag },
    });
  }

  if (prep < PASS_MARK) {
    actions.push({
      rank: 3,
      label: 'Keep the daily session going',
      why: `${Math.round(prep * 100)}% of ${input.level} vocabulary is consolidated. `
        + 'Below 60% the paper will feel like a reading test rather than a language test.',
      to: { kind: 'session' },
    });
  } else if (input.grammar != null && input.grammar < PASS_MARK) {
    actions.push({
      rank: 3,
      label: 'Grammar is behind your vocabulary',
      why: `Words ${Math.round(prep * 100)}%, grammar ${Math.round(input.grammar * 100)}%. `
        + 'Sprachbausteine and the letter both pay for that gap.',
      to: { kind: 'quiz', preset: 'grammar' },
    });
  }

  if (daysLeft != null && daysLeft >= 0 && daysLeft <= 14) {
    actions.push({
      rank: 4,
      label: daysLeft === 0 ? 'Exam today — do the speaking scripts' : `${daysLeft} days left`,
      why: 'Close to the day, the oral is the cheapest place left to gain marks: it is a '
        + 'quarter of the total and half of it is behaviour rather than language.',
      to: { kind: 'speaking' },
    });
  }

  if (!actions.length) {
    actions.push({
      rank: 5,
      label: 'Take a mixed test',
      why: 'Nothing is obviously behind. Re-measure rather than assume.',
      to: { kind: 'quiz', preset: 'mixed' },
    });
  }

  return {
    level: input.level,
    preparation: prep,
    performance,
    strands,
    actions: actions.sort((a, b) => a.rank - b.rank),
    daysLeft,
    ...(scored.length ? {} : {}),
  };
}
