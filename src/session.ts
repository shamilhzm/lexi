// Mixed study sessions: vocabulary flips interleaved with grammar drills
// (gender / plural / conjugation / cloze) for the same words. Interleaved
// retrieval in varied formats beats blocked practice, so a word you just
// flipped resurfaces a few items later as a drill. Drill items reuse the
// Gym's namespaced FSRS cards (gym:<mode>:<wordId>) — both surfaces share
// one schedule and past Gym progress carries over.
import type { Word, Target } from './types.ts';
import { buildSession, cardOf, wordsFor, dueGymIds, missStats } from './store.ts';
import { BY_ID } from './data/index.ts';
import { isDue, State } from './srs.ts';
import { eligibleModes, gymId, MODE_TAG, MODE_REMEDY, type Mode } from './views/Fundamentals.tsx';

/** Why an item is in this session.
 *
 *  This builder makes five distinct pedagogical decisions per session and used
 *  to splice every one of them in silently. Learning "obwohl" pulls its
 *  Konzessivsätze exercise into the queue a few cards later — genuinely ahead of
 *  what the big consumer apps do, and the learner had no way to know it happened.
 *  The scheduling *is* the product; an honest scheduler that can show its work is
 *  the only durable edge over apps with far bigger content budgets.
 *
 *  Note that none of this needs new data. The causal links already existed —
 *  `WORD_POINT`, `MODE_REMEDY`, the `missStats` rows — they were just discarded
 *  once they had done their job of positioning an item. This carries them. */
export type SessionReason =
  /** A scheduled review that has come due. `overdueDays` is how long it waited. */
  | { kind: 'due'; overdueDays: number }
  /** A card the learner has never seen. */
  | { kind: 'fresh' }
  /** A drill for a word whose flip is in this same queue, ~GAP items earlier. */
  | { kind: 'drill'; mode: Mode; parent: Word }
  /** A grammar point pulled in by a function word the learner just met. */
  | { kind: 'linked'; trigger: Word }
  /** The rule for a system the learner keeps getting wrong. */
  | { kind: 'remedy'; mode: Mode; tag: string; misses: number }
  /** A drill in one of the modes the learner misses most. */
  | { kind: 'blindspot'; mode: Mode; tag: string; misses: number }
  /** A due drill for an in-scope word whose flip is *not* in today's queue. */
  | { kind: 'orphan'; mode: Mode; overdueDays: number };

export interface SessionItem {
  type: 'flip' | Mode;
  word: Word;
  srsId: string; // FSRS card id (word.id for flips, gym:<mode>:<id> for drills)
  /** Required on purpose: nothing may enter a session without saying why. */
  reason: SessionReason;
}

const DAY = 86_400_000;
/** Whole days a card is past its due date (0 if not yet due). */
function overdueDays(srsId: string, now = Date.now()): number {
  const c = cardOf(srsId);
  if (!c) return 0;
  return Math.max(0, Math.floor((now - new Date(c.due).getTime()) / DAY));
}

/** How a plain vocabulary flip got here: never seen, or scheduled and due. */
function flipReason(w: Word, now = Date.now()): SessionReason {
  const c = cardOf(w.id);
  if (!c || c.state === State.New) return { kind: 'fresh' };
  return { kind: 'due', overdueDays: overdueDays(w.id, now) };
}

const GAP = 3;               // a word's drill surfaces ~3 items after its flip
const MAX_FRESH_DRILLS = 10; // cap first-time drills so sessions stay bounded
const MAX_BLIND_SPOTS = 4;   // cap blind-spot drills woven into a session
const MAX_LINKED = 2;        // cap word-linked grammar points per session
const MAX_REMEDY = 1;        // cap miss-triggered remediation points per session
const REMEDY_MIN_MISSES = 3; // misses (30d) in a mode before remediation fires

// ---- resuming an interrupted session --------------------------------------
// Same-day resume was described as "emergent": grades persist immediately and a
// graded card leaves its pool, so reopening rebuilds the *remainder* and nothing
// is lost. True for the cards — and not for the session. This builder makes five
// randomised decisions per session (which drill mode rides along with which word,
// where blind spots land, which remediation point fires), so the rebuilt queue is
// a different queue: the position resets, the count jumps, and the run of cards
// the learner was halfway through simply isn't there any more.
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
  | { k: 'fresh' }
  | { k: 'due'; d: number }
  | { k: 'orphan'; d: number; m: Mode }
  | { k: 'drill'; m: Mode; p: string }
  | { k: 'linked'; t: string }
  | { k: 'remedy'; m: Mode; g: string; n: number }
  | { k: 'blindspot'; m: Mode; g: string; n: number };

interface PackedItem { t: SessionItem['type']; s: string; w: string; r: PackedReason }
interface StoredSession { target: string; at: number; i: number; items: PackedItem[] }

