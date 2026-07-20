// Local-first store: FSRS card state per word, persisted to localStorage.
// Exposes a tiny pub/sub so React can subscribe via useSyncExternalStore.
// Adds a CEFR level filter and group/sector/all scoped stats + sessions.
import { WORDS, WORDS_BY_SECTOR, SECTORS, SECTOR_GROUP, SECTOR_FINEGROUP, GROUP_SECTORS, BY_ID, registerWords, USER_WORDS_KEY } from './data/index.ts';
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
// After a gap, FSRS marks *everything* overdue at once; serving it all in one
// briefing ("312 cards queued") is the classic SRS rage-quit moment. Cap the
// day at the oldest-due slice — FSRS tolerates the extra delay by design — and
// report the true backlog so Today can frame it honestly (UX-PATHS F2).
const DAILY_DUE_CAP = 60;

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

function cardsObject(): Record<string, Card> {
  const obj: Record<string, Card> = {};
  live.forEach((c, id) => (obj[id] = c));
  return obj;
}
function persistCards() { idbSet(CARDS_KEY, cardsObject()); }
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
 *  never seen before (returns to 'new'). Powers the session's prev/undo control. */
export function restoreCard(id: string, snap: Card | undefined) {
  if (snap) live.set(id, snap); else live.delete(id);
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
export function buildSession(target: Target, maxNew = NEW_PER_DAY): Word[] {
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
  const served = dueReview.slice(0, DAILY_DUE_CAP);

  const want = Math.min(NEW_PER_DAY, Math.max(0, MIN_DAILY - served.length));
  const freshIds: string[] = [];
  const weak: string[] = [];
  for (const s of weakestSectors(6)) {
    if (freshIds.length >= want) break;
    const newCards = (WORDS_BY_SECTOR.get(s.name) ?? [])
      .filter((w) => inLevels(w) && statusOf(w.id) === 'new');
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

/** Scheduled cards due per day for the next `days` days; index 0 = overdue + today. */
export function dueForecast(days = 7): number[] {
  const out = new Array<number>(days).fill(0);
  const start = new Date(todayKey() + 'T00:00:00Z').getTime();
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
export interface MissEvent { tag: string; at: number; }
/** Record a wrong answer under a structural tag (grammar point, drill type…). */
export function logMiss(tag: string) {
  misses.push({ tag, at: Date.now() });
  if (misses.length > 800) misses = misses.slice(-800);
  persistMisses();
  emit();
}
/** Top recurring weaknesses within the last `days`, most frequent first. */
export function missStats(days = 30): { tag: string; count: number; last: number }[] {
  const since = Date.now() - days * 86_400_000;
  const m = new Map<string, { count: number; last: number }>();
  for (const e of misses) {
    if (e.at < since) continue;
    const cur = m.get(e.tag) ?? { count: 0, last: 0 };
    cur.count++; cur.last = Math.max(cur.last, e.at);
    m.set(e.tag, cur);
  }
  return [...m.entries()].map(([tag, v]) => ({ tag, ...v })).sort((a, b) => b.count - a.count);
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

// ---- sound (the feel layer; off by default) --------------------------------
const SOUND_KEY = 'lexi.sound.v1';
export function sound(): boolean { return localStorage.getItem(SOUND_KEY) === '1'; }
export function setSound(on: boolean) {
  if (on) localStorage.setItem(SOUND_KEY, '1'); else localStorage.removeItem(SOUND_KEY);
  emit();
}

// ---- HD voice (Piper Thorsten, in-browser) -------------------------------
const HDVOICE_KEY = 'lexi.hdvoice.v1';
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
    .sort((a, b) => ALL_LEVELS.indexOf(a.level) - ALL_LEVELS.indexOf(b.level))
    .slice(0, n)
    .map((w) => w.id);
}

// ---- interests / topics --------------------------------------------------
// Fine-group topics the learner chose at onboarding (and can edit in Profile).
// weakestSectors() floats sectors in these groups to the front, so fresh
// vocabulary is drawn from what they care about first. Empty = no preference.
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

// ---- visits / streak -----------------------------------------------------
// The `visits` array + its persistence live in the persistence section above
// (hydrated from IndexedDB).
function todayKey(d = new Date()) { return d.toISOString().slice(0, 10); }

export function recordVisit() {
  const t = todayKey();
  if (!visits.includes(t)) { visits.push(t); persistVisits(); }
}

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
  'lexi.reviewlog.v1', 'lexi.textscale.v1', 'lexi.sound.v1',
];

/** Serialize all progress + non-secret settings to a JSON backup string. */
export function exportData(): string {
  const settings: Record<string, string> = {};
  for (const k of SETTING_KEYS) { const v = localStorage.getItem(k); if (v != null) settings[k] = v; }
  return JSON.stringify({ app: 'lexi', v: 1, exportedAt: new Date().toISOString(), cards: cardsObject(), misses, visits, settings });
}

/** Restore a backup produced by exportData. Writes straight to storage; the
 *  caller should reload the app so it re-hydrates cleanly. Throws on a bad file. */
export async function importData(json: string): Promise<void> {
  const d = JSON.parse(json);
  if (!d || typeof d !== 'object' || typeof d.cards !== 'object' || d.cards === null) {
    throw new Error('That doesn’t look like a Lexi backup file.');
  }
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
