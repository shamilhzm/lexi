// URL state, in the hash.
//
// Lexi had no routing at all: the view was a useState, Explore reimplemented its
// own back-stack because of it, and three things followed from that —
//
//   1. A refresh always dropped you back on Home, mid-session included.
//   2. Nothing was linkable, so "look at this deck" was not a thing you could send.
//   3. Worst: installed as a PWA, the Android system back gesture had no history
//      entry to pop, so it closed the app instead of going back a screen.
//
// The hash (rather than the History API) keeps this working on the project's
// `/lexi/` GitHub-Pages base with no server rewrites.
//
// Sessions assembled from an explicit id list (today's briefing, Quick 5) are
// deliberately NOT encoded — the ids are a snapshot of one moment's scheduling,
// and a stale list restored tomorrow would be a lie. `#/review` re-derives the
// day's session instead, which is the honest reading of "back to my session".
import type { Target } from './types.ts';
import type { View } from './App.tsx';

export type ExploreLevel = 'markt' | 'decks';

export interface Route {
  view: View;
  explore: ExploreLevel;
  /** Present only for scoped sessions (all / group / sector). */
  target?: Target;
}

const VIEWS: View[] = ['home', 'explore', 'grammar', 'stats', 'review', 'placement', 'interests', 'profile'];

export const DEFAULT_ROUTE: Route = { view: 'home', explore: 'markt' };

/** Read the current hash into a route. Unknown hashes fall back to Home. */
export function parseHash(hash = location.hash): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const view = parts[0] as View;
  if (!VIEWS.includes(view)) return DEFAULT_ROUTE;

  if (view === 'explore') {
    return { view, explore: parts[1] === 'decks' ? 'decks' : 'markt' };
  }

  if (view === 'review') {
    const kind = parts[1];
    const name = parts.slice(2).join('/'); // sector names can contain slashes
    if (kind === 'all') return { view, explore: 'markt', target: { kind: 'all', name: 'All sectors' } };
    if ((kind === 'group' || kind === 'sector') && name) {
      return { view, explore: 'markt', target: { kind, name } };
    }
    return { view, explore: 'markt' }; // bare #/review → today's session
  }

  return { view, explore: 'markt' };
}

/** Serialise a route to a hash. Returns '' for the default so Home stays clean. */
export function toHash(view: View, target: Target | undefined, explore: ExploreLevel): string {
  if (view === 'home') return '#/home';
  if (view === 'explore') return explore === 'decks' ? '#/explore/decks' : '#/explore';
  if (view === 'review') {
    if (!target || target.kind === 'custom') return '#/review';
    if (target.kind === 'all') return '#/review/all';
    return `#/review/${target.kind}/${encodeURIComponent(target.name)}`;
  }
  return `#/${view}`;
}
