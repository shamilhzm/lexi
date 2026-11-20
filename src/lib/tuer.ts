// Der Türsteher, phase 0 (2026-11-20): the door in front of a distracting app.
//
// iOS gives an app no signal when another app opens, so the door is opened by a
// Shortcuts automation the learner makes: "When Reddit is opened, run Lexi
// Türsteher with the text `reddit`". That shortcut opens `#/tuer/reddit` unless a
// pass is still running. Here the learner answers the next three cards of Üben,
// then Lexi runs a second shortcut, "Lexi Pass", which writes the pass and opens
// Reddit again. The automation fires a second time, finds the pass, and steps aside.
//
// No native code, so the habit can be tested before the platform is built. The
// plan and its research: docs/BACKLOG.md, "Der Türsteher, Moment mal and the widgets".
//
// Rules it keeps (VISION's vocabulary ruling): every answer is a deliberate press
// on a property of the word, graded through the same `review()` as Üben. The door
// opens on *trying*, never on being right. Skip and close are always there.
import type { SessionItem } from '../session.ts';

export interface GateApp { slug: string; name: string; open?: string }

/** Apps the setup guide names, with the URL that reopens each one. A slug Lexi
 *  does not know still gets a door; it just cannot be reopened for you. */
export const GATE_APPS: GateApp[] = [
  { slug: 'reddit', name: 'Reddit', open: 'reddit://' },
  { slug: 'instagram', name: 'Instagram', open: 'instagram://' },
  { slug: 'youtube', name: 'YouTube', open: 'youtube://' },
  { slug: 'tiktok', name: 'TikTok', open: 'tiktok://' },
  { slug: 'x', name: 'X', open: 'twitter://' },
];

/** How many cards stand at the door. */
export const GATE_SIZE = 3;
/** How long the pass lasts. Written into the "Lexi Pass" shortcut, said here. */
export const PASS_MINUTES = 15;
export const PASS_SHORTCUT = 'Lexi Pass';
export const GATE_SHORTCUT = 'Lexi Türsteher';

/** `#/tuer` is the setup guide, `#/tuer/<slug>` is a door. Anything else is not
 *  the Türsteher's (null). */
export function parseGateHash(hash: string): { app: GateApp | null } | null {
  const m = /^#\/tuer(?:\/([^/?#]*))?\/?$/.exec(hash);
  if (!m) return null;
  const slug = decodeURIComponent(m[1] ?? '').trim().toLowerCase();
  if (!slug) return { app: null };
  const known = GATE_APPS.find((a) => a.slug === slug);
  if (known) return { app: known };
  const name = slug.replace(/(^|[-_\s])(\p{L})/gu, (_, sep: string, ch: string) => (sep ? ' ' : '') + ch.toUpperCase());
  return { app: { slug, name } };
}

/** The link that runs "Lexi Pass": it saves the pass and reopens the app. With
 *  no way back into a slug Lexi does not know, the input is empty and the
 *  shortcut only saves the pass. */
export function passUrl(app: GateApp): string {
  const q = new URLSearchParams({ name: PASS_SHORTCUT, input: 'text', text: app.open ?? '' });
  return `shortcuts://run-shortcut?${q.toString().replace(/\+/g, '%20')}`;
}

/** The URL the "Lexi Türsteher" shortcut opens, for this deploy. `base` is the
 *  page's own address without the hash. */
export function gateUrl(base: string, slug = ''): string {
  return `${base}#/tuer/${slug}`;
}

/** Which of today's Üben items stand at the door.
 *
 *  Reviews first: a card that came due, a drill that waited, a blind spot. Then
 *  the queue's own order, which already serves saved words before anything else.
 *  Two kinds never come alone: a `drill` names a flip "a few cards ago" that the
 *  door never showed, and a `retry` is the second showing of one. */
export function pickGateItems(queue: SessionItem[], n = GATE_SIZE): SessionItem[] {
  const usable = queue.filter((it) => it.reason.kind !== 'drill' && it.reason.kind !== 'retry');
  const isReview = (it: SessionItem) =>
    it.reason.kind === 'due' || it.reason.kind === 'orphan' || it.reason.kind === 'blindspot';
  const seen = new Set<string>();
  const out: SessionItem[] = [];
  for (const it of [...usable.filter(isReview), ...usable.filter((it) => !isReview(it))]) {
    if (out.length >= n) break;
    if (seen.has(it.word.id)) continue; // one word, one appearance
    seen.add(it.word.id);
    out.push(it);
  }
  return out;
}

// ---- the tally ------------------------------------------------------------
//
// Phase 0 asks one question after two weeks: did the door make you study on more
// days? The days come from the review log the app already keeps. This only counts
// what happened at the door, per day, so the answer can be read alongside it.
// Not in the backup on purpose: it describes a prototype, and losing it costs a
// learner nothing they built.

export type GateEvent = 'door' | 'skip' | 'close';
export interface GateDay { doors: number; skips: number; closes: number; words: number }
export type GateTally = Record<string, GateDay>; // YYYY-MM-DD → counts

export const TALLY_KEY = 'lexi.tuer.v1';

interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }

function today(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function readTally(kv: KV): GateTally {
  try {
    const raw = kv.getItem(TALLY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed as GateTally : {};
  } catch { return {}; }
}

/** Count one outcome at the door. `words` is how many cards were answered. */
export function recordGate(kv: KV, event: GateEvent, words: number, now = new Date()): GateDay {
  const tally = readTally(kv);
  const key = today(now);
  const day = tally[key] ?? { doors: 0, skips: 0, closes: 0, words: 0 };
  if (event === 'door') day.doors++;
  else if (event === 'skip') day.skips++;
  else day.closes++;
  day.words += Math.max(0, words);
  tally[key] = day;
  try { kv.setItem(TALLY_KEY, JSON.stringify(tally)); } catch { /* storage full or blocked: the door still opens */ }
  return day;
}

export function todayAtDoor(kv: KV, now = new Date()): GateDay {
  return readTally(kv)[today(now)] ?? { doors: 0, skips: 0, closes: 0, words: 0 };
}
