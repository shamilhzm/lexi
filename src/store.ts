// Local-first store: FSRS card state per word, persisted to localStorage.
// Exposes a tiny pub/sub so React can subscribe via useSyncExternalStore.
// Adds a CEFR level filter and group/sector/all scoped stats + sessions.
import { WORDS, WORDS_BY_SECTOR, SECTORS, SECTOR_GROUP, SECTOR_FINEGROUP, GROUP_SECTORS, BY_ID, registerWords, USER_WORDS_KEY } from './data/index.ts';
import { byFrequency } from './lib/freq.ts';
import { ID_MAP } from './data/idmap.ts';
import { emptyCard, schedule, reviveCard, isDue, setRetention, State, Rating, type Card, type Grade } from './srs.ts';
import { idbGet, idbSet } from './lib/idb.ts';
import type { Word, GroupStat, SectorStat, Target, CEFR } from './types.ts';
import { ALL_LEVELS } from './types.ts';

const CARDS_KEY = 'lexi.cards.v1';
const VISITS_KEY = 'lexi.visits.v1';
const MISS_KEY = 'lexi.miss.v1';
const LEVELS_KEY = 'lexi.levels.v1';
const NEW_PER_DAY = 24;
const MIN_DAILY = 20; // streak-safe minimum items in a daily briefing
const PACE_KEY = 'lexi.pace.v1';
// After a gap, FSRS marks *everything* overdue at once; serving it all in one
// briefing ("312 cards queued") is the classic SRS rage-quit moment. Cap the
// day at the oldest-due slice — FSRS tolerates the extra delay by design — and
// report the true backlog so Today can frame it honestly (UX-PATHS F2).
const DAILY_DUE_CAP = 60;

// ---- daily pace ----------------------------------------------------------
// The two caps above are good defaults and were also a ceiling: a learner with an
// exam in three weeks could not ask for more work, and one coming back from a
// long gap could not ask for less. FSRS does not care — it tolerates delay by
// design and a bigger new-card budget only front-loads what it would schedule
// anyway — so this is a preference, not a scheduling parameter.
export type Pace = 'gentle' | 'steady' | 'intense';
/** New cards per day, and how much of the due backlog one day serves. */
export const PACE: Record<Pace, { fresh: number; due: number; label: string }> = {
  gentle:  { fresh: 10, due: 30,  label: 'Gentle' },
  steady:  { fresh: NEW_PER_DAY, due: DAILY_DUE_CAP, label: 'Steady' },
  intense: { fresh: 50, due: 150, label: 'Intense' },
};
export function pace(): Pace {
  const v = localStorage.getItem(PACE_KEY);
  return v === 'gentle' || v === 'intense' ? v : 'steady';
}
export function setPace(p: Pace) {
  try { localStorage.setItem(PACE_KEY, p); } catch { /* */ }
  emit();
}

// ---- persistence ---------------------------------------------------------
// Progress state — FSRS cards, blind-spot misses, and visit days — lives in
// IndexedDB (src/lib/idb.ts), held in memory here as the synchronous source of
// truth and written through on change. hydrate() loads it once before first
// render, migrating any pre-existing localStorage data on first run. Settings
// (levels, theme, retention, …) stay in localStorage: they're tiny and some are
// read pre-paint by the theme bootstrap in index.html.
const live = new Map<string, Card>();
let misses: MissEvent[] = [];
let visits: string[] = [];

let version = 0;
const listeners = new Set<() => void>();
function emit() { version++; listeners.forEach((l) => l()); }
/** Tell every subscriber the lexicon itself changed — not a card's schedule but
 *  the card data. `data/detail.ts` calls this after attaching examples and
 *  definitions, so surfaces that rendered without them re-render with them. */
export function notifyLexiconChanged() { emit(); }

function cardsObject(): Record<string, Card> {
  const obj: Record<string, Card> = {};
  live.forEach((c, id) => (obj[id] = c));
  return obj;
}
// Writing progress is debounced, because `cardsObject()` copies the ENTIRE card
// map and `review()` fires on every grade. That is fine at 200 cards and not fine
// later: a mature learner holds a card per word plus a `gym:<mode>:<wordId>` card
// per eligible drill mode (seven of them) plus `gex:` exercises — tens of
// thousands of entries, rebuilt and structured-cloned once per keystroke, on a
// phone, mid-session.
//
// The trailing window is short enough that a normal grade-to-grade gap still
// writes, and the flush handlers below guarantee the one case that actually
// matters — the learner leaving — is never lost. `live` stays the synchronous
// source of truth throughout, so nothing reads a stale value in the meantime.
const PERSIST_DEBOUNCE_MS = 400;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function flushCards() {
  if (persistTimer !== null) { clearTimeout(persistTimer); persistTimer = null; }
  idbSet(CARDS_KEY, cardsObject());
}

function persistCards() {
  if (persistTimer !== null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => { persistTimer = null; idbSet(CARDS_KEY, cardsObject()); }, PERSIST_DEBOUNCE_MS);
}

// Backgrounding a tab on mobile can be the last code that runs before the page is
// discarded, so a pending write has to land here. `visibilitychange` is the
// reliable one; `pagehide` covers the bfcache path. Guarded for the Node test env.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushCards(); });
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushCards);
}
function persistMisses() { idbSet(MISS_KEY, misses); }
function persistVisits() { idbSet(VISITS_KEY, visits); }

export function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function getVersion() { return version; }

/** Load one key from IndexedDB, migrating a legacy localStorage value on first
 *  run (then dropping the localStorage copy so IDB becomes the single source). */
async function loadKV<T>(key: string, fallback: T): Promise<T> {
  const fromIdb = await idbGet<T>(key);
  if (fromIdb !== undefined) return fromIdb;
  try {
    const legacy = localStorage.getItem(key);
    if (legacy != null) {
      const parsed = JSON.parse(legacy) as T;
      await idbSet(key, parsed);
      localStorage.removeItem(key);
      return parsed;
    }
  } catch { /* corrupt legacy — ignore */ }
  return fallback;
}

/** Carry stored schedules across a corpus correction that renamed or merged
 *  card ids (see scripts/corpus/casefix.ts). Without this, fixing a headword
 *  would silently reset that card to new. Where both ids carry a schedule the
 *  more-practised one wins. Runs on every hydrate and is a no-op once the old
 *  ids are gone. */
function migrateIds(): void {
  let moved = 0;
  for (const [from, to] of Object.entries(ID_MAP)) {
    const old = live.get(from);
    if (!old) continue;
    live.delete(from);
    const cur = live.get(to);
    if (!cur || old.reps > cur.reps) live.set(to, old);
    moved++;
  }
  if (moved) persistCards();
}

let hydrated = false;
/** Hydrate progress state from IndexedDB (with one-time localStorage migration).
 *  Call once, awaited, before the app first renders. Idempotent. */
