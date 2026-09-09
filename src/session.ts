// The session — vocabulary flips interleaved with word-fact drills (gender,
// plural, recall, dictation) for the same words. Interleaved retrieval in varied
// formats beats blocked practice, so a word you just flipped resurfaces a few
// items later asked the other way round.
//
// Drills use their own namespaced FSRS cards (gym:<mode>:<wordId>), which is how
// *recognising* a word and *producing* it can be scheduled apart — the same word
// on two clocks.
//
// **What left on 2026-09-05.** Two of the five decisions this builder used to
// make were grammar: a function word pulled its authored grammar point into the
// queue, and repeated misses pulled in the rule behind them. Both were good
// machinery pointed at a syllabus this app no longer teaches, and both went with
// it. Three decisions remain, all of them about words: what is due, what is
// fresh, and which word-fact you keep getting wrong.
import type { Word, Target } from './types.ts';
import { buildSession, cardOf, wordsFor, dueGymIds, missStats, practisedModes, modeEnabled, isSaved, dweltRepeatedly } from './store.ts';
import { BY_ID } from './data/index.ts';
import { isDue, State } from './srs.ts';
import { eligibleModes, gymId, MODE_TAG, type Mode } from './views/drills.tsx';

/** Why an item is in this session.
 *
 *  The builder makes several decisions per session and used to splice every one
 *  of them in silently. A word you flipped four cards ago coming back as "type
 *  it in German" is not randomness, and neither is a gender drill on the day you
 *  have missed four genders — but the learner had no way to know either happened.
 *  The scheduling *is* the product; a scheduler that can show its work is the
 *  only durable edge over apps with far bigger content budgets.
 *
 *  None of it needs new data. The causal links already existed in the
 *  `missStats` rows and in the queue itself; they were discarded once they had
 *  done their job of positioning an item. This carries them. */
export type SessionReason =
  /** A scheduled review that has come due. `overdueDays` is how long it waited. */
  | { kind: 'due'; overdueDays: number }
  /** A card the learner has never seen.
   *
   *  `via` is why *this* unseen card and not one of the other six thousand. The
   *  scheduler has always known — `buildBriefing` serves saved words first and then
   *  the ones dwelt on twice — and it used to drop the answer on the floor: three
   *  distinct causes arrived here as one bare `fresh`, and `whyLine` was silent on
   *  it while every other reason in this union spoke. VISION open decision 9.
   *
   *  Absent for a card the weakest-sector loop picked, which is the honest state:
   *  "your level and this sector" is not a fact about the learner and the card front
   *  already says *New ·*. */
  | { kind: 'fresh'; via?: 'saved' | 'dwell' }
  /** A drill for a word whose flip is in this same queue, ~GAP items earlier. */
  | { kind: 'drill'; mode: Mode; parent: Word }
  /** A drill in one of the modes the learner misses most. */
  | { kind: 'blindspot'; mode: Mode; tag: string; misses: number }
  /** A due drill for an in-scope word whose flip is *not* in today's queue. */
  | { kind: 'orphan'; mode: Mode; overdueDays: number }
  /** Picked because the learner wants to read a specific text and this word is
   *  one of the ones standing between them and it. `text` is the learner's own
   *  label for it, so the scheduler can say "because you want to read this". */
  | { kind: 'unlock'; text: string };

export interface SessionItem {
  type: 'flip' | Mode;
  word: Word;
  srsId: string; // FSRS card id (word.id for flips, gym:<mode>:<id> for drills)
  /** Required on purpose: nothing may enter a session without saying why. */
  reason: SessionReason;
  /** The learner's first ever encounter with this drill mode: teach it before
   *  testing it.
   *
   *  A drill can arrive mid-session having never been introduced — the A1 report
   *  was being asked `der Vater → die ___` before anything had said what a plural
   *  is. The rule was one tap away the whole time, behind a small link nobody taps
   *  because they don't yet know they need it. On a first encounter the rule opens
   *  itself instead, and the item is framed as an introduction rather than a test.
   *
   *  That the rule may contain the answer is the point, not a leak: a first sight
   *  is a worked example, and FSRS schedules the actual retrieval minutes later. */
  teach?: boolean;
}

const DAY = 86_400_000;
/** Whole days a card is past its due date (0 if not yet due). */
function overdueDays(srsId: string, now = Date.now()): number {
  const c = cardOf(srsId);
  if (!c) return 0;
  return Math.max(0, Math.floor((now - new Date(c.due).getTime()) / DAY));
}

