// Local-first store: FSRS card state per word, persisted to localStorage.
// Exposes a tiny pub/sub so React can subscribe via useSyncExternalStore.
// Adds a CEFR level filter and group/sector/all scoped stats + sessions.
import { WORDS, WORDS_BY_SECTOR, SECTORS, SECTOR_GROUP, GROUP_SECTORS, BY_ID, registerWords, USER_WORDS_KEY } from './data/index.ts';
import { emptyCard, schedule, reviveCard, isDue, State, type Card, type Grade } from './srs.ts';
import type { Word, GroupStat, SectorStat, Target, CEFR } from './types.ts';
import { ALL_LEVELS } from './types.ts';

const CARDS_KEY = 'lexi.cards.v1';
const VISITS_KEY = 'lexi.visits.v1';
const LEVELS_KEY = 'lexi.levels.v1';
const EXAM_KEY = 'lexi.exam.v1';
const APIKEY_KEY = 'lexi.apikey.v1';
const NEW_PER_DAY = 24;
const MIN_DAILY = 20; // streak-safe minimum items in a daily briefing

// ---- persistence ---------------------------------------------------------
function loadRaw(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(CARDS_KEY) || '{}'); } catch { return {}; }
}
const raw = loadRaw();
const live = new Map<string, Card>();
for (const id of Object.keys(raw)) {
  try { live.set(id, reviveCard(raw[id])); } catch { /* skip corrupt */ }
}

let version = 0;
const listeners = new Set<() => void>();
function emit() { version++; listeners.forEach((l) => l()); }
function persist() {
  const obj: Record<string, Card> = {};
  live.forEach((c, id) => (obj[id] = c));
  try { localStorage.setItem(CARDS_KEY, JSON.stringify(obj)); } catch { /* quota */ }
}
export function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function getVersion() { return version; }

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
  persist();
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
  due: number;          // count of due reviews included
  fresh: number;        // count of new cards included
  weakSectors: string[];// sectors the fresh cards were drawn from
}

/** Sectors with the most room to grow: lowest coverage first, then most due. */
export function weakestSectors(n = 4): SectorStat[] {
  return sectorStats()
    .filter((s) => s.newCount > 0 || s.due > 0)
    .sort((a, b) => (a.coverage - b.coverage) || (b.due - a.due))
    .slice(0, n);
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

  const want = Math.min(NEW_PER_DAY, Math.max(0, MIN_DAILY - dueReview.length));
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
    ids: [...dueReview.map((d) => d.id), ...freshIds],
    due: dueReview.length,
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
interface Snapshot { date: string; groups: Record<string, number>; }
function loadSnaps(): Snapshot[] {
  try { const a = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}
/** Record today's learned count per theme group (unfiltered), once per day. */
export function recordSnapshot() {
  const snaps = loadSnaps();
  const t = todayKey();
  if (snaps.some((s) => s.date === t)) return;
  const groups: Record<string, number> = {};
  for (const w of WORDS) {
    if (statusOf(w.id) === 'new') continue;
    const g = SECTOR_GROUP.get(w.field);
    if (g) groups[g] = (groups[g] ?? 0) + 1;
  }
  snaps.push({ date: t, groups });
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

// ---- settings: exam date & enrichment API key ----------------------------
export function examDate(): string | null { return localStorage.getItem(EXAM_KEY); }
export function setExamDate(iso: string | null) {
  if (iso) localStorage.setItem(EXAM_KEY, iso); else localStorage.removeItem(EXAM_KEY);
  emit();
}
/** Whole days from today until the exam (negative if past). null if unset. */
export function daysToExam(): number | null {
  const d = examDate();
  if (!d) return null;
  const ms = new Date(d + 'T00:00:00').getTime() - new Date(todayKey() + 'T00:00:00').getTime();
  return Math.round(ms / 86_400_000);
}
export function apiKey(): string { return localStorage.getItem(APIKEY_KEY) || ''; }
export function setApiKey(k: string) {
  if (k) localStorage.setItem(APIKEY_KEY, k); else localStorage.removeItem(APIKEY_KEY);
  emit();
}

// ---- AI provider (OpenAI-compatible: base URL + model + key) --------------
const AI_BASE_KEY = 'lexi.ai.base.v1';
const AI_MODEL_KEY = 'lexi.ai.model.v1';
// Default to OpenRouter's free, non-Chinese Llama model.
const DEFAULT_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export interface AiConfig { baseUrl: string; model: string; key: string; }
export function aiConfig(): AiConfig {
  return {
    baseUrl: localStorage.getItem(AI_BASE_KEY) || DEFAULT_BASE,
    model: localStorage.getItem(AI_MODEL_KEY) || DEFAULT_MODEL,
    key: apiKey(),
  };
}
export function setAiConfig(c: Partial<AiConfig>) {
  if (c.baseUrl !== undefined) localStorage.setItem(AI_BASE_KEY, c.baseUrl || DEFAULT_BASE);
  if (c.model !== undefined) localStorage.setItem(AI_MODEL_KEY, c.model || DEFAULT_MODEL);
  if (c.key !== undefined) setApiKey(c.key);
  else emit();
}

// ---- blind spots (structural error log) ----------------------------------
const MISS_KEY = 'lexi.miss.v1';
export interface MissEvent { tag: string; at: number; }
function loadMisses(): MissEvent[] {
  try { const a = JSON.parse(localStorage.getItem(MISS_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}
let misses = loadMisses();
/** Record a wrong answer under a structural tag (grammar point, drill type…). */
export function logMiss(tag: string) {
  misses.push({ tag, at: Date.now() });
  if (misses.length > 800) misses = misses.slice(-800);
  try { localStorage.setItem(MISS_KEY, JSON.stringify(misses)); } catch { /* */ }
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

// ---- HD voice (Piper Thorsten, in-browser) -------------------------------
const HDVOICE_KEY = 'lexi.hdvoice.v1';
export function hdVoice(): boolean { return localStorage.getItem(HDVOICE_KEY) === '1'; }
export function setHdVoice(on: boolean) {
  if (on) localStorage.setItem(HDVOICE_KEY, '1'); else localStorage.removeItem(HDVOICE_KEY);
  emit();
}

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
function loadVisits(): string[] {
  try { return JSON.parse(localStorage.getItem(VISITS_KEY) || '[]'); } catch { return []; }
}
function todayKey(d = new Date()) { return d.toISOString().slice(0, 10); }

export function recordVisit() {
  const v = loadVisits();
  const t = todayKey();
  if (!v.includes(t)) { v.push(t); try { localStorage.setItem(VISITS_KEY, JSON.stringify(v)); } catch { /* */ } }
}

export function streak(): number {
  const set = new Set(loadVisits());
  let n = 0;
  const d = new Date();
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
