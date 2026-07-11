// Mixed study sessions: vocabulary flips interleaved with grammar drills
// (gender / plural / conjugation / cloze) for the same words. Interleaved
// retrieval in varied formats beats blocked practice, so a word you just
// flipped resurfaces a few items later as a drill. Drill items reuse the
// Gym's namespaced FSRS cards (gym:<mode>:<wordId>) — both surfaces share
// one schedule and past Gym progress carries over.
import type { Word, Target } from './types.ts';
import { buildSession, cardOf, wordsFor, dueGymIds, missStats } from './store.ts';
import { BY_ID } from './data/index.ts';
import { isDue } from './srs.ts';
import { eligibleModes, gymId, MODE_TAG, type Mode } from './views/Fundamentals.tsx';

export interface SessionItem {
  type: 'flip' | Mode;
  word: Word;
  srsId: string; // FSRS card id (word.id for flips, gym:<mode>:<id> for drills)
}

const GAP = 3;               // a word's drill surfaces ~3 items after its flip
const MAX_FRESH_DRILLS = 10; // cap first-time drills so sessions stay bounded
const MAX_BLIND_SPOTS = 4;   // cap blind-spot drills woven into a session

/** Drill modes ranked by how often you miss them (last 30 days), worst first. */
function weakModes(): Mode[] {
  const byTag = new Map<string, Mode>();
  (Object.entries(MODE_TAG) as [Mode, string][]).forEach(([m, tag]) => byTag.set(tag, m));
  const out: Mode[] = [];
  for (const s of missStats(30)) { const m = byTag.get(s.tag); if (m && !out.includes(m)) out.push(m); }
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
  for (const m of modes) {
    for (const w of words) {
      if (out.length >= cap) return out;
      if (!eligibleModes(w).includes(m)) continue;
      const srsId = gymId(m, w);
      const c = cardOf(srsId);
      if (c && !isDue(c, now)) continue;          // already comfortably scheduled
      if (out.some((it) => it.srsId === srsId)) continue;
      out.push({ type: m, word: w, srsId });
    }
  }
  return out;
}

/** Flip queue from the store, woven with at most one drill per word:
 *  due drills always ride along; unseen drills fill up to the cap. */
export function buildMixedSession(target: Target): SessionItem[] {
  const words = buildSession(target);
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
    if (pick) drills.set(idx, { type: pick, word: w, srsId: gymId(pick, w) });
  });

  const out: SessionItem[] = [];
  words.forEach((w, idx) => {
    out.push({ type: 'flip', word: w, srsId: w.id });
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
    out.splice(Math.floor(Math.random() * (out.length + 1)), 0, { type: mode, word: w, srsId: rawId });
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
  return out;
}