export async function hydrate(): Promise<void> {
  if (hydrated) return;
  const [cards, m, vis] = await Promise.all([
    loadKV<Record<string, any>>(CARDS_KEY, {}),
    loadKV<MissEvent[]>(MISS_KEY, []),
    loadKV<string[]>(VISITS_KEY, []),
  ]);
  live.clear();
  for (const id of Object.keys(cards)) { try { live.set(id, reviveCard(cards[id])); } catch { /* skip corrupt */ } }
  migrateIds();
  misses = Array.isArray(m) ? m : [];
  visits = Array.isArray(vis) ? vis : [];
  hydrated = true;
}

// ---- CEFR level filter ---------------------------------------------------
function loadLevels(): Set<CEFR> {
  try {
    const a = JSON.parse(localStorage.getItem(LEVELS_KEY) || 'null');
    if (Array.isArray(a) && a.length) return new Set(a as CEFR[]);
  } catch { /* */ }
  return new Set(ALL_LEVELS);
}
let levelFilter = loadLevels();
export function levels(): Set<CEFR> { return levelFilter; }
export function toggleLevel(l: CEFR) {
  const next = new Set(levelFilter);
  if (next.has(l)) next.delete(l); else next.add(l);
  if (next.size === 0) return; // never empty
  setLevels(next);
}
/** Replace the whole CEFR filter (ignored if empty). */
export function setLevels(next: Set<CEFR>) {
  if (next.size === 0) return;
  levelFilter = next;
  try { localStorage.setItem(LEVELS_KEY, JSON.stringify([...next])); } catch { /* */ }
  emit();
}
const inLevels = (w: Word) => levelFilter.has(w.level);

// ---- card status ---------------------------------------------------------
export type Status = 'new' | 'learning' | 'known';
export function statusOf(id: string): Status {
  const c = live.get(id);
  if (!c || c.state === State.New) return 'new';
  if (c.state === State.Review) return 'known';
  return 'learning';
}
export function cardOf(id: string): Card | undefined { return live.get(id); }

export function review(id: string, grade: Grade) {
  const cur = live.get(id) ?? emptyCard();
  live.set(id, schedule(cur, grade));
  recordVisit();
  bumpReviewLog(grade);
  persistCards();
  emit();
}

/** Undo a review: restore the card's prior FSRS state, or remove it if it was
 *  never seen before (returns to 'new'). Powers the session's prev/undo control.
 *
 *  `wasAgain` reverses the review-log entry the undone grade wrote. Without it
 *  the FSRS card and the session counters rewound exactly while the log kept the
 *  review, so an undo still fed `reviewedToday()` (the streak-at-risk banner),
 *  the Stats reviews/day panel and the recall percentage. Small numbers, but
 *  this app's whole argument is that its numbers are honest. */
export function restoreCard(id: string, snap: Card | undefined, wasAgain = false) {
  if (snap) live.set(id, snap); else live.delete(id);
  unbumpReviewLog(wasAgain);
  persistCards();
  emit();
}

// ---- pools & sessions ----------------------------------------------------
function poolFor(target: Target): Word[] {
  let pool: Word[];
  if (target.kind === 'custom') {
    // Explicit id list (briefing / mining). Preserve given order; honour levels.
    pool = target.ids.map((id) => BY_ID.get(id)).filter((w): w is Word => !!w);
    return pool.filter(inLevels);
  }
  if (target.kind === 'sector') pool = WORDS_BY_SECTOR.get(target.name) ?? [];
  else if (target.kind === 'group') pool = WORDS.filter((w) => SECTOR_GROUP.get(w.field) === target.name);
  else pool = WORDS;
  return pool.filter(inLevels);
}

/** Build a study queue: due reviews first (oldest due), then fresh cards. */
export function buildSession(target: Target, maxNew = PACE[pace()].fresh): Word[] {
  const pool = poolFor(target);
  const now = Date.now();
  const dueReview: { w: Word; due: number }[] = [];
  const fresh: Word[] = [];
  for (const w of pool) {
    const c = live.get(w.id);
    if (!c || c.state === State.New) { fresh.push(w); continue; }
    if (isDue(c, now)) dueReview.push({ w, due: new Date(c.due).getTime() });
  }
  dueReview.sort((a, b) => a.due - b.due);
  // Custom sessions are pre-curated — play them whole, in order.
  if (target.kind === 'custom') return pool;
  const cap = target.kind === 'all' ? maxNew : maxNew * 2;
  return [...dueReview.map((d) => d.w), ...fresh.slice(0, cap)];
}

// ---- daily briefing ------------------------------------------------------
export interface Briefing {
  ids: string[];        // the assembled queue (due first, then fresh)
  due: number;          // count of due reviews included (≤ DAILY_DUE_CAP)
  dueTotal: number;     // all due reviews in scope — the honest backlog number
  fresh: number;        // count of new cards included
  weakSectors: string[];// sectors the fresh cards were drawn from
}

/**
 * Sectors with the most room to grow: lowest coverage first, then most due.
 * This is the source of fresh *vocabulary* for the daily briefing. It is
 * deliberately kept distinct from blind spots: weakest-sectors chooses which new
 * words enter the day; blind spots (session.ts) choose which *drills* ride along.
 * The two don't overlap, so both stay.
 */
export function weakestSectors(n = 4): SectorStat[] {
  const ranked = sectorStats()
    .filter((s) => s.newCount > 0 || s.due > 0)
    .sort((a, b) => (a.coverage - b.coverage) || (b.due - a.due));
  // Personalization: if the learner picked interest topics at onboarding, float
  // sectors in those fine groups to the front. The sort is stable, so coverage
  // order is preserved within each band, and non-interest sectors still follow —
  // the queue never starves once a topic runs dry. No-op when nothing is picked.
  const picks = interests();
  if (picks.size) {
    const wanted = (s: SectorStat) => picks.has(SECTOR_FINEGROUP.get(s.name) ?? '');
    ranked.sort((a, b) => Number(wanted(b)) - Number(wanted(a)));
  }
  return ranked.slice(0, n);
}

/**
 * Assemble the "markets open" session: every due review, topped up with fresh
 * cards from the weakest sectors to a streak-safe minimum (capped per day).
 */
