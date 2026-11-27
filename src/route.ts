// URL state, in the hash.
//
// Lexi had no routing at all until recently: the view was a useState, Explore
// reimplemented its own back-stack because of it, and installed as a PWA the
// Android system back gesture had no history entry to pop, so it closed the app
// instead of going back a screen.
//
// The hash (rather than the History API) keeps this working on the project's
// `/lexi/` GitHub-Pages base with no server rewrites.
//
// Sessions assembled from an explicit id list (the day's queue, a text's unlock
// list) are deliberately NOT encoded — the ids are a snapshot of one moment's
// scheduling, and a stale list restored tomorrow would be a lie. Bare
// `#/session` re-derives the day's queue instead, which is the honest reading of
// "back to my session".
//
// **The root is `#/feed`** (2026-09-05): opening Lexi is opening a German word,
// and the session is a place you go from there.
//
// ## Retired hashes
//
// Nothing 404s. A PWA shortcut, a bookmark or a link shared before a move still
// lands somewhere sensible — `#/progress/decks/<group>` from before the lexicon
// moved out from under Progress, and the whole grammar/exam/reader wing that the
// 2026-09-05 refocus removed. The rooms that are gone alias to the nearest room
// that still exists rather than dumping the learner on Today with no
// explanation of where their link went.
import { ALL_LEVELS, type CEFR, type Target } from './types.ts';
import type { View } from './App.tsx';

/** Where you are inside Words. The index is the deck list; `group` filters it;
 *  `map` is the sector's word map, one level deeper. (The course lived here as
 *  `kurs` until 2026-11-27; it is part of Üben now, at `#/kurs`.) */
export type WordsLevel = 'index' | 'group' | 'map';

export interface WordsRoute {
  level: WordsLevel;
  /** Theme group the deck list is filtered to. */
  group?: string;
  /** Sector the word map is showing. */
  sector?: string;
}

export interface Route {
  view: View;
  words: WordsRoute;
  /** Present only for scoped sessions (all / group / sector). */
  target?: Target;
  /** The level the course shows (`#/kurs/<level>`); absent means the learner's
   *  study level. */
  course?: CEFR;
}

// Three of these are nav destinations; the rest are places you open from one of
// them. All are linkable, and none of the last four is a fourth thing competing
// for the bottom bar.
const VIEWS: View[] = ['feed', 'session', 'kurs', 'words', 'exam', 'progress', 'placement', 'interests', 'profile', 'settings', 'text'];

/** A level named in a hash, or the learner's own when it names none we teach. */
function levelIn(s: string | undefined): CEFR | undefined {
  const l = s?.toUpperCase() as CEFR | undefined;
  return l && ALL_LEVELS.includes(l) ? l : undefined;
}

/** Hashes that used to name a destination, and where they land now.
 *
 *  The first two are the 2026-08-26 merge (a syllabus and a typing race were the
 *  same answer to "drill me on something"). The rest are the 2026-09-05 refocus:
 *  the grammar room, the exam room, the worksheet printer and the observatory
 *  are gone. `read` keeps its meaning — the text scanner is what was useful in
 *  it — and the drill rooms point at Progress, which is where the app now says
 *  what you keep getting wrong.
 *
 *  `exam` left this table on 2026-11-26: the exam room is a destination again
 *  (VISION, *The exam room returns*), so an old pinned `#/exam` lands in it. */
const ALIAS: Record<string, View> = {
  library: 'progress', games: 'progress', practice: 'progress',
  print: 'progress', brain: 'progress',
  read: 'text',
  // The daily briefing. Its job was to get you to a word, so it now *is* one.
  today: 'feed',
};

export const DEFAULT_ROUTE: Route = { view: 'feed', words: { level: 'index' } };

const INDEX: WordsRoute = { level: 'index' };

/** `decodeURIComponent` throws on a stray `%` (`#/words/g/100%`), and this runs
 *  in App's first render, so one malformed link was a blank screen. A segment
 *  that will not decode is read as typed. */
function decode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Read the current hash into a route. Unknown hashes fall back to the feed. */
export function parseHash(hash = location.hash): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decode);
  const head = parts[0];
  const view = (ALIAS[head] ?? head) as View;
  if (!VIEWS.includes(view)) return DEFAULT_ROUTE;

  if (view === 'words') {
    // Names can contain slashes ("Arts, Media & Leisure" won't, but sectors are
    // authored text) — rejoin everything after the level marker.
    const rest = parts.slice(2).join('/');
    if (parts[1] === 'map' && rest) return { view, words: { level: 'map', sector: rest } };
    if (parts[1] === 'g' && rest) return { view, words: { level: 'group', group: rest } };
    // The course's address from 2026-11-19 to 2026-11-27, when it moved into Üben.
    if (parts[1] === 'kurs') return { view: 'kurs', words: INDEX, course: levelIn(parts[2]) };
    return { view, words: INDEX };
  }

  // The course: a part of Üben, beside the day's session (VISION, *The course
  // moves into Üben*).
  if (view === 'kurs') return { view, words: INDEX, course: levelIn(parts[1]) };

  if (view === 'progress') {
    // The retired depth. `#/progress/decks/<group>` and `#/progress/map/<sector>`
    // are Words routes; anything else on Progress is the overview.
    const rest = parts.slice(2).join('/');
    if (parts[1] === 'decks') {
      return { view: 'words', words: rest ? { level: 'group', group: rest } : INDEX };
    }
    if (parts[1] === 'map' && rest) return { view: 'words', words: { level: 'map', sector: rest } };
    return { view, words: INDEX };
  }

  if (view === 'session') {
    const kind = parts[1];
    const name = parts.slice(2).join('/');
    if (kind === 'all') return { view, words: INDEX, target: { kind: 'all', name: 'All sectors' } };
    if ((kind === 'group' || kind === 'sector') && name) {
      return { view, words: INDEX, target: { kind, name } };
    }
    return { view, words: INDEX }; // bare #/session → today's session
  }

  return { view, words: INDEX };
}

