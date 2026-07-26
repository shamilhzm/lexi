// Local-first store: per-star FSRS state + cached enrichment + streak stats.
import { allStars, starById, starsForLesson, LEVELS, type Star, type CEFR } from './model.ts';
import { lektionByN, LEKTIONEN } from './curriculum.ts';
import { emptyCard, reviveCard, schedule, isDue, type Card, type Grade } from './srs.ts';
import type { Enriched } from './enrich.ts';
import type { BlindspotEvent } from './blindspots.ts';

const KEY = 'orbita_v1';

interface Stats { streak: number; lastReviewDay: string | null; reviewedToday: number; totalReviews: number; newToday: number; }
// Per-Lektion diagnostic result (gap check). `verdict` is what the learner
// last measured; the derived lessonState() can upgrade it to 'mastered'.
export interface LessonProgress { checked: string; score: { correct: number; total: number }; verdict: 'gap' | 'secure'; }
interface Progress { placementDone: boolean; placementLevel: CEFR | null; lessons: Record<number, LessonProgress>; }

// How many brand-new stars to introduce per day. Keeps the daily workload sane
// (Anki-style) instead of every unseen card counting as "due".
export const DAILY_NEW = 20;
// Upper cap on how many of a Lektion's stars must be mastered to earn its seal
// (sealThreshold also takes 60% of the lesson size, whichever is smaller).
export const SEAL_CAP = 12;

interface StoreShape {
  v: number;
  reviews: Record<string, Card>;
  enriched: Record<string, Enriched>;
  stats: Stats;
  progress: Progress;
  blindspots: BlindspotEvent[];
}

function fresh(): StoreShape {
  return { v: 2, reviews: {}, enriched: {}, stats: { streak: 0, lastReviewDay: null, reviewedToday: 0, totalReviews: 0, newToday: 0 }, progress: { placementDone: false, placementLevel: null, lessons: {} }, blindspots: [] };
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw) as StoreShape;
    for (const id in s.reviews) reviveCard(s.reviews[id]);
    const merged = { ...fresh(), ...s, stats: { ...fresh().stats, ...s.stats }, progress: { ...fresh().progress, ...s.progress }, blindspots: s.blindspots || [] };
    if (!merged.progress.lessons) merged.progress.lessons = {}; // v1 → v2
    merged.v = 2;
    return merged;
  } catch {
    return fresh();
  }
}

let S = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* quota */ } }

export function cardFor(id: string): Card {
  return S.reviews[id] || (S.reviews[id] = emptyCard());
}
export function enrichedFor(id: string): Enriched | undefined { return S.enriched[id]; }
export function setEnriched(id: string, e: Enriched) { S.enriched[id] = e; save(); }
export function stats(): Stats { return S.stats; }

// New stars already introduced today (0 if the day rolled over since the last
// review), and how many of the daily budget remain.
function newIntroducedToday(): number { return S.stats.lastReviewDay === todayStr() ? S.stats.newToday : 0; }
export function newBudgetRemaining(): number { return Math.max(0, DAILY_NEW - newIntroducedToday()); }

// Due reviews first, then new stars, capped (brief: ~20/session). An optional
// id list scopes the queue.
export function dueQueue(cap = 20, ids?: string[], now = Date.now()): Star[] {
  const pool: Star[] = ids ? (ids.map(starById).filter(Boolean) as Star[]) : allStars();
  const due: Star[] = [];
  const fresh: Star[] = [];
  for (const c of pool) {
    const card = S.reviews[c.id];
    if (!card) fresh.push(c);
    else if (isDue(card, now)) due.push(c);
  }
  return [...due, ...fresh.slice(0, newBudgetRemaining())].slice(0, cap);
}
// A session of exactly these stars, regardless of due state or the daily cap —
// used when the learner taps a single star to study it on demand.
export function forcedQueue(ids: string[]): Star[] {
  return ids.map(starById).filter(Boolean) as Star[];
}
export function dueCount(ids?: string[], now = Date.now()): number {
  const pool: Star[] = ids ? (ids.map(starById).filter(Boolean) as Star[]) : allStars();
  let review = 0, freshN = 0;
  for (const c of pool) { const card = S.reviews[c.id]; if (!card) freshN++; else if (isDue(card, now)) review++; }
  return review + Math.min(newBudgetRemaining(), freshN);
}

