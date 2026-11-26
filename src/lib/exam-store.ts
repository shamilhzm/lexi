// Sittings, persisted.
//
// Restored 2026-11-26 with the exam room. `lexi.exam.v1` and `lexi.quiz.v1` are
// the keys the room used before it was retired on 2026-09-05, so a learner who
// sat a paper then finds it in their history now. Both ride the backup
// (SETTING_KEYS in store.ts): a sitting is something the learner made.
//
// Deliberately its own store rather than a section of `store.ts`: nothing here is
// FSRS state, nothing here belongs in the review ledger, and an exam sitting is
// the one thing in the app a learner would be upset to lose to a refresh. It is
// therefore written through on **every keystroke of the answer sheet**, which is
// cheap because a sheet is sixty short strings.
//
// localStorage rather than IndexedDB, for the same reason the settings live
// there: a sitting is a few kilobytes, and a synchronous read means a reload
// mid-exam restores the sheet before first paint instead of flashing an empty
// paper at someone with a running clock.
import type { Responses, SpeakingMarks, WritingMarks } from './exam.ts';

const KEY = 'lexi.exam.v1';

export type Mode = 'practice' | 'exam';

export interface Attempt {
  paperId: string;
  mode: Mode;
  /** ms epoch. */
  started: number;
  /** Handed in — every key is now visible and the sheet is read-only. Kept
   *  separate from `finished` so the result screen survives a reload: the
   *  sitting stays *current* while it is being reviewed, and only leaving it
   *  files it. */
  submitted?: boolean;
  /** ms epoch, set when the learner leaves the sitting for good. */
  finished?: number;
  responses: Responses;
  /** Parts the learner has checked in practice mode — answers stay revealed. */
  checked: string[];
  writing?: WritingMarks;
  /** The learner's own letter, kept so the self-assessment has something to
   *  assess and so a second sitting can be compared against the first. */
  letter?: string;
  speaking?: Partial<Record<1 | 2 | 3, SpeakingMarks>>;
  /** Seconds left on each timed block when it was last seen, so a reload does
   *  not hand back the full 90 minutes. Keyed by block label. */
  clocks?: Record<string, number>;
  /** Final points, frozen at the moment the sitting ended. Recomputing from
   *  `responses` would be equivalent today and would silently rewrite history the
   *  first time a key is corrected. */
  score?: {
    written: number; oral: number; total: number;
    /** The paper's own maximum and its own verdict, frozen with the points. Six
     *  papers now disagree about what 100% and what "bestanden" mean, so a
     *  history row that recomputed either against telc's numbers would mislabel
     *  every Goethe sitting. Absent on rows filed before this existed — read them
     *  as telc B1, which is what they were. */
    max?: number; passed?: boolean;
  };
  /** Per-strand share of that strand's maximum, 0..1, frozen with the score.
   *  The only evidence the app has about reading, writing and speaking, kept
   *  frozen because recomputing it would need the paper loaded on a screen that
   *  may never load one. Nothing reads it since the readiness read went with the
   *  exam-date race (2026-11-21); it is filed so a future reader has the history. */
  strands?: Record<string, number>;
}

interface Store { current: Attempt | null; past: Attempt[] }

let state: Store = { current: null, past: [] };
let loaded = false;

function read(): Store {
  if (loaded) return state;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Store>;
      state = {
        current: p.current ?? null,
        past: Array.isArray(p.past) ? p.past : [],
      };
    }
  } catch { /* a corrupt sitting is not worth failing a boot over */ }
  return state;
}

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  emit();
}