/** How a plain vocabulary flip got here: never seen, or scheduled and due.
 *
 *  The two learner-made signals are read straight from the store rather than
 *  threaded down from `buildBriefing`, because they are true either way: a saved
 *  word is in this session *because it is saved* however the queue reached it, and
 *  the alternative is a second copy of the briefing's bookkeeping that can disagree
 *  with the first. Saved wins a tie — a bookmark is a decision, a dwell is a guess
 *  about one. */
function flipReason(w: Word, now = Date.now()): SessionReason {
  const c = cardOf(w.id);
  if (!c || c.state === State.New) {
    if (isSaved(w.id)) return { kind: 'fresh', via: 'saved' };
    if (dweltRepeatedly(w.id)) return { kind: 'fresh', via: 'dwell' };
    return { kind: 'fresh' };
  }
  return { kind: 'due', overdueDays: overdueDays(w.id, now) };
}

const GAP = 3;               // a word's drill surfaces ~3 items after its flip
const MAX_FRESH_DRILLS = 10; // cap first-time drills so sessions stay bounded
const MAX_BLIND_SPOTS = 4;   // cap blind-spot drills woven into a session
// Orphan drills were previously uncapped — harmless only because the branch was
// unreachable on the primary path (see buildMixedSession). Now that it fires, a
// learner returning to a large drill backlog needs a bound like everything else.
const MAX_ORPHANS = 6;

// ---- resuming an interrupted session --------------------------------------
// Same-day resume was described as "emergent": grades persist immediately and a
// graded card leaves its pool, so reopening rebuilds the *remainder* and nothing
// is lost. True for the cards — and not for the session. This builder makes
// randomised decisions per session (which drill mode rides along with which word,
// where blind spots land), so the rebuilt queue is a different queue: the
// position resets, the count jumps, and the run of cards the learner was halfway
// through simply isn't there any more.
//
// So the queue is stored, not re-derived. Only identities are stored — an item is
// a type, an FSRS id, a word id and a reason — and the Words are looked up again
// on the way back in, so a stale copy of the lexicon can never be resurrected.
//
// Deliberately localStorage and deliberately *not* in the backup: a half-finished
// queue is a fact about the last ten minutes, not about what you know.
const RESUME_KEY = 'lexi.session.v1';

/** A SessionReason with its Word references reduced to ids. */
type PackedReason =
  | { k: 'fresh'; v?: 'saved' | 'dwell' }
  | { k: 'due'; d: number }
  | { k: 'orphan'; d: number; m: Mode }
  | { k: 'drill'; m: Mode; p: string }
  | { k: 'blindspot'; m: Mode; g: string; n: number }
  | { k: 'unlock'; x: string };

interface PackedItem { t: SessionItem['type']; s: string; w: string; r: PackedReason; e?: 1 }
interface StoredSession { target: string; at: number; i: number; items: PackedItem[] }

/** What counts as "the same session" to come back to. */
const targetKey = (t: Target) => `${t.kind}:${t.name}`;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function packReason(r: SessionReason): PackedReason {
  switch (r.kind) {
    case 'fresh': return r.via ? { k: 'fresh', v: r.via } : { k: 'fresh' };
    case 'due': return { k: 'due', d: r.overdueDays };
    case 'orphan': return { k: 'orphan', d: r.overdueDays, m: r.mode };
    case 'drill': return { k: 'drill', m: r.mode, p: r.parent.id };
    case 'blindspot': return { k: 'blindspot', m: r.mode, g: r.tag, n: r.misses };
    case 'unlock': return { k: 'unlock', x: r.text };
  }
}

/** Null when a referenced word has gone — the caller discards the whole session
 *  rather than resuming a queue with holes in it. */
function unpackReason(r: PackedReason): SessionReason | null {
  switch (r.k) {
    case 'fresh': return r.v ? { kind: 'fresh', via: r.v } : { kind: 'fresh' };
    case 'unlock': return { kind: 'unlock', text: r.x };
    case 'due': return { kind: 'due', overdueDays: r.d };
    case 'orphan': return { kind: 'orphan', overdueDays: r.d, mode: r.m };
    case 'drill': {
      const parent = BY_ID.get(r.p);
      return parent ? { kind: 'drill', mode: r.m, parent } : null;
    }
    case 'blindspot': return { kind: 'blindspot', mode: r.m, tag: r.g, misses: r.n };
    default: return null;
  }
}

/** Remember where the learner is. A finished or not-yet-started session stores
 *  nothing, so there is never a stale queue waiting to be resumed into. */