export function buildBriefing(): Briefing {
  const now = Date.now();
  const inScope = WORDS.filter(inLevels);
  const dueReview: { id: string; due: number }[] = [];
  for (const w of inScope) {
    const c = live.get(w.id);
    if (!c || c.state === State.New) continue;
    if (isDue(c, now)) dueReview.push({ id: w.id, due: new Date(c.due).getTime() });
  }
  dueReview.sort((a, b) => a.due - b.due);
  // Oldest-first slice of the backlog; the rest waits for tomorrow's briefing.
  const served = dueReview.slice(0, PACE[pace()].due);

  const want = Math.min(PACE[pace()].fresh, Math.max(0, MIN_DAILY - served.length));
  const freshIds: string[] = [];
  const weak: string[] = [];
  for (const s of weakestSectors(6)) {
    if (freshIds.length >= want) break;
    const newCards = (WORDS_BY_SECTOR.get(s.name) ?? [])
      .filter((w) => inLevels(w) && statusOf(w.id) === 'new')
      // Within a sector, teach the commonest words first. Same reasoning as
      // firstRunIds: the sector and the level are both coarse, and this is the one
      // ordering signal that says which of two equally-eligible A2 nouns the
      // learner is more likely to meet tomorrow. Stable, so unranked cards keep
      // corpus order behind the ranked ones.
      .sort((a, b) => (ALL_LEVELS.indexOf(a.level) - ALL_LEVELS.indexOf(b.level)) || byFrequency(a, b));
    if (newCards.length === 0) continue;
    weak.push(s.name);
    for (const w of newCards) {
      if (freshIds.length >= want) break;
      freshIds.push(w.id);
    }
  }
  return {
    ids: [...served.map((d) => d.id), ...freshIds],
    due: served.length,
    dueTotal: dueReview.length,
    fresh: freshIds.length,
    weakSectors: weak,
  };
}

/** Words in a target's scope (level-filtered). */
export function wordsFor(target: Target): Word[] { return poolFor(target); }

/** Ids of due word-drill cards (gym:<mode>:<wordId>). */
/** Drill modes the learner has ever actually attempted.
 *
 *  Not "has a card scheduled" but "has answered one": a drill mode is met the first
 *  time it is graded, and until then the learner has never been told what it tests.
 *  The session builder uses this to teach before it tests — see `teach` in
 *  session.ts. One pass over the card map, called once per session build. */
export function practisedModes(): Set<string> {
  const out = new Set<string>();
  live.forEach((_c, id) => {
    if (!id.startsWith('gym:')) return;
    const mode = id.split(':')[1];
    if (mode) out.add(mode);
  });
  return out;
}

export function dueGymIds(): string[] {
  const now = Date.now();
  const out: string[] = [];
  live.forEach((c, id) => {
    if (id.startsWith('gym:') && c.state !== State.New && isDue(c, now)) out.push(id);
  });
  return out;
}

/** Due drill cards across the Gym's own SRS tracks (gym:* word drills, gex:* grammar exercises). */
export function gymDue(): number {
  const now = Date.now();
  let n = 0;
  live.forEach((c, id) => {
    if ((id.startsWith('gym:') || id.startsWith('gex:')) && c.state !== State.New && isDue(c, now)) n++;
  });
  return n;
}

// ---- daily snapshots (market deltas) --------------------------------------
// ---- what the learner last *saw* ------------------------------------------
// Distinct from the daily snapshot above, which is a once-per-day historical
// record. This is "the state of the map the last time you looked at it", so a
// return visit can animate from there to now — the data-change rule in
// DESIGN.md §7. Studying is the only thing that moves these numbers, so the
// movement is always earned.
//
// Deliberately *not* in SETTING_KEYS: it is ephemeral view state, and restoring
// a months-old "last seen" from a backup would animate a wild, meaningless jump.
const SEEN_KEY = 'lexi.mapseen.v1';
export interface SeenState { known: number; groups: Record<string, number> }
export function lastSeen(): SeenState | null {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null');
    if (v && typeof v.known === 'number' && v.groups && typeof v.groups === 'object') return v as SeenState;
  } catch { /* corrupt — treat as first visit */ }
  return null;
}
/** Record the map as it stands now. Call *after* a paint that used the old
 *  values, or the animation has nothing to travel from. */
export function markSeen(known: number, groups: Record<string, number>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify({ known, groups })); } catch { /* quota */ }
}

const SNAP_KEY = 'lexi.snap.v1';
interface Snapshot { date: string; groups: Record<string, number>; known?: number; }
function loadSnaps(): Snapshot[] {
  try { const a = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}
/** Record today's learned count per theme group (unfiltered), once per day. */
export function recordSnapshot() {
  const snaps = loadSnaps();
  const t = todayKey();
  if (snaps.some((s) => s.date === t)) return;
  const groups: Record<string, number> = {};
  let known = 0; // daily Known total — the goal line's pace source
  for (const w of WORDS) {
    const st = statusOf(w.id);
    if (st === 'known') known++;
    if (st === 'new') continue;
    const g = SECTOR_GROUP.get(w.field);
    if (g) groups[g] = (groups[g] ?? 0) + 1;
  }
  snaps.push({ date: t, groups, known });
  while (snaps.length > 60) snaps.shift();
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(snaps)); } catch { /* quota */ }
}
/** Words learned per group since the snapshot closest to `days` ago. null = no history yet. */
export function groupDeltas(days = 7): Map<string, number> | null {
  const snaps = loadSnaps();
  const t = todayKey();
  const past = snaps.filter((s) => s.date < t);
  if (past.length === 0) return null;
  const cutoff = todayKey(new Date(Date.now() - days * 86_400_000));
  const base = past.find((s) => s.date >= cutoff) ?? past[past.length - 1];
  const cur: Record<string, number> = {};
  for (const w of WORDS) {
    if (statusOf(w.id) === 'new') continue;
    const g = SECTOR_GROUP.get(w.field);
    if (g) cur[g] = (cur[g] ?? 0) + 1;
  }
  const out = new Map<string, number>();
  for (const g of new Set([...Object.keys(cur), ...Object.keys(base.groups)])) {
    out.set(g, (cur[g] ?? 0) - (base.groups[g] ?? 0));
  }
  return out;
}

// ---- stats: review log, due forecast, Known history ------------------------
// The terminal earns its terminal screen. All three are cheap reads over data
// the store already owns; the review log is the one new write (per grade).
const REVIEWLOG_KEY = 'lexi.reviewlog.v1';
export type ReviewLog = Record<string, { n: number; again: number }>; // date → counts
export function reviewLog(): ReviewLog {
  try {
    const v = JSON.parse(localStorage.getItem(REVIEWLOG_KEY) || '{}');
    return v && typeof v === 'object' ? (v as ReviewLog) : {};
  } catch { return {}; }
}
function bumpReviewLog(grade: Grade) {
  const log = reviewLog();
  const t = todayKey();
  const d = log[t] ?? { n: 0, again: 0 };
  d.n++;
  if (grade === Rating.Again) d.again++;
  log[t] = d;
  const keys = Object.keys(log).sort();
  while (keys.length > 60) delete log[keys.shift()!]; // keep ~2 months
  try { localStorage.setItem(REVIEWLOG_KEY, JSON.stringify(log)); } catch { /* quota */ }
}

/** Reverse one logged review (see `restoreCard`). Never drops below zero, and
 *  removes the day's entry entirely when it empties, so an undone-to-nothing day
 *  reads as unstudied rather than as a studied day with no reviews. */