/** `#/w/<card id>`: a link to one word, from a word page (`/wort/…`, PAGES.md) or a
 *  shared link. It is not a view. `parseHash` reads it as the feed, which is what
 *  sits underneath, and App opens the word's entry over it. Arriving saves
 *  nothing: only the bookmark does. */
export function parseWordHash(hash = location.hash): string | null {
  const m = /^#\/w\/(.+)$/.exec(hash);
  return m ? decode(m[1]) || null : null;
}

/** The hash a word link uses. Ids carry spaces and colons (`voc:A1:der Name`). */
export const wordHash = (id: string) => `#/w/${encodeURIComponent(id)}`;

/** What the address bar does when the app's route changes, from what it shows now
 *  (`current`) to what the state says (`next`). `settle` rewrites the current entry
 *  in place first; `hash` is then written, replacing or pushing.
 *
 *  **A word link keeps its hash while its entry is open**, so a reload brings the
 *  word back: the learner's own, or the one `reloadIfBuildMoved` makes at boot
 *  after a deploy. Rewriting it to the feed on arrival sent a returning visitor
 *  who opened a link just after a deploy to the feed (2026-11-22). Once the entry
 *  closes, the link becomes the feed it sat on, in place, so Back leaves the app
 *  rather than reopening the word.
 *
 *  The session replaces rather than pushes: Back from the card leaves the app once
 *  instead of walking a trail of identical entries. So does a level chip inside the
 *  course, and the switch between the day's session and the course: switching
 *  A2 → B1, or *Heute* → *Kurs*, is a tab, not a step. */
export function hashWrite(current: string, next: string, o: { view: View; linkOpen: boolean }):
  { settle?: string; hash?: string; replace?: boolean } {
  let settle: string | undefined;
  if (parseWordHash(current) !== null) {
    if (o.linkOpen && o.view === 'feed') return {};
    settle = current = toHash('feed', undefined, INDEX);
  }
  if (current === next) return settle ? { settle } : {};
  const inUeben = (h: string) => h.startsWith('#/kurs') || h.startsWith('#/session');
  // An alias rewritten to its canonical spelling (`#/words/kurs/B1` → `#/kurs/B1`, an
  // empty hash → `#/feed`) is the same place. Pushing it left a Back entry that led
  // to the page already showing (2026-11-27).
  const r = parseHash(current);
  const alias = toHash(r.view, r.target, r.words, r.course) === next;
  const replace = o.view === 'session' || alias || (next.startsWith('#/kurs') && inUeben(current));
  return { settle, hash: next, replace };
}

/** The deck names the loaded corpus carries. */
export interface KnownNames {
  groups: ReadonlySet<string>;
  sectors: ReadonlySet<string>;
}

/** Drop the parts of a route that name a deck the corpus does not have.
 *
 *  `parseHash` cannot know which names exist, and the views trusted it: a link to
 *  a renamed group (or one typed by hand) drew an empty deck page with a
 *  "Study <name>" button, and the session it started said "every card in this
 *  deck is scheduled ahead", which is false: there is no deck. A name that is
 *  gone lands on the nearest level that exists, the same rule as the aliases. */
export function knownRoute(r: Route, k: KnownNames): Route {
  const t = r.target;
  if (t && ((t.kind === 'group' && !k.groups.has(t.name)) || (t.kind === 'sector' && !k.sectors.has(t.name)))) {
    return { view: 'words', words: INDEX };
  }
  const w = r.words;
  const groupOk = !!w.group && k.groups.has(w.group);
  if (w.level === 'group' && !groupOk) return { ...r, words: INDEX };
  if (w.level === 'map' && !(w.sector && k.sectors.has(w.sector))) {
    return { ...r, words: groupOk ? { level: 'group', group: w.group } : INDEX };
  }
  return r;
}

/** Serialise a route to a hash. */
export function toHash(view: View, target: Target | undefined, words: WordsRoute, course?: CEFR): string {
  if (view === 'kurs') return course ? `#/kurs/${course}` : '#/kurs';
  if (view === 'words') {
    if (words.level === 'map' && words.sector) return `#/words/map/${encodeURIComponent(words.sector)}`;
    if (words.level === 'group' && words.group) return `#/words/g/${encodeURIComponent(words.group)}`;
    return '#/words';
  }
  if (view === 'session') {
    if (!target || target.kind === 'custom') return '#/session';
    if (target.kind === 'all') return '#/session/all';
    return `#/session/${target.kind}/${encodeURIComponent(target.name)}`;
  }
  return `#/${view}`;
}