export function saveSession(target: Target, items: SessionItem[], i: number): void {
  try {
    if (i <= 0 || i >= items.length) { localStorage.removeItem(RESUME_KEY); return; }
    const stored: StoredSession = {
      target: targetKey(target), at: Date.now(), i,
      items: items.map((it) => ({
        t: it.type, s: it.srsId, w: it.word.id, r: packReason(it.reason),
        ...(it.teach ? { e: 1 as const } : {}),
      })),
    };
    localStorage.setItem(RESUME_KEY, JSON.stringify(stored));
  } catch { /* quota or private mode — resume is a convenience, never a requirement */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(RESUME_KEY); } catch { /* */ }
}

/** The session to come back to, or null to build a fresh one.
 *
 *  Refused when it is for a different target, from a different day (yesterday's
 *  queue is yesterday's scheduling and FSRS has moved on), or when any word in it
 *  no longer resolves. Partial restores are not offered: a queue with holes would
 *  renumber every position after the hole. */
export function loadSession(target: Target): { items: SessionItem[]; position: number } | null {
  let stored: StoredSession;
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    stored = JSON.parse(raw) as StoredSession;
  } catch { return null; }

  if (!stored || stored.target !== targetKey(target) || !Array.isArray(stored.items)) return null;
  if (dayKey(stored.at) !== dayKey(Date.now())) return null;
  if (!(stored.i > 0 && stored.i < stored.items.length)) return null;

  const items: SessionItem[] = [];
  for (const p of stored.items) {
    const word = BY_ID.get(p.w);
    const reason = word ? unpackReason(p.r) : null;
    if (!word || !reason) return null;
    items.push({ type: p.t, word, srsId: p.s, reason, ...(p.e ? { teach: true } : {}) });
  }
  return { items, position: stored.i };
}

// ---- fitting a session to real minutes ------------------------------------
// "Quick 5" was the right idea at the wrong unit: nobody has five cards spare,
// they have four minutes. A queue length is only a proxy for a duration, and a bad
// one — this builder expands a list of words into flips *plus* drills, and a typed
// transformation costs several times what a flip does.
//
// These are estimates and the UI says so ("≈ 8 min"). They are derived from this
// file's own behaviour rather than invented: at most one drill rides along per
// word, and MAX_FRESH_DRILLS caps the unseen ones at 10, so a session of N words
// carries somewhere under N/2 drills once the early cards are past.

/** Seconds a plain vocabulary flip takes: read, decide, grade. */
export const SECONDS_PER_FLIP = 7;
/** Seconds an interleaved drill takes — picking an option, or typing a form. */
export const SECONDS_PER_DRILL = 16;
/** Drills per word this builder tends to weave in (see MAX_FRESH_DRILLS). */
export const DRILLS_PER_WORD = 0.5;

/** Estimated wall-clock seconds for a session built from `wordCount` words. */
export function estimateSeconds(wordCount: number): number {
  return Math.round(wordCount * (SECONDS_PER_FLIP + DRILLS_PER_WORD * SECONDS_PER_DRILL));
}

/** Estimated minutes, never rounded to a reassuring zero. */
export function estimateMinutes(wordCount: number): number {
  return wordCount === 0 ? 0 : Math.max(1, Math.round(estimateSeconds(wordCount) / 60));
}

/** How many words fit a time budget — the inverse of `estimateSeconds`.
 *  At least one, so a budget can never produce an empty session. */
export function wordsForMinutes(minutes: number): number {
  const perWord = SECONDS_PER_FLIP + DRILLS_PER_WORD * SECONDS_PER_DRILL;
  return Math.max(1, Math.floor((minutes * 60) / perWord));
}

/** How many *items* fit a time budget — the value to pass as a `custom` target's
 *  `cap`. Slicing the id list only bounds the flips; the builder then weaves in
 *  drills and blind spots on top, which is how a five-card button came to serve
 *  twelve items. `wordsForMinutes` already prices
 *  in `DRILLS_PER_WORD` drills per word, so the honest item count is the words
 *  plus exactly those drills — anything past that is time the learner was not
 *  offered. */
export function itemsForMinutes(minutes: number): number {
  return Math.max(1, Math.round(wordsForMinutes(minutes) * (1 + DRILLS_PER_WORD)));
}

/** Drill modes ranked by how often you miss them (last 30 days), worst first.
 *  Carries the count, so a drill woven in on this basis can say what it's for. */