function unbumpReviewLog(wasAgain: boolean) {
  const log = reviewLog();
  const t = todayKey();
  const d = log[t];
  if (!d) return;
  d.n = Math.max(0, d.n - 1);
  if (wasAgain) d.again = Math.max(0, d.again - 1);
  if (d.n === 0) delete log[t]; else log[t] = d;
  try { localStorage.setItem(REVIEWLOG_KEY, JSON.stringify(log)); } catch { /* quota */ }
}

/** Scheduled cards due per day for the next `days` days; index 0 = overdue + today. */
export function dueForecast(days = 7): number[] {
  const out = new Array<number>(days).fill(0);
  // Local midnight: this bucket boundary is compared against real `due`
  // timestamps, so it has to be the learner's midnight or every card lands in
  // the wrong column by up to a day.
  const start = dayStart(todayKey());
  live.forEach((c) => {
    if (c.state === State.New) return;
    const idx = Math.floor((new Date(c.due).getTime() - start) / 86_400_000);
    if (idx < 0) out[0]++; else if (idx < days) out[idx]++;
  });
  return out;
}

/** Daily Known totals from the snapshots (sparse until history accrues),
 *  with today's live value appended so the curve always ends at now. */
export function knownHistory(): { date: string; known: number }[] {
  const hist = loadSnaps()
    .filter((s): s is Snapshot & { known: number } => typeof s.known === 'number' && s.date < todayKey())
    .map((s) => ({ date: s.date, known: s.known }));
  let today = 0;
  for (const w of WORDS) if (statusOf(w.id) === 'known') today++;
  return [...hist, { date: todayKey(), known: today }];
}

// ---- goal line ------------------------------------------------------------
// One clear target (level + date). Today renders it as a single pace sentence:
// "B1 by Oct 4 — 61% known · on pace for ~87%". The projection is arithmetic
// on data the store already has: the daily Known snapshots above provide the
// rate; no new tracking, no gamification, just the honest trajectory.
const GOAL_KEY = 'lexi.goal.v1';
export interface Goal { level: CEFR; date: string; } // date = YYYY-MM-DD
export function goal(): Goal | null {
  try {
    const g = JSON.parse(localStorage.getItem(GOAL_KEY) || 'null');
    if (g && (ALL_LEVELS as string[]).includes(g.level) && /^\d{4}-\d{2}-\d{2}$/.test(g.date)) return g as Goal;
  } catch { /* */ }
  return null;
}
export function setGoal(g: Goal | null) {
  try {
    if (g) localStorage.setItem(GOAL_KEY, JSON.stringify(g)); else localStorage.removeItem(GOAL_KEY);
  } catch { /* quota */ }
  emit();
}

export interface GoalProgress {
  goal: Goal;
  known: number; count: number; pct: number; // scope = every card A1..target level
  daysLeft: number;
  projectedPct: number | null; // null until ≥1 day of snapshot history exists
}
export function goalProgress(): GoalProgress | null {
  const g = goal();
  if (!g) return null;
  const upto = new Set(ALL_LEVELS.slice(0, ALL_LEVELS.indexOf(g.level) + 1));
  let known = 0, count = 0;
  for (const w of WORDS) {
    if (!upto.has(w.level)) continue;
    count++;
    if (statusOf(w.id) === 'known') known++;
  }
  const pct = count ? Math.round((known / count) * 100) : 0;
  const day = 86_400_000;
  const daysLeft = Math.max(0, Math.round((new Date(g.date + 'T00:00:00Z').getTime() - new Date(todayKey() + 'T00:00:00Z').getTime()) / day));
  // Pace: Known growth per day since the oldest snapshot in the last 14 days
  // that recorded a Known total (older history is a stale predictor).
  let projectedPct: number | null = null;
  const cutoff = todayKey(new Date(Date.now() - 14 * day));
  const base = loadSnaps().find((s) => typeof s.known === 'number' && s.date >= cutoff && s.date < todayKey());
  if (base && count) {
    const span = Math.round((new Date(todayKey() + 'T00:00:00Z').getTime() - new Date(base.date + 'T00:00:00Z').getTime()) / day);
    if (span > 0) {
      const rate = (known - (base.known as number)) / span; // may be negative — honest
      projectedPct = Math.max(0, Math.min(100, Math.round(((known + rate * daysLeft) / count) * 100)));
    }
  }
  return { goal: g, known, count, pct, daysLeft, projectedPct };
}

// ---- user words (mined / enriched) ---------------------------------------
function persistUserWords() {
  const mine = WORDS.filter((w) => w.id.startsWith('usr:'));
  try { localStorage.setItem(USER_WORDS_KEY, JSON.stringify(mine)); } catch { /* quota */ }
}

/** Add learner-supplied words to the lexicon, persist them, and notify. */
export function addUserWords(words: Word[]): Word[] {
  const added = registerWords(words);
  if (added.length) { persistUserWords(); emit(); }
  return added;
}

// ---- blind spots (structural error log) ----------------------------------
// The `misses` array + its persistence live in the persistence section above
// (hydrated from IndexedDB); MISS_KEY sits with the other storage keys up top.
export interface MissEvent {
  tag: string;
  at: number;
  /** The word this miss happened on, where the drill had one. Optional because
   *  grammar-point misses are about a system, not a word — and because it was
   *  added later, so older logs simply don't carry it. */
  term?: string;
}
/** Record a wrong answer under a structural tag (grammar point, drill type…),
 *  optionally naming the word it happened on.
 *
 *  The tag alone answers "which system do I keep getting wrong"; it cannot answer
 *  "which words". A learner who misses `nehmen` eight times and every other verb
 *  once saw one row reading "Verb conjugation 15×", which is true and unactionable
 *  — the fix is to drill `nehmen`, and the log knew that all along and dropped it. */
export function logMiss(tag: string, term?: string) {
  misses.push({ tag, at: Date.now(), ...(term ? { term } : {}) });
  if (misses.length > 800) misses = misses.slice(-800);
  persistMisses();
  emit();
}
export interface MissStat {
  tag: string;
  count: number;
  last: number;
  /** The words this weakness actually happened on, worst first. Empty for
   *  grammar points and for logs recorded before misses carried a word. */
  terms: { term: string; count: number }[];
}
/** Top recurring weaknesses within the last `days`, most frequent first. */
export function missStats(days = 30): MissStat[] {
  const since = Date.now() - days * 86_400_000;
  const m = new Map<string, { count: number; last: number; terms: Map<string, number> }>();
  for (const e of misses) {
    if (e.at < since) continue;
    const cur = m.get(e.tag) ?? { count: 0, last: 0, terms: new Map<string, number>() };
    cur.count++; cur.last = Math.max(cur.last, e.at);
    if (e.term) cur.terms.set(e.term, (cur.terms.get(e.term) ?? 0) + 1);
    m.set(e.tag, cur);
  }
  return [...m.entries()]
    .map(([tag, v]) => ({
      tag, count: v.count, last: v.last,
      terms: [...v.terms.entries()].map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term)),
    }))
    .sort((a, b) => b.count - a.count);
}
export function missTotal(days = 30): number { return missStats(days).reduce((a, s) => a + s.count, 0); }

