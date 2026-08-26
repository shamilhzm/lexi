// The router had no tests. It acquired them the day the destination set changed
// from four to five and every previously-valid hash became a redirect — which is
// exactly the shape of thing that works on the day it ships and rots quietly
// afterwards, because nothing a learner does exercises an old bookmark except
// opening one.
//
// Two invariants here, and they are different:
//
//   1. **round-trip** — `toHash(parseHash(h))` is stable for every live route.
//      This is what stops a route being reachable but unlinkable.
//   2. **aliases resolve** — every hash the app has ever shipped as a destination
//      still lands somewhere sensible. A 404 here is a learner's PWA shortcut
//      dumping them on Today with no explanation.
//
// `parseHash` takes its hash as an argument precisely so this can run in Node.
import { describe, it, expect } from 'vitest';
import { parseHash, toHash, DEFAULT_ROUTE } from './route.ts';

/** Every destination that is a place you can *go*, plus the ones that are only
 *  opened from somewhere but must survive a reload. Enumerated from `VIEWS` in
 *  route.ts — LESSONS' checklist: a sweep is only as wide as its list. */
const LIVE = [
  '#/today', '#/words', '#/practice', '#/read', '#/progress',
  '#/session', '#/placement', '#/interests', '#/profile', '#/brain', '#/exam', '#/print',
] as const;

describe('parseHash / toHash round-trip', () => {
  it.each(LIVE)('%s survives a round trip', (hash) => {
    const r = parseHash(hash);
    expect(toHash(r.view, r.target, r.words)).toBe(hash);
  });

  it('defaults an unknown hash to Today rather than rendering nothing', () => {
    // Case matters: the view names are lower-case, so `#/PRACTICE` is unknown.
    for (const junk of ['', '#', '#/', '#/nope', '#/PRACTICE', '#/words2']) {
      expect(parseHash(junk)).toEqual(DEFAULT_ROUTE);
    }
  });

  // A *known* head with a junk tail is a different case and must not fall to
  // Today: the learner asked for Words and should get Words, at its own default
  // depth. Pinned because the obvious "unknown → DEFAULT_ROUTE" refactor would
  // swallow the head as well.
  it('keeps the destination when only the tail is junk', () => {
    expect(parseHash('#/words/../../etc')).toEqual({ view: 'words', words: { level: 'index' } });
    expect(parseHash('#/words/nonsense/x')).toEqual({ view: 'words', words: { level: 'index' } });
    expect(parseHash('#/progress/nonsense')).toMatchObject({ view: 'progress' });
  });
});

describe('Words depth', () => {
  it('routes the index, a group and a sector map', () => {
    expect(parseHash('#/words').words).toEqual({ level: 'index' });
    expect(parseHash('#/words/g/Daily%20Life').words).toEqual({ level: 'group', group: 'Daily Life' });
    expect(parseHash('#/words/map/Core%20verbs').words).toEqual({ level: 'map', sector: 'Core verbs' });
  });

  // Sector names are authored text. "Arts, Media & Leisure" has no slash today and
  // nothing stops one arriving, so the parser rejoins the tail rather than taking
  // parts[2].
  //
  // **The first version of this test did not test that**, and the mutation check is
  // the only reason it is known: it used `%2F`, which `split('/')` never splits, so
  // `parts[2]` already held the whole name and swapping the rejoin for `parts[2]`
  // left the suite green. The rejoin defends the *unencoded* case — a hand-typed
  // URL, or a link written before `encodeURIComponent` was applied — so that is what
  // is asserted. `toHash` canonicalises it back to the encoded form, which is why
  // this is not a round-trip assertion.
  it('rejoins a literal slash in a sector name', () => {
    const r = parseHash('#/words/map/Health / Body');
    expect(r.words.sector).toBe('Health / Body');
    expect(toHash(r.view, r.target, r.words)).toBe('#/words/map/Health%20%2F%20Body');
  });

  it('round-trips an encoded slash', () => {
    const r = parseHash('#/words/map/Health%20%2F%20Body');
    expect(r.words.sector).toBe('Health / Body');
    expect(toHash(r.view, r.target, r.words)).toBe('#/words/map/Health%20%2F%20Body');
  });

  it('falls back to the index when a level marker carries no name', () => {
    expect(parseHash('#/words/g').words).toEqual({ level: 'index' });
    expect(parseHash('#/words/map').words).toEqual({ level: 'index' });
  });
});

describe('retired hashes still land', () => {
  // Shipped as destinations before 2026-08-26. A learner who installed the PWA and
  // pinned one of these must not get Today with no explanation.
  it('sends #/library and #/games to Practice', () => {
    expect(parseHash('#/library').view).toBe('practice');
    expect(parseHash('#/games').view).toBe('practice');
  });

  it('sends the old Progress depth into Words', () => {
    expect(parseHash('#/progress/decks')).toMatchObject({ view: 'words', words: { level: 'index' } });
    expect(parseHash('#/progress/decks/Daily%20Life'))
      .toMatchObject({ view: 'words', words: { level: 'group', group: 'Daily Life' } });
    expect(parseHash('#/progress/map/Core%20verbs'))
      .toMatchObject({ view: 'words', words: { level: 'map', sector: 'Core verbs' } });
  });

  it('leaves #/progress itself on Progress', () => {
    expect(parseHash('#/progress')).toMatchObject({ view: 'progress', words: { level: 'index' } });
  });

  // The alias table is keyed by the raw first segment, so anything inherited from
  // Object.prototype would resolve to a function and be `includes`-checked against
  // VIEWS. It isn't a View, so this lands on Today — but assert it, because the
  // failure mode of `ALIAS[head] ?? head` on 'constructor' is a crash, not a 404.
  it('is not confused by prototype keys', () => {
    for (const k of ['#/constructor', '#/toString', '#/__proto__', '#/hasOwnProperty']) {
      expect(parseHash(k)).toEqual(DEFAULT_ROUTE);
    }
  });
});

describe('sessions', () => {
  it('encodes scoped targets and re-derives the daily one', () => {
    expect(parseHash('#/session').target).toBeUndefined();
    expect(parseHash('#/session/all').target).toEqual({ kind: 'all', name: 'All sectors' });
    expect(parseHash('#/session/sector/Core%20verbs').target)
      .toEqual({ kind: 'sector', name: 'Core verbs' });
  });

  // The reason `#/session` carries no ids: a briefing is a snapshot of one moment's
  // scheduling, and restoring a stale list tomorrow would be a lie.
  it('never serialises a custom target', () => {
    expect(toHash('session', { kind: 'custom', name: 'Today’s session', ids: ['a', 'b'] }, { level: 'index' }))
      .toBe('#/session');
  });
});