function weakModes(): { mode: Mode; tag: string; misses: number }[] {
  const byTag = new Map<string, Mode>();
  (Object.entries(MODE_TAG) as [Mode, string][]).forEach(([m, tag]) => byTag.set(tag, m));
  const out: { mode: Mode; tag: string; misses: number }[] = [];
  for (const s of missStats(30)) {
    const m = byTag.get(s.tag);
    if (m && !out.some((r) => r.mode === m)) out.push({ mode: m, tag: s.tag, misses: s.count });
  }
  return out;
}

/** Blind-spot drills to weave into a session: for the modes you miss most, the
 *  words (from this session's queue) whose drill card is due or not yet seen.
 *  Capped, so the session actively rehearses your weak structures without
 *  ballooning. Exported so Today can preview the count. */
export function blindSpotDrills(words: Word[], cap = MAX_BLIND_SPOTS): SessionItem[] {
  const modes = weakModes();
  if (modes.length === 0) return [];
  const now = Date.now();
  const out: SessionItem[] = [];
  for (const { mode, tag, misses } of modes) {
    for (const w of words) {
      if (out.length >= cap) return out;
      if (!modeEnabled(mode)) continue;          // muted for sessions by the learner
      if (!eligibleModes(w).includes(mode)) continue;
      const srsId = gymId(mode, w);
      const c = cardOf(srsId);
      if (c && !isDue(c, now)) continue;          // already comfortably scheduled
      if (out.some((it) => it.srsId === srsId)) continue;
      out.push({ type: mode, word: w, srsId, reason: { kind: 'blindspot', mode, tag, misses } });
    }
  }
  return out;
}

/** Flip queue from the store, woven with at most one drill per word:
 *  due drills always ride along; unseen drills fill up to the cap.
 *
 *  `teachOnly` strips every drill out, leaving pure vocabulary. The very first
 *  session is the one place where a learner has been taught nothing yet, and
 *  asking them to *produce* a word six cards in is a retrieval attempt on
 *  something not yet encoded. Drills start from session two, once there is
 *  something to interleave *with*. */
