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
// Sessions assembled from an explicit id list (today's briefing, Quick 5) are
// deliberately NOT encoded — the ids are a snapshot of one moment's scheduling,
// and a stale list restored tomorrow would be a lie. `#/session` re-derives the
// day's session instead, which is the honest reading of "back to my session".
//
// ## The 2026-08-26 re-root
//
// The lexicon moved out from under Progress. `#/progress/decks/<group>` said
// *browsing the corpus is a kind of self-assessment*, which is not a thing a
// learner believes: they open a deck to find words, not to be measured. Decks
// and the word map now hang off `#/words`, and Progress keeps only the surfaces
// that answer "how am I doing".
//
// Every retired hash is aliased rather than 404'd — a PWA shortcut, a bookmark
// or a shared deck link from before the move still lands where it meant to.
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

// `brain` is a View but deliberately not a nav destination — the same pattern as
// session, placement, interests and profile. The observatory is somewhere you
// open from Progress, not a sixth thing competing for the bottom bar. `exam` and
// `print` follow the same rule: both are opened from Practice, and a `#/exam`
// link has to survive a reload because a sitting in progress is the one thing in
// the app worth restoring.
const VIEWS: View[] = ['today', 'words', 'practice', 'read', 'progress', 'session', 'placement', 'interests', 'profile', 'brain', 'exam', 'print'];

/** Hashes that used to name a destination, and what they mean now.
 *
 *  `library` and `games` merged into Practice: a syllabus you look things up in
 *  and a typing race are the same answer to "drill me on something", and Games
 *  was a whole tab spending itself on one card. */
const ALIAS: Record<string, View> = { library: 'practice', games: 'practice' };

export const DEFAULT_ROUTE: Route = { view: 'today', words: { level: 'index' } };

const INDEX: WordsRoute = { level: 'index' };

/** Read the current hash into a route. Unknown hashes fall back to Today. */
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
    // are now Words routes; anything else on Progress is the overview.
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
