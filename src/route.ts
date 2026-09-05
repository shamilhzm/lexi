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
import type { Target } from './types.ts';
import type { View } from './App.tsx';

/** Where you are inside Words. The index is the deck list; `group` filters it;
 *  `map` is the sector's word map, one level deeper. */
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
}

// Three of these are nav destinations; the rest are places you open from one of
// them. All are linkable, and none of the last four is a fourth thing competing
// for the bottom bar.
const VIEWS: View[] = ['feed', 'session', 'words', 'progress', 'placement', 'interests', 'profile', 'settings', 'text'];

/** Hashes that used to name a destination, and where they land now.
 *
 *  The first two are the 2026-08-26 merge (a syllabus and a typing race were the
 *  same answer to "drill me on something"). The rest are the 2026-09-05 refocus:
 *  the grammar room, the exam room, the worksheet printer and the observatory
 *  are gone. `read` keeps its meaning — the text scanner is what was useful in
 *  it — and the drill rooms point at Progress, which is where the app now says
 *  what you keep getting wrong. */
const ALIAS: Record<string, View> = {
  library: 'progress', games: 'progress', practice: 'progress',
  exam: 'progress', print: 'progress', brain: 'progress',
  read: 'text',
  // The daily briefing. Its job was to get you to a word, so it now *is* one.
  today: 'feed',
};

export const DEFAULT_ROUTE: Route = { view: 'feed', words: { level: 'index' } };

const INDEX: WordsRoute = { level: 'index' };

/** Read the current hash into a route. Unknown hashes fall back to the feed. */
export function parseHash(hash = location.hash): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const head = parts[0];
  const view = (ALIAS[head] ?? head) as View;
  if (!VIEWS.includes(view)) return DEFAULT_ROUTE;

  if (view === 'words') {
    // Names can contain slashes ("Arts, Media & Leisure" won't, but sectors are
    // authored text) — rejoin everything after the level marker.
    const rest = parts.slice(2).join('/');
    if (parts[1] === 'map' && rest) return { view, words: { level: 'map', sector: rest } };
    if (parts[1] === 'g' && rest) return { view, words: { level: 'group', group: rest } };
    return { view, words: INDEX };
  }

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

/** Serialise a route to a hash. */
export function toHash(view: View, target: Target | undefined, words: WordsRoute): string {
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