export function buildMixedSession(target: Target, teachOnly = false): SessionItem[] {
  const words = buildSession(target);
  const now = Date.now();
  // A session assembled by the comprehension meter has a better answer to "why is
  // this card here?" than `fresh` — the learner picked a text and these are the
  // words in the way of it. Only the *flips* carry it; a drill woven in beside one
  // still explains itself as a drill.
  const unlockText = target.kind === 'custom' ? target.unlockText : undefined;
  const reasonFor = (w: Word): SessionReason =>
    unlockText ? { kind: 'unlock', text: unlockText } : flipReason(w, now);
  if (teachOnly) {
    return words.map((w) => ({ type: 'flip' as const, word: w, srsId: w.id, reason: reasonFor(w) }));
  }

  const drills = new Map<number, SessionItem>(); // flip index → its drill
  let freshBudget = MAX_FRESH_DRILLS;
  // Which drill modes this learner has ever answered. Computed once: a mode is
  // introduced at most once per session, on whichever card reaches it first.
  const practised = practisedModes();
  const taught = new Set<string>();

  words.forEach((w, idx) => {
    // `eligibleModes` answers what the *word* can carry; `modeEnabled` answers
    // what the learner asked for. Filtering here rather than inside
    // `eligibleModes` keeps the standalone drill honest: opening Plurals by name
    // still drills plurals.
    const modes = eligibleModes(w).filter((m) => modeEnabled(m));
    if (modes.length === 0) return;
    const due = modes.filter((m) => { const c = cardOf(gymId(m, w)); return c && isDue(c); });
    let pick: Mode | null = null;
    if (due.length) pick = due[Math.floor(Math.random() * due.length)];
    else if (freshBudget > 0) {
      const fresh = modes.filter((m) => !cardOf(gymId(m, w)));
      if (fresh.length) { pick = fresh[Math.floor(Math.random() * fresh.length)]; freshBudget--; }
    }
    if (pick) {
      const first = !practised.has(pick) && !taught.has(pick);
      if (first) taught.add(pick);
      drills.set(idx, {
        type: pick, word: w, srsId: gymId(pick, w),
        reason: { kind: 'drill', mode: pick, parent: w },
        ...(first ? { teach: true } : {}),
      });
    }
  });

  const out: SessionItem[] = [];
  words.forEach((w, idx) => {
    out.push({ type: 'flip', word: w, srsId: w.id, reason: reasonFor(w) });
    const d = drills.get(idx - GAP);
    if (d) out.push(d);
  });
  // drills whose slot ran past the end of the flip queue
  for (let idx = Math.max(0, words.length - GAP); idx < words.length; idx++) {
    const d = drills.get(idx);
    if (d) out.push(d);
  }

  // Orphan due drills: drill cards due for in-scope words whose flip is NOT in
  // this queue. Spread them randomly, so the day's session absorbs the whole
  // drill backlog rather than leaving it somewhere else to be cleared.
  //
  // The scope has to be wider than the queue or this branch is unreachable. For
  // a `custom` target — which is what every "Start session" builds —
  // `buildSession` returns the whole id list and `wordsFor` returns the same
  // list, so `scope` and `inQueue` were identical sets and the `!inQueue` guard
  // rejected every candidate. A curated day stands for the learner's whole
  // current scope, so that is what it draws orphans from.
  const inQueue = new Set(words.map((w) => w.id));
  const scope = target.kind === 'custom'
    ? new Set(wordsFor({ kind: 'all', name: 'All sectors' }).map((w) => w.id))
    : new Set(wordsFor(target).map((w) => w.id));
  let orphanBudget = MAX_ORPHANS;
  for (const rawId of dueGymIds()) {
    if (orphanBudget <= 0) break;
    const parts = rawId.split(':');
    const mode = parts[1] as Mode;
    const wordId = parts.slice(2).join(':'); // user words contain ':' (usr:…)
    // A muted mode is muted here too, or a learner who switched Diktat off would
    // still meet Diktat items as orphans — the one path that reaches past the
    // queue's own weave.
    if (!(mode in MODE_TAG) || !modeEnabled(mode) || inQueue.has(wordId) || !scope.has(wordId)) continue;
    const w = BY_ID.get(wordId);
    if (!w) continue;
    orphanBudget--;
    out.splice(Math.floor(Math.random() * (out.length + 1)), 0, {
      type: mode, word: w, srsId: rawId,
      reason: { kind: 'orphan', mode, overdueDays: overdueDays(rawId, now) },
    });
  }

  // Blind-spot injection — a capped set of drills in the modes you miss most,
  // drawn from this session's own words, spread through the queue. This is the
  // agreed split between weakest-sectors and blind-spots: weakestSectors() (in
  // store.buildBriefing) picks which fresh *vocabulary* enters the day, while
  // blind spots decide which *drills* ride along — so you rehearse weak
  // structures right where you already are.
  for (const d of blindSpotDrills(words)) {
    if (out.some((it) => it.srsId === d.srsId)) continue;
    out.splice(Math.floor(Math.random() * (out.length + 1)), 0, d);
  }

  // A capped target keeps its promise. Applied here, after every splice, because
  // the cap is on the session the learner actually sits through — capping the
  // flip slice earlier would just let the drills push past it again.
  if (target.kind === 'custom' && target.cap !== undefined && out.length > target.cap) {
    return out.slice(0, target.cap);
  }
  // **And every other session gets a ceiling too.** *2026-09-05.*
  //
  // `DAILY_DUE_CAP` bounds the *flips* at 60 and the builder then weaves drills
  // on top, so an uncapped day is not 60 items, it is however many 60 words
  // happen to generate. Measured across the personas: a day-two learner was
  // served 30, a three-week learner 35 — and the learner returning from a month
  // away, with 189 cards due, was served **70**. That is the largest session in
  // the app landing on the person most likely to close it, which is exactly
  // backwards.
  //
  // Anything past the ceiling is not lost — it is due tomorrow, and the backlog
  // bar on Fortschritt shows it going down.
  return out.length > SESSION_CEILING ? out.slice(0, SESSION_CEILING) : out;
}

/** The most items a session will put in front of somebody who did not ask for a
 *  longer one.
 *
 *  **Deliberately a flat number and not `itemsForMinutes`.** Pricing it in
 *  minutes was the first attempt and it does not bound anything: the per-item
 *  estimates work out at about ten seconds, so even a twenty-five minute budget
 *  allows 150 items — more than double the worst session anyone was actually
 *  served. An estimate that generous is fine for *describing* a session the
 *  learner chose and useless as a *limit* on one they did not.
 *
 *  40 is set against the design intent the rest of the file already states:
 *  `NEW_PER_DAY` is 24 and `MIN_DAILY` is 20, so a day of 40 items comfortably
 *  contains a full quota of fresh words plus real review, while the 70-item day
 *  the backlog persona was served is three times what any other number in this
 *  codebase asks for. A backlog is cleared by turning up, not by one sitting. */
export const SESSION_CEILING = 40;
