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