/** What counts as "the same session" to come back to. */
const targetKey = (t: Target) => `${t.kind}:${t.name}`;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function packReason(r: SessionReason): PackedReason {
  switch (r.kind) {
    case 'fresh': return { k: 'fresh' };
    case 'due': return { k: 'due', d: r.overdueDays };
    case 'orphan': return { k: 'orphan', d: r.overdueDays, m: r.mode };
    case 'drill': return { k: 'drill', m: r.mode, p: r.parent.id };
    case 'linked': return { k: 'linked', t: r.trigger.id };
    case 'remedy': return { k: 'remedy', m: r.mode, g: r.tag, n: r.misses };
    case 'blindspot': return { k: 'blindspot', m: r.mode, g: r.tag, n: r.misses };
  }
}

/** Null when a referenced word has gone — the caller discards the whole session
 *  rather than resuming a queue with holes in it. */
function unpackReason(r: PackedReason): SessionReason | null {
  switch (r.k) {
    case 'fresh': return { kind: 'fresh' };
    case 'due': return { kind: 'due', overdueDays: r.d };
    case 'orphan': return { kind: 'orphan', overdueDays: r.d, mode: r.m };
    case 'drill': {
      const parent = BY_ID.get(r.p);
      return parent ? { kind: 'drill', mode: r.m, parent } : null;
    }
    case 'linked': {
      const trigger = BY_ID.get(r.t);
      return trigger ? { kind: 'linked', trigger } : null;
    }
    case 'remedy': return { kind: 'remedy', mode: r.m, tag: r.g, misses: r.n };
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
      items: items.map((it) => ({ t: it.type, s: it.srsId, w: it.word.id, r: packReason(it.reason) })),
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
    items.push({ type: p.t, word, srsId: p.s, reason });
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

// ---- the vocabulary→grammar loop -----------------------------------------
// Vocabulary is the trigger, grammar the remediation. Two edges:
//  1. WORD_POINT — learning a function word pulls its grammar point into the
//     session (learn "obwohl" → the Konzessivsätze exercise rides along).
//     Deliberately ignores the CEFR filter: the word in your queue is the
//     license for its structure, whatever the point's nominal level.
//  2. MODE_REMEDY — repeated misses in a word-drill mode pull in the point
//     that teaches the underlying system (keep missing genders → Artikel &
//     Genus). Candidates are ordered easiest-first (Processability: canonical
//     forms before complex ones); the first not-comfortably-scheduled one wins.
// Both stop firing on their own: once the point card is reviewed, FSRS
// schedules it out and it is no longer "due or unseen".
// Ids are `gram:<level>:<title>` from vocab.json; a test validates them.
const WORD_POINT: Record<string, string> = {
  obwohl: 'gram:B1:Konzessivsätze: obwohl',
  weil: 'gram:B1:Nebensätze (weil/dass)',
  dass: 'gram:B1:Nebensätze (weil/dass)',
  damit: 'gram:B1:Finalsätze: damit & um … zu',
  sodass: 'gram:B1:Konsekutivsätze: sodass',
  nachdem: 'gram:B1:Plusquamperfekt & nachdem/bevor',
  bevor: 'gram:B1:Plusquamperfekt & nachdem/bevor',
  sondern: 'gram:B1:Konjunktionen: sondern vs. aber, sowie',
  sogar: 'gram:B1:Fokuspartikeln: nur, auch, sogar, selbst',
  trotzdem: 'gram:B2:Konnektoren (deshalb/trotzdem)',
  deshalb: 'gram:B2:Konnektoren (deshalb/trotzdem)',
  lassen: 'gram:B1:Lassen & Modalverben im Perfekt',
};
/** A grammar point card that should (re-)enter study: unseen or due. */
function pointNeedsStudy(id: string): boolean {
  const c = cardOf(id);
  return !c || isDue(c);
}

/** Grammar points linked to function words in this queue (learn the word →
 *  its structure rides along). Capped; exported for Today's preview + tests. */
export function linkedGrammar(words: Word[], cap = MAX_LINKED): SessionItem[] {
  const out: SessionItem[] = [];
  for (const w of words) {
    if (out.length >= cap) break;
    if (w.kind !== 'word') continue;
    const pid = WORD_POINT[w.term.toLowerCase()];
    if (!pid || !pointNeedsStudy(pid)) continue;
    const point = BY_ID.get(pid);
    if (!point || out.some((it) => it.srsId === pid)) continue;
    // The trigger rides along. buildMixedSession used to re-derive it with a
    // second `words.find(…)` purely to position the item, then drop it.
    out.push({ type: 'flip', word: point, srsId: pid, reason: { kind: 'linked', trigger: w } });
  }
  return out;
}

/** Miss-triggered remediation: for the mode you miss most (≥ threshold in 30
 *  days), the first candidate point that is unseen or due. Capped at one per
 *  session so remediation never crowds out the day's vocabulary. */
export function remedyGrammar(cap = MAX_REMEDY): SessionItem[] {
  const byTag = new Map<string, Mode>();
  (Object.entries(MODE_TAG) as [Mode, string][]).forEach(([m, tag]) => byTag.set(tag, m));
  const out: SessionItem[] = [];
  for (const s of missStats(30)) {
    if (out.length >= cap) break;
    if (s.count < REMEDY_MIN_MISSES) continue;
    const mode = byTag.get(s.tag);
    if (!mode) continue;
    for (const pid of MODE_REMEDY[mode]) {
      if (!pointNeedsStudy(pid)) continue;
      const point = BY_ID.get(pid);
      if (!point || out.some((it) => it.srsId === pid)) continue;
      out.push({
        type: 'flip', word: point, srsId: pid,
        reason: { kind: 'remedy', mode, tag: s.tag, misses: s.count },
      });
      break;
    }
  }
  return out;
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
 *  `teachOnly` strips every drill and grammar point out, leaving pure
 *  vocabulary. The very first session is the one place where a learner has been
 *  taught nothing yet, and interleaving put a Kasus item ("Hier ist ___ Beruf",
 *  den/dem/der/des) six cards in — a case they had never seen named, let alone
 *  explained. Drills start from session two, once there is something to
 *  interleave *with*. */
export function buildMixedSession(target: Target, teachOnly = false): SessionItem[] {
  const words = buildSession(target);
  const now = Date.now();
  if (teachOnly) {
    return words.map((w) => ({ type: 'flip' as const, word: w, srsId: w.id, reason: flipReason(w, now) }));
  }

  const drills = new Map<number, SessionItem>(); // flip index → its drill
  let freshBudget = MAX_FRESH_DRILLS;

  words.forEach((w, idx) => {
    if (w.kind === 'grammar') return; // rule cards have no word drills
    const modes = eligibleModes(w);
    if (modes.length === 0) return;
    const due = modes.filter((m) => { const c = cardOf(gymId(m, w)); return c && isDue(c); });
    let pick: Mode | null = null;
    if (due.length) pick = due[Math.floor(Math.random() * due.length)];
    else if (freshBudget > 0) {
      const fresh = modes.filter((m) => !cardOf(gymId(m, w)));
      if (fresh.length) { pick = fresh[Math.floor(Math.random() * fresh.length)]; freshBudget--; }
    }
    if (pick) {
      drills.set(idx, {
        type: pick, word: w, srsId: gymId(pick, w),
        reason: { kind: 'drill', mode: pick, parent: w },
      });
    }
  });

  const out: SessionItem[] = [];
  words.forEach((w, idx) => {
    out.push({ type: 'flip', word: w, srsId: w.id, reason: flipReason(w, now) });
    const d = drills.get(idx - GAP);
    if (d) out.push(d);
  });
  // drills whose slot ran past the end of the flip queue
  for (let idx = Math.max(0, words.length - GAP); idx < words.length; idx++) {
    const d = drills.get(idx);
    if (d) out.push(d);
  }

  // Orphan due drills: gym cards due for in-scope words whose flip is NOT in
  // this queue. Spread them randomly so Study fully absorbs the Gym's dues.
  const inQueue = new Set(words.map((w) => w.id));
  const scope = new Set(wordsFor(target).map((w) => w.id));
  for (const rawId of dueGymIds()) {
    const parts = rawId.split(':');
    const mode = parts[1] as Mode;
    const wordId = parts.slice(2).join(':'); // user words contain ':' (usr:…)
    if (!(mode in MODE_TAG) || inQueue.has(wordId) || !scope.has(wordId)) continue;
    const w = BY_ID.get(wordId);
    if (!w) continue;
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

  // The vocabulary→grammar loop. Linked points land GAP items after the word
  // that triggered them (structure right after its word); remediation points
  // are spread randomly like blind spots. Both de-duped against the queue.
  for (const g of linkedGrammar(words)) {
    if (out.some((it) => it.srsId === g.srsId)) continue;
    // The trigger now comes with the item rather than being searched for again.
    const trigger = g.reason.kind === 'linked' ? g.reason.trigger : undefined;
    const at = trigger ? out.findIndex((it) => it.type === 'flip' && it.srsId === trigger.id) : -1;
    out.splice(at >= 0 ? Math.min(at + 1 + GAP, out.length) : out.length, 0, g);
  }
  for (const g of remedyGrammar()) {
    if (out.some((it) => it.srsId === g.srsId)) continue;
    out.splice(Math.floor(Math.random() * (out.length + 1)), 0, g);
  }
  return out;
}