// ---- flagged cards (learner feedback loop) --------------------------------
// A solo-maintained corpus lives or dies by error reports. Flagging is local,
// deduped, capped, and rides the backup export (FLAGS_KEY is in SETTING_KEYS),
// so a friend's flags reach the maintainer with their backup file.
const FLAGS_KEY = 'lexi.flags.v1';
export interface FlagEvent { id: string; term: string; at: number; }
export function flags(): FlagEvent[] {
  try { const a = JSON.parse(localStorage.getItem(FLAGS_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}
export function isFlagged(id: string): boolean { return flags().some((f) => f.id === id); }
/** Flag a card as suspect (wrong gloss/gender/plural/example…). Idempotent. */
export function flagCard(id: string, term: string) {
  const cur = flags();
  if (cur.some((f) => f.id === id)) return;
  cur.push({ id, term, at: Date.now() });
  try { localStorage.setItem(FLAGS_KEY, JSON.stringify(cur.slice(-200))); } catch { /* quota */ }
  emit();
}
/** The flags alone, as a file small enough to send.
 *
 *  Flags have always ridden the full backup, which closes the loop for a solo
 *  maintainer and not for a class (persona C2 #53): reporting one bad card meant
 *  sending your entire progress history to your teacher. This carries the reports
 *  and nothing else — no schedule, no streak, no visit log. `corpus:flags` reads
 *  it alongside backups. */
export function exportFlags(): string {
  return JSON.stringify({ app: 'lexi-flags', v: 1, exportedAt: new Date().toISOString(), flags: flags() }, null, 2);
}

/** Withdraw a flag. Flagging is one tap and so is mistyping it — without this the
 *  list is a place things only ever accumulate, which is why nobody opens it. */
export function unflagCard(id: string) {
  const next = flags().filter((f) => f.id !== id);
  try { localStorage.setItem(FLAGS_KEY, JSON.stringify(next)); } catch { /* quota */ }
  emit();
}

// ---- text size -------------------------------------------------------------
// The whole type ramp is rem-based, so scaling the root scales everything.
// Default (1) leaves <html> untouched so the browser/OS preference (incl. iOS
// Dynamic Type via -apple-system-body) governs; an explicit choice overrides.
const TEXTSCALE_KEY = 'lexi.textscale.v1';
export function textScale(): number {
  const v = parseFloat(localStorage.getItem(TEXTSCALE_KEY) || '1');
  return v >= 0.85 && v <= 1.3 ? v : 1;
}
export function applyTextScale(scale = textScale()) {
  document.documentElement.style.fontSize = scale === 1 ? '' : `${scale * 100}%`;
}
export function setTextScale(scale: number) {
  try {
    if (scale === 1) localStorage.removeItem(TEXTSCALE_KEY);
    else localStorage.setItem(TEXTSCALE_KEY, String(scale));
  } catch { /* quota */ }
  applyTextScale(scale);
  emit();
}

// ---- sound (the feel layer; on by default) ---------------------------------
// Tri-state on purpose. The key used to mean "1 = the learner opted in", with
// absent = off; now absent means "hasn't chosen", which defaults to on. Opting
// out therefore has to be stored explicitly as '0' rather than by deleting the
// key — deleting it would silently re-enable sound on the next visit.
const SOUND_KEY = 'lexi.sound.v1';
export function sound(): boolean { return localStorage.getItem(SOUND_KEY) !== '0'; }
export function setSound(on: boolean) {
  localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  emit();
}

// ---- daily reminder (the habit anchor) -----------------------------------
// A time of day, not a notification schedule. Local-first means there is no
// server to push from, so this drives three things that don't need one: the
// streak-risk banner on Home, a local notification while the app is open or
// installed, and a downloadable .ics the learner's real calendar owns — the
// only one of the three that reaches them on iOS with the app closed.
const REMINDER_KEY = 'lexi.reminder.v1';
/** "HH:MM" (24h, local) or null when the learner hasn't set one. */
export function reminderTime(): string | null {
  const v = localStorage.getItem(REMINDER_KEY);
  return v && /^\d{2}:\d{2}$/.test(v) ? v : null;
}
export function setReminderTime(t: string | null) {
  if (t) localStorage.setItem(REMINDER_KEY, t); else localStorage.removeItem(REMINDER_KEY);
  emit();
}

// ---- HD voice (Piper Thorsten, in-browser) -------------------------------
const HDVOICE_KEY = 'lexi.hdvoice.v1';
// Whether the in-context offer has already been made. Once, ever: a learner who
// said no meant it, and an app that keeps asking is the reason people stop reading
// its banners at all.
const HDOFFER_KEY = 'lexi.hdoffer.v1';
export function hdOffered(): boolean { return localStorage.getItem(HDOFFER_KEY) === '1'; }
export function markHdOffered() {
  try { localStorage.setItem(HDOFFER_KEY, '1'); } catch { /* quota */ }
  emit();
}

export function hdVoice(): boolean { return localStorage.getItem(HDVOICE_KEY) === '1'; }
export function setHdVoice(on: boolean) {
  if (on) localStorage.setItem(HDVOICE_KEY, '1'); else localStorage.removeItem(HDVOICE_KEY);
  emit();
}

// ---- FSRS desired retention ----------------------------------------------
// The target probability of recall FSRS schedules for. Higher = shorter
// intervals, more reviews, higher recall; lower = fewer reviews. 0.90 is the
// accepted sweet spot. Persisted here; applied to the scheduler engine.
const RETENTION_KEY = 'lexi.retention.v1';
export const DEFAULT_RETENTION = 0.9;
export function retention(): number {
  const v = parseFloat(localStorage.getItem(RETENTION_KEY) || '');
  return v >= 0.7 && v <= 0.97 ? v : DEFAULT_RETENTION;
}
export function setRetentionTarget(r: number) {
  localStorage.setItem(RETENTION_KEY, String(r));
  setRetention(r);
  emit();
}
// Apply the stored target to the engine at startup.
setRetention(retention());

// ---- stats ---------------------------------------------------------------
interface Counts { count: number; learned: number; known: number; due: number; newCount: number; }
function countsFor(words: Word[]): Counts {
  const now = Date.now();
  let learned = 0, known = 0, due = 0, newCount = 0;
  for (const w of words) {
    const c = live.get(w.id);
    if (!c || c.state === State.New) { newCount++; continue; }
    learned++;
    if (c.state === State.Review) known++;
    if (isDue(c, now)) due++;
  }
  return { count: words.length, learned, known, due, newCount };
}

export function groupStats(): GroupStat[] {
  const out: GroupStat[] = [];
  for (const group of GROUP_SECTORS.keys()) {
    const words = WORDS.filter((w) => SECTOR_GROUP.get(w.field) === group && inLevels(w));
    if (words.length === 0) continue;
    const c = countsFor(words);
    const sectors = new Set(words.map((w) => w.field)).size;
    out.push({ name: group, ...c, coverage: c.count ? c.learned / c.count : 0, sectors });
  }
  return out.sort((a, b) => b.count - a.count);
}

export function sectorStats(group?: string): SectorStat[] {
  return SECTORS
    .filter((s) => !group || s.group === group)
    .map((s) => {
      const words = (WORDS_BY_SECTOR.get(s.name) ?? []).filter(inLevels);
      const c = countsFor(words);
      return { name: s.name, group: s.group, levels: s.levels, ...c,
        coverage: c.count ? c.learned / c.count : 0 };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function totals(): Counts & { coverage: number } {
  const c = countsFor(WORDS.filter(inLevels));
  return { ...c, coverage: c.count ? c.learned / c.count : 0 };
}

/** Per-CEFR-level progress across the WHOLE lexicon (ignores the active filter). */
export interface LevelStat extends Counts { level: CEFR; coverage: number; }
export function levelStats(): LevelStat[] {
  return ALL_LEVELS.map((level) => {
    const c = countsFor(WORDS.filter((w) => w.level === level));
    return { level, ...c, coverage: c.count ? c.learned / c.count : 0 };
  });
}

// ---- grammar points ------------------------------------------------------
// Progress through one authored grammar point, over the FSRS cards its
// exercises are scheduled under (`gex:<level>:<pointIndex>:<exerciseIndex>` —
// the ids flatten() mints in lib/grammar.ts). Deliberately takes the exercise
// *count* rather than the point object, so the store stays independent of the
// grammar bank's shape and doesn't have to wait on its fetch.
export interface PointStat {
  count: number;      // exercises in the point
  seen: number;       // exercises answered at least once
  known: number;      // exercises in FSRS Review state
  due: number;        // exercises due right now
  mastery: number;    // known / count, 0..1
  started: boolean;
  /** Met through the session's vocabulary→grammar loop rather than by drilling
   *  it here — the concept's own card has been graded, its exercises haven't. */
  metInSession: boolean;
}
/** Progress on one grammar point.
 *
 *  A concept can be met two ways, and for a long time only one of them counted.
 *  Drilling it in the Library grades `gex:<level>:<point>:<exercise>` cards, one
 *  per exercise. But the session's vocabulary→grammar loop — learn *obwohl*, get
 *  the Konzessivsätze card a few items later — grades the point's own
 *  `gram:<level>:<title>` card instead. Two namespaces that never met, so a
 *  learner forty days in, who had seen a dozen concepts arrive mid-session,
 *  still read **0/40 started**. The loop taught the concept and the Library
 *  denied it had happened.
 *
 *  `title` is optional so the older three-argument calls (and their tests) keep
 *  working; without it the card half is simply skipped. */
export function pointStats(level: CEFR, pointIndex: number, exerciseCount: number, title?: string): PointStat {
  const now = Date.now();
  let seen = 0, known = 0, due = 0;
  for (let xi = 0; xi < exerciseCount; xi++) {
    const c = live.get(`gex:${level}:${pointIndex}:${xi}`);
    if (!c) continue;
    seen++;
    if (c.state === State.Review) known++;
    if (isDue(c, now)) due++;
  }
  // The concept's own card, as the session grades it.
  const card = title ? live.get(`gram:${level}:${title}`) : undefined;
  return {
    count: exerciseCount, seen, known, due,
    // Mastery stays a measure of the *exercises*: meeting a concept once in a
    // session is not the same as having drilled it, and inflating this number
    // would make the Library lie in the other direction.
    mastery: exerciseCount ? known / exerciseCount : 0,
    started: seen > 0 || !!card,
    metInSession: !!card && seen === 0,
  };
}

// ---- placement -----------------------------------------------------------
const PLACEMENT_KEY = 'lexi.placement.v1';
export function placementLevel(): CEFR | null {
  const v = localStorage.getItem(PLACEMENT_KEY);
  return (v && (ALL_LEVELS as string[]).includes(v)) ? (v as CEFR) : null;
}
export function setPlacementLevel(l: CEFR | null) {
  if (l) localStorage.setItem(PLACEMENT_KEY, l); else localStorage.removeItem(PLACEMENT_KEY);
  emit();
}

// ---- profile -------------------------------------------------------------
// A light local profile: an editable display name (the CEFR level + streak come
// from placement/visits). Built implicitly at onboarding; editable in Profile.
const PROFILE_NAME_KEY = 'lexi.profile.name.v1';
export function profileName(): string { return localStorage.getItem(PROFILE_NAME_KEY) || ''; }
export function setProfileName(name: string) {
  const v = name.trim();
  if (v) localStorage.setItem(PROFILE_NAME_KEY, v); else localStorage.removeItem(PROFILE_NAME_KEY);
  emit();
}

// ---- onboarding ----------------------------------------------------------
const ONBOARDED_KEY = 'lexi.onboarded.v1';
export function onboarded(): boolean { return localStorage.getItem(ONBOARDED_KEY) === '1'; }
export function setOnboarded(v = true) {
  if (v) localStorage.setItem(ONBOARDED_KEY, '1'); else localStorage.removeItem(ONBOARDED_KEY);
  emit();
}

/** A gentle first session: the n lowest-level unseen words in the current scope. */
export function firstRunIds(n = 10): string[] {
  return WORDS
    .filter((w) => w.kind === 'word' && inLevels(w) && statusOf(w.id) === 'new')
    // Band first, then commonest-within-band. Band alone put whatever the corpus
    // happened to list first in front of a learner's very first ten cards; "A1"
    // spans several thousand frequency ranks, so that was close to arbitrary.
    // Unranked words keep their relative order and follow — see lib/freq.ts.
    .sort((a, b) => (ALL_LEVELS.indexOf(a.level) - ALL_LEVELS.indexOf(b.level)) || byFrequency(a, b))
    .slice(0, n)
    .map((w) => w.id);
}

// ---- interests / topics --------------------------------------------------
// Fine-group topics the learner chose at onboarding (and can edit in Profile).
// weakestSectors() floats sectors in these groups to the front, so fresh
// vocabulary is drawn from what they care about first. Empty = no preference.
// ---- the class list ------------------------------------------------------
// 284 semantic sectors and a CEFR filter, and no way to say the one thing a
// language-school student actually wants: "this is my chapter this week". The
// sectors are the corpus's organisation, not the learner's course, and no amount
// of filtering turns one into the other.
//
// So: paste the list your teacher handed out. Matching is the same surface index
// the reader uses, so an inflected or plural form finds its card. Stored as ids,
// because the list is a pointer into the lexicon rather than a copy of it.
const CLASSLIST_KEY = 'lexi.classlist.v1';
export interface ClassList { name: string; ids: string[]; at: number }

export function classList(): ClassList | null {
  try {
    const raw = localStorage.getItem(CLASSLIST_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ClassList;
    return p && Array.isArray(p.ids) && p.ids.length ? p : null;
  } catch { return null; }
}
export function setClassList(list: ClassList | null) {
  try {
    if (list && list.ids.length) localStorage.setItem(CLASSLIST_KEY, JSON.stringify(list));
    else localStorage.removeItem(CLASSLIST_KEY);
  } catch { /* quota */ }
  emit();
}

// ---- this week's focus ---------------------------------------------------
// Perfekt is most of what an A2 course spends a month on, and the app served it as
// one of four random transform targets — so a learner working on it got it roughly
// a quarter of the time, and could not say so. Randomness is right for *coverage*
// and wrong for a syllabus: a course moves through one thing at a time.
//
// A focus doesn't narrow the queue or hide anything. It weights which grammatical
// target the tense drills choose, so the thing the learner is studying this week
// comes up more often than chance. Set it, and it stays until changed.
const FOCUS_KEY = 'lexi.focus.v1';

export function focusTense(): string | null {
  const v = localStorage.getItem(FOCUS_KEY);
  return v && v !== 'none' ? v : null;
}
export function setFocusTense(key: string | null) {
  try {
    if (key) localStorage.setItem(FOCUS_KEY, key); else localStorage.removeItem(FOCUS_KEY);
  } catch { /* quota */ }
  emit();
}

const INTERESTS_KEY = 'lexi.interests.v1';
export function interests(): Set<string> {
  try {
    const a = JSON.parse(localStorage.getItem(INTERESTS_KEY) || '[]');
    return new Set(Array.isArray(a) ? (a as string[]) : []);
  } catch { return new Set(); }
}
export function setInterests(next: Set<string>) {
  try { localStorage.setItem(INTERESTS_KEY, JSON.stringify([...next])); } catch { /* quota */ }
  emit();
}
export function toggleInterest(name: string) {
  const next = interests();
  if (next.has(name)) next.delete(name); else next.add(name);
  setInterests(next);
}
/** Selectable interest topics — the 16 fine corpus groups with live card counts,
 *  largest first. User-mined sectors carry no fine group, so they're excluded. */
export function topicOptions(): { name: string; cards: number }[] {
  const counts = new Map<string, number>();
  for (const w of WORDS) {
    const fg = SECTOR_FINEGROUP.get(w.field);
    if (!fg) continue;
    counts.set(fg, (counts.get(fg) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, cards]) => ({ name, cards }))
    .sort((a, b) => b.cards - a.cards);
}

// ---- level milestones ----------------------------------------------------
const MILESTONE_KEY = 'lexi.milestones.v1';
const THRESHOLDS = [25, 50, 75, 100];
type MilestoneMap = Partial<Record<CEFR, number>>;

/**
 * At most one level-milestone line per recap. Per-band high-water marks ratchet
 * up: seeded silently on first sight (so returning users aren't dumped 25/50/75
 * at once) and never re-fired when an FSRS lapse drops a band back below a
 * threshold. Mutates the stored map — call exactly once per recap.
 */
export function checkMilestones(): string | undefined {
  let map: MilestoneMap = {};
  try { map = JSON.parse(localStorage.getItem(MILESTONE_KEY) || '{}') || {}; } catch { map = {}; }
  let bestLevel: CEFR | null = null;
  let bestThr = 0;
  let changed = false;
  for (const s of levelStats()) {
    if (s.count === 0) continue;
    const pct = Math.round((s.known / s.count) * 100);
    const thr = THRESHOLDS.filter((t) => t <= pct).pop() ?? 0;
    const prev = map[s.level];
    if (prev === undefined) { map[s.level] = thr; changed = true; continue; } // seed silently
    if (thr > prev) {
      map[s.level] = thr; changed = true;
      if (thr > bestThr) { bestThr = thr; bestLevel = s.level; }
    }
  }
  if (changed) { try { localStorage.setItem(MILESTONE_KEY, JSON.stringify(map)); } catch { /* quota */ } }
  return bestLevel && bestThr > 0 ? `${bestLevel} is ${bestThr}% Known` : undefined;
}

// ---- completion ------------------------------------------------------------
// FSRS never finishes. Coverage climbs asymptotically, `statusOf` has three
// states and none of them is *done*, and the only closure in the app is
// "session complete" — which recurs daily and therefore means nothing over a
// month. Spaced repetition's honest promise ("this never ends, that's the
// point") is pedagogically right and motivationally brutal.
//
// A sector every card of which has reached FSRS Review is a real, finite thing
// to have finished. It is **ratcheted**, exactly like the level milestones
// above: a later lapse can take a card back out of Review, but it cannot take
// back something you earned. Unlike `checkMilestones` this does *not* seed
// silently — a completion is a durable collection, not a notification, so a
// learner who has genuinely finished a sector should see it the first time we
// look, not never.
//
// Sectors are measured across every level, not the active CEFR filter, so
// narrowing the filter can't manufacture a completion.
const COMPLETIONS_KEY = 'lexi.completions.v1';
export interface Completion { id: string; name: string; at: number }

export function completions(): Completion[] {
  try {
    const a = JSON.parse(localStorage.getItem(COMPLETIONS_KEY) || '[]');
    return Array.isArray(a) ? (a as Completion[]) : [];
  } catch { return []; }
}

/** Record any sector that is now fully known. Returns only what was newly
 *  earned by this call, so the recap can name it once. */
export function checkCompletions(): Completion[] {
  const existing = completions();
  const have = new Set(existing.map((c) => c.id));
  const added: Completion[] = [];

  for (const s of SECTORS) {
    if (have.has(s.name)) continue;
    const words = WORDS_BY_SECTOR.get(s.name) ?? [];
    if (words.length === 0) continue;
    if (words.every((w) => statusOf(w.id) === 'known')) {
      added.push({ id: s.name, name: s.name, at: Date.now() });
    }
  }

  if (added.length) {
    try { localStorage.setItem(COMPLETIONS_KEY, JSON.stringify([...existing, ...added])); } catch { /* quota */ }
    emit();
  }
  return added;
}

/** Has this sector been earned? Cheap enough to call per deck card. */
export function isComplete(sector: string): boolean {
  return completions().some((c) => c.id === sector);
}

// ---- visits / streak -----------------------------------------------------
// The `visits` array + its persistence live in the persistence section above
// (hydrated from IndexedDB).
// The day boundary for everything the learner experiences as "a day": visits and
// therefore `streak()`, the review log, the daily snapshots, the goal's days-left.
//
// It must be the LEARNER'S midnight, not UTC's. `toISOString().slice(0,10)` — what
// this was — is the UTC calendar date, and for anyone west of Greenwich an evening
// session already belongs to tomorrow. Studying at 16:00 Tuesday and 18:00
// Wednesday in Los Angeles produced the keys 08-04 and 08-06: a one-day hole, so
// the streak reset to 1 after two genuinely consecutive days. East of Greenwich it
// fails the other way — 01:00 and 23:00 on one Berlin day produced two keys and
// inflated the streak.
//
// Every fake-timer test pinned the clock to 12:00Z, which is the one hour of the
// day where the UTC date agrees with every plausible local date, so the suite
// could not see it. See the timezone cases in store-session.test.ts.
function todayKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local midnight of a YYYY-MM-DD key, as ms. Use this — not `Date.parse(key)`,
 *  which reads a bare date as UTC — whenever a day key is compared against a real
 *  timestamp (a card's `due`, `Date.now()`). Key-to-key *differences* elsewhere in
 *  this file deliberately keep parsing as UTC midnight: both sides get the same
 *  treatment, so the day count is right and immune to DST-length days. */
function dayStart(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function recordVisit() {
  const t = todayKey();
  if (!visits.includes(t)) { visits.push(t); persistVisits(); }
}

/** Whether any card was actually graded today. Distinct from a visit: opening
 *  the app records a visit, so streak() alone can't tell "studied" from "looked
 *  at the home screen" — and a reminder that fires after you've already done
 *  your reviews is the fastest way to get notifications switched off. */
export function reviewedToday(): boolean {
  return (reviewLog()[todayKey()]?.n ?? 0) > 0;
}

/** Distinct days this learner has opened Lexi. The honest measure of "how new am
 *  I" — a streak resets, and a card count says nothing about elapsed time. */
export function visitCount(): number { return new Set(visits).size; }

export function streak(): number {
  const set = new Set(visits);
  let n = 0;
  const d = new Date();
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ---- comeback (streaks are memories, not debts) ---------------------------
/** Longest run of consecutive visit days, ever. A zeroed current streak after a
 *  life event shouldn't erase the record — this is what "your 41-day streak is
 *  safe" reads from. */
export function longestStreak(): number {
  const days = [...new Set(visits)].sort();
  let best = 0, run = 0;
  let prev = 0;
  for (const d of days) {
    const t = new Date(d + 'T00:00:00Z').getTime();
    run = prev && t - prev === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/** Days since the most recent visit before today (null = first day ever). */
export function lastGapDays(): number | null {
  const t = todayKey();
  const prior = [...new Set(visits)].filter((d) => d < t).sort();
  if (prior.length === 0) return null;
  const last = new Date(prior[prior.length - 1] + 'T00:00:00Z').getTime();
  const today = new Date(t + 'T00:00:00Z').getTime();
  return Math.round((today - last) / 86_400_000);
}

// ---- backlog burn-down ----------------------------------------------------
// Track the peak of the due backlog so a week of clearing reads as progress
// through something finite ("190 of 312 cleared"), not an endless grind.
// The peak resets once the backlog is fully cleared.
const BACKLOG_PEAK_KEY = 'lexi.backlogpeak.v1';
export function backlogPeak(): number {
  const v = parseInt(localStorage.getItem(BACKLOG_PEAK_KEY) || '0', 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
}
/** Record today's observed backlog; ratchets the peak up, clears it at zero. */
export function noteBacklog(dueTotal: number) {
  try {
    if (dueTotal <= 0) { localStorage.removeItem(BACKLOG_PEAK_KEY); return; }
    if (dueTotal > backlogPeak()) localStorage.setItem(BACKLOG_PEAK_KEY, String(dueTotal));
  } catch { /* quota */ }
}

// ---- backup: export / import ---------------------------------------------
// A portable snapshot the learner controls, so a cleared cache (or a new device)
// isn't fatal. Carries progress (cards / misses / visits) plus non-secret
// settings; the API key is deliberately excluded.
const SETTING_KEYS = [
  'lexi.placement.v1', 'lexi.levels.v1', 'lexi.milestones.v1', 'lexi.snap.v1',
  'lexi.onboarded.v1', 'lexi.retention.v1', 'lexi.hdvoice.v1', 'lexi.theme.v1',
  'lexi.profile.name.v1', 'lexi.interests.v1', 'lexi.flags.v1', 'lexi.goal.v1',
  'lexi.classlist.v1', 'lexi.focus.v1', 'lexi.pace.v1',
  'lexi.reviewlog.v1', 'lexi.textscale.v1', 'lexi.sound.v1', 'lexi.reminder.v1',
  'lexi.completions.v1',
];

/** Serialize all progress + non-secret settings to a JSON backup string. */
// Local-first means a cleared cache is unrecoverable, and the export has always
// been passive — nothing ever suggested it (UX-PATHS S3). Recording when one was
// last taken is what lets Today ask once, after there is something worth losing.
const BACKUP_KEY = 'lexi.backup.v1';
/** Day the last backup was exported, or null if never. */
export function lastBackup(): string | null { return localStorage.getItem(BACKUP_KEY); }
export function noteBackup() {
  try { localStorage.setItem(BACKUP_KEY, todayKey()); } catch { /* quota */ }
  emit();
}

export function exportData(): string {
  const settings: Record<string, string> = {};
  for (const k of SETTING_KEYS) { const v = localStorage.getItem(k); if (v != null) settings[k] = v; }
  noteBackup();
  return JSON.stringify({ app: 'lexi', v: 1, exportedAt: new Date().toISOString(), cards: cardsObject(), misses, visits, settings });
}

/** Restore a backup produced by exportData. Writes straight to storage; the
 *  caller should reload the app so it re-hydrates cleanly. Throws on a bad file. */
export async function importData(json: string): Promise<void> {
  const d = JSON.parse(json);
  if (!d || typeof d !== 'object' || typeof d.cards !== 'object' || d.cards === null) {
    throw new Error('That doesn’t look like a Lexi backup file.');
  }
  // Drop any debounced write still in flight. It would fire after these writes
  // land and overwrite the restored cards with the in-memory ones we are
  // replacing — the caller reloads the app, so `live` is about to be discarded.
  if (persistTimer !== null) { clearTimeout(persistTimer); persistTimer = null; }
  await Promise.all([
    idbSet(CARDS_KEY, d.cards),
    idbSet(MISS_KEY, Array.isArray(d.misses) ? d.misses : []),
    idbSet(VISITS_KEY, Array.isArray(d.visits) ? d.visits : []),
  ]);
  if (d.settings && typeof d.settings === 'object') {
    for (const k of SETTING_KEYS) {
      const val = d.settings[k];
      if (typeof val === 'string') localStorage.setItem(k, val);
    }
  }
}