const STATE_NAME = ['new', 'learning', 'review', 'relearning'] as const;
export type StarState = (typeof STATE_NAME)[number];
export function reviewStateOf(id: string): StarState {
  const c = S.reviews[id];
  return c ? STATE_NAME[c.state] || 'new' : 'new';
}
// "Mastered" = a star in the Review state (graduated out of learning).
export function masteredCount(ids: string[]): number {
  return ids.filter((id) => reviewStateOf(id) === 'review').length;
}
// Lapse-free correct streak for a star (used in Learning statistics).
export function rememberedStreak(id: string): number {
  const c = S.reviews[id];
  return c ? Math.max(0, c.reps - c.lapses) : 0;
}

/* ---------- progression (placement + ship parts) ---------- */

export function progress(): Progress { return S.progress; }
export function setPlacement(level: CEFR | null) { S.progress.placementDone = true; S.progress.placementLevel = level; save(); }

// Mastered vs total cards per CEFR level.
export function masteredByLevel(): Record<CEFR, { mastered: number; total: number }> {
  const out = {} as Record<CEFR, { mastered: number; total: number }>;
  LEVELS.forEach((l) => (out[l] = { mastered: 0, total: 0 }));
  for (const s of allStars()) {
    const o = out[s.cefr];
    o.total++;
    if (reviewStateOf(s.id) === 'review') o.mastered++;
  }
  return out;
}

/* ---------- Lektion progress (gap checks + seals) ---------- */

export type LessonState = 'unchecked' | 'gap' | 'secure' | 'mastered';

export function setGapResult(n: number, score: { correct: number; total: number }, verdict: 'gap' | 'secure') {
  S.progress.lessons[n] = { checked: new Date().toISOString().slice(0, 10), score, verdict };
  save();
}
export function lessonProgress(n: number): LessonProgress | undefined { return S.progress.lessons[n]; }

function lessonStarIds(n: number): string[] {
  const l = lektionByN(n);
  return starsForLesson(n, l ? l.grammarStarIds : []).map((s) => s.id);
}
// A Lektion's seal: earned once most of its stars graduated to Review state.
export function sealThreshold(n: number): number {
  return Math.min(SEAL_CAP, Math.ceil(0.6 * lessonStarIds(n).length));
}
export function lessonState(n: number): LessonState {
  const ids = lessonStarIds(n);
  if (ids.length && masteredCount(ids) >= sealThreshold(n)) return 'mastered';
  return S.progress.lessons[n]?.verdict ?? 'unchecked';
}
export function sealsEarned(): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  for (const l of LEKTIONEN) out[l.n] = lessonState(l.n) === 'mastered';
  return out;
}
export function sealCount(): number { return Object.values(sealsEarned()).filter(Boolean).length; }

// Seed a known card into the Review state (used by the placement flight) without
// touching the daily streak/new-card counters.
export function placementSeed(ids: string[]) {
  for (const id of ids) {
    let card = emptyCard();
    card = schedule(card, 3 as Grade);
    card = schedule(card, 3 as Grade);
    card = schedule(card, 4 as Grade);
    S.reviews[id] = card;
  }
  save();
}

/* ---------- blind spots (recurring miss patterns) ---------- */

export function recordBlindspot(e: BlindspotEvent) { S.blindspots.push(e); save(); }
export function blindspotEvents(): BlindspotEvent[] { return S.blindspots; }

export function applyRating(id: string, rating: Grade) {
  const wasNew = !(id in S.reviews);
  S.reviews[id] = schedule(cardFor(id), rating);
  recordReview();
  if (wasNew) S.stats.newToday++;
  save();
}
export function snapshot(id: string): Card | undefined {
  const c = S.reviews[id];
  return c ? (JSON.parse(JSON.stringify(c)) as Card) : undefined;
}
export function restore(id: string, card: Card | undefined) {
  const wasNew = card === undefined;
  if (card) { reviveCard(card); S.reviews[id] = card; } else { delete S.reviews[id]; }
  S.stats.reviewedToday = Math.max(0, S.stats.reviewedToday - 1);
  S.stats.totalReviews = Math.max(0, S.stats.totalReviews - 1);
  if (wasNew) S.stats.newToday = Math.max(0, S.stats.newToday - 1);
  save();
}

function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function recordReview() {
  const t = todayStr();
  const st = S.stats;
  if (st.lastReviewDay !== t) {
    if (st.lastReviewDay) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      st.streak = st.lastReviewDay === y.toISOString().slice(0, 10) ? st.streak + 1 : 1;
    } else st.streak = 1;
    st.reviewedToday = 0;
    st.newToday = 0;
    st.lastReviewDay = t;
  }
  st.reviewedToday++;
  st.totalReviews++;
}