// ---- pub/sub ---------------------------------------------------------------
const listeners = new Set<() => void>();
let version = 0;
function emit() { version++; for (const fn of listeners) fn(); }
export function subscribeExam(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function examVersion() { return version; }

// ---- reads -----------------------------------------------------------------

/** The sitting in progress, if any. */
export function current(): Attempt | null { return read().current; }

/** Finished sittings, newest first. */
export function history(paperId?: string): Attempt[] {
  const all = read().past.filter((a) => !paperId || a.paperId === paperId);
  return [...all].sort((a, b) => (b.finished ?? 0) - (a.finished ?? 0));
}

/** The best sitting of a paper, by share of what was sat — the number a learner
 *  actually wants on the cover, since a run they abandoned is not their score.
 *  By share and not by points: a sitting from before Lexi went silent was out of
 *  300 with Hören in it, one after is out of 255, and 200 of the second is the
 *  better result. Rows with no frozen maximum are telc B1's, out of 300. */
export function best(paperId: string): { total: number; max: number; passed?: boolean } | null {
  let top: { total: number; max: number; passed?: boolean } | null = null;
  for (const a of history(paperId)) {
    if (!a.score) continue;
    const max = a.score.max ?? 300;
    if (!top || a.score.total / max > top.total / top.max) top = { total: a.score.total, max, passed: a.score.passed };
  }
  return top;
}

/** Best measured value per strand across every sitting at this level, including
 *  one still in progress. Strands improve independently — a learner who fixed
 *  their listening in a later sitting should not have it averaged back down by
 *  the first — so this is a per-strand max rather than "the best sitting". */
export function bestStrands(paperId?: string): Record<string, number> {
  const out: Record<string, number> = {};
  const all = [...history(paperId), ...(current() ? [current()!] : [])];
  for (const a of all) {
    if (paperId && a.paperId !== paperId) continue;
    for (const [k, v] of Object.entries(a.strands ?? {})) {
      if (typeof v === 'number' && (out[k] == null || v > out[k])) out[k] = v;
    }
  }
  return out;
}

// ---- the short tests -------------------------------------------------------
// One row per preset and level: the best run, by share. Not a measurement that
// reaches anything else — a quiz reports and never schedules.
export interface QuizResult { preset: string; level: string; correct: number; total: number; at: number }
const QUIZ_KEY = 'lexi.quiz.v1';

export function quizResults(): Record<string, QuizResult> {
  try { return JSON.parse(localStorage.getItem(QUIZ_KEY) || '{}') as Record<string, QuizResult>; }
  catch { return {}; }
}

export function recordQuiz(r: QuizResult): void {
  const all = quizResults();
  const key = `${r.preset}:${r.level}`;
  const prev = all[key];
  if (!prev || r.correct / r.total >= prev.correct / prev.total) all[key] = r;
  try { localStorage.setItem(QUIZ_KEY, JSON.stringify(all)); } catch { /* quota */ }
  emit();
}

// ---- the sitting -----------------------------------------------------------

export function start(paperId: string, mode: Mode): Attempt {
  const a: Attempt = { paperId, mode, started: Date.now(), responses: {}, checked: [] };
  read();
  state = { ...state, current: a };
  write();
  return a;
}

/** Patch the sitting in progress. A no-op when nothing is running, so a stray
 *  save from an unmounting screen cannot resurrect a finished attempt. */
export function patch(fn: (a: Attempt) => Attempt): void {
  const s = read();
  if (!s.current) return;
  state = { ...s, current: fn(s.current) };
  write();
}

export function answer(n: number, key: string): void {
  patch((a) => ({ ...a, responses: { ...a.responses, [n]: key } }));
}

export function markChecked(partId: string): void {
  patch((a) => (a.checked.includes(partId) ? a : { ...a, checked: [...a.checked, partId] }));
}

export function setClock(label: string, secondsLeft: number): void {
  patch((a) => ({ ...a, clocks: { ...a.clocks, [label]: Math.max(0, Math.round(secondsLeft)) } }));
}

export function setLetter(text: string): void { patch((a) => ({ ...a, letter: text })); }
export function setWritingMarks(m: WritingMarks): void { patch((a) => ({ ...a, writing: m })); }
export function setSpeakingMarks(teil: 1 | 2 | 3, m: SpeakingMarks): void {
  patch((a) => ({ ...a, speaking: { ...a.speaking, [teil]: m } }));
}

/** Hand the paper in: keys become visible, the sheet becomes read-only, and the
 *  score is frozen (see `Attempt.score`). The sitting stays current so the
 *  result and the review survive a reload. */
export function submit(score: NonNullable<Attempt['score']>,
                       strands?: Record<string, number>): void {
  patch((a) => ({ ...a, submitted: true, score, ...(strands ? { strands } : {}) }));
}

/** Leave for good and file the sitting in the history. */
export function finish(score?: Attempt['score']): void {
  const s = read();
  if (!s.current) return;
  const done: Attempt = { ...s.current, finished: Date.now(), score: score ?? s.current.score };
  state = { current: null, past: [...s.past, done].slice(-40) };
  write();
}

/** Walk away without filing anything — the "discard" on an abandoned sitting. */
export function abandon(): void {
  const s = read();
  if (!s.current) return;
  state = { ...s, current: null };
  write();
}
