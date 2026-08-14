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
import type { Target } from './types.ts';
import type { View } from './App.tsx';

/** Where you are inside Progress. These were three sibling *destinations*
 *  (Markt / Decks / Wortkarte) reached through a hand-rolled stack; they are
 *  three depths of one place. */
export type ProgressLevel = 'overview' | 'decks' | 'map';

export interface ProgressRoute {
  level: ProgressLevel;
  /** Theme group the deck list is filtered to. */
  group?: string;
  /** Sector the word map is showing. */
  sector?: string;
}

export interface Route {
  view: View;
  progress: ProgressRoute;
  /** Present only for scoped sessions (all / group / sector). */
  target?: Target;
}

// `brain` is a View but deliberately not a nav destination — the same pattern as
// session, placement, interests and profile. DESIGN.md §8a argues for exactly
// three places you can *go*; the observatory is somewhere you open from Today,
// not a fourth thing competing for the bottom bar. `exam` follows the same rule:
// it is opened from the Library, and a `#/exam` link has to survive a reload
// because a sitting in progress is the one thing in the app worth restoring.
const VIEWS: View[] = ['today', 'progress', 'library', 'games', 'session', 'placement', 'interests', 'profile', 'brain', 'exam', 'print', 'read'];

export const DEFAULT_ROUTE: Route = { view: 'today', progress: { level: 'overview' } };

/** Read the current hash into a route. Unknown hashes fall back to Today. */
export function parseHash(hash = location.hash): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const view = parts[0] as View;
  if (!VIEWS.includes(view)) return DEFAULT_ROUTE;

  if (view === 'progress') {
    // Names can contain slashes ("Arts, Media & Leisure" won't, but sectors are
    // authored text) — rejoin everything after the level.
    const rest = parts.slice(2).join('/');
    if (parts[1] === 'decks') return { view, progress: { level: 'decks', group: rest || undefined } };
    if (parts[1] === 'map' && rest) return { view, progress: { level: 'map', sector: rest } };
    return { view, progress: { level: 'overview' } };
  }

  if (view === 'session') {
    const kind = parts[1];
    const name = parts.slice(2).join('/');
    if (kind === 'all') return { view, progress: { level: 'overview' }, target: { kind: 'all', name: 'All sectors' } };
    if ((kind === 'group' || kind === 'sector') && name) {
      return { view, progress: { level: 'overview' }, target: { kind, name } };
    }
    return { view, progress: { level: 'overview' } }; // bare #/session → today's session
  }

  return { view, progress: { level: 'overview' } };
}

/** Serialise a route to a hash. */
export function toHash(view: View, target: Target | undefined, progress: ProgressRoute): string {
  if (view === 'progress') {
    if (progress.level === 'decks') {
      return progress.group ? `#/progress/decks/${encodeURIComponent(progress.group)}` : '#/progress/decks';
    }
    if (progress.level === 'map' && progress.sector) {
      return `#/progress/map/${encodeURIComponent(progress.sector)}`;
    }
    return '#/progress';
  }
  if (view === 'session') {
    if (!target || target.kind === 'custom') return '#/session';
    if (target.kind === 'all') return '#/session/all';
    return `#/session/${target.kind}/${encodeURIComponent(target.name)}`;
  }
  return `#/${view}`;
}
