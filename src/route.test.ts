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
import { parseHash, toHash, knownRoute, DEFAULT_ROUTE, parseWordHash, wordHash, hashWrite } from './route.ts';

/** Every destination that is a place you can *go*, plus the ones that are only
 *  opened from somewhere but must survive a reload. Enumerated from `VIEWS` in
 *  route.ts — LESSONS' checklist: a sweep is only as wide as its list. */
const LIVE = [
  '#/feed', '#/words', '#/progress',
  '#/session', '#/placement', '#/interests', '#/profile', '#/text',
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
  // Shipped as destinations before the 2026-08-26 merge and the 2026-09-05
  // refocus. A learner who installed the PWA and pinned one of these must not get
  // Today with no explanation of where their link went.
  it('sends the retired drill rooms to Progress, where weaknesses now live', () => {
    for (const h of ['#/library', '#/games', '#/practice', '#/print', '#/brain']) {
      expect(parseHash(h).view, h).toBe('progress');
    }
  });

  it('opens the exam room at #/exam again (2026-11-26)', () => {
    expect(parseHash('#/exam').view).toBe('exam');
    expect(parseHash('#/exam/telc-b1-01').view).toBe('exam');
  });

  it('sends #/read to the text scanner, which is what survived of it', () => {
    expect(parseHash('#/read').view).toBe('text');
  });

  // The one most likely to be pinned: `#/today` was the root, the PWA shortcut
  // and the default hash for a year. Its Start button always went to a card, so
  // the hash does too.
  it('sends #/today to the feed, which is the root now', () => {
    expect(parseHash('#/today').view).toBe('feed');
  });

  it('opens on the feed, not on a test', () => {
    expect(parseHash('').view).toBe('feed');
    expect(parseHash('#/').view).toBe('feed');
    expect(parseHash('#/nonsense').view).toBe('feed');
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

describe('the course', () => {
  it('round-trips a level, and reads a bare course as the learner’s own level', () => {
    for (const h of ['#/words/kurs/A1', '#/words/kurs/C1', '#/words/kurs']) {
      const r = parseHash(h);
      expect(r.words.level).toBe('kurs');
      expect(toHash(r.view, r.target, r.words)).toBe(h);
    }
    expect(parseHash('#/words/kurs/b2').words.course).toBe('B2');
    // An unknown level is the learner's own, not a 404.
    expect(parseHash('#/words/kurs/D7').words).toEqual({ level: 'kurs', course: undefined });
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

// Found by a persona pass (2026-11-20): a hand-typed or truncated link. Both of
// these used to reach a learner's screen, one as a blank page.
describe('hostile and stale links', () => {
  it('reads a stray % as typed instead of throwing on first render', () => {
    for (const h of ['#/words/g/100%', '#/words/map/%E0%A4', '#/session/group/%', '#/%']) {
      expect(() => parseHash(h)).not.toThrow();
    }
    expect(parseHash('#/words/g/100%').words).toEqual({ level: 'group', group: '100%' });
  });

  const known = { groups: new Set(['Daily Life']), sectors: new Set(['Core verbs']) };

  it('lands a deck name the corpus does not carry on the nearest level that exists', () => {
    expect(knownRoute(parseHash('#/words/g/Gone'), known).words).toEqual({ level: 'index' });
    expect(knownRoute(parseHash('#/words/map/Gone'), known).words).toEqual({ level: 'index' });
    expect(knownRoute(parseHash('#/progress/decks/Gone'), known).words).toEqual({ level: 'index' });
    // A session on a deck that is gone is not "nothing due": there is no deck.
    expect(knownRoute(parseHash('#/session/group/Gone'), known)).toEqual({ view: 'words', words: { level: 'index' } });
    expect(knownRoute(parseHash('#/session/sector/Gone'), known)).toEqual({ view: 'words', words: { level: 'index' } });
  });

  it('leaves every name the corpus does carry alone', () => {
    for (const h of ['#/words/g/Daily%20Life', '#/words/map/Core%20verbs', '#/session/sector/Core%20verbs',
      '#/session/group/Daily%20Life', '#/session/all', '#/session', '#/words/kurs/B1', '#/feed']) {
      const r = parseHash(h);
      expect(knownRoute(r, known)).toBe(r);
    }
  });
});

describe('word links (#/w/<id>)', () => {
  it('round-trips an id with spaces, colons and an umlaut', () => {
    for (const id of ['voc:A1:der Name', 'voc:B2:die Größe', 'voc:A2:sich freuen auf']) {
      expect(parseWordHash(wordHash(id))).toBe(id);
    }
  });
  it('is not a view: the feed is what sits underneath', () => {
    expect(parseHash(wordHash('voc:A1:der Name'))).toEqual(DEFAULT_ROUTE);
  });
  it('ignores every other hash, and an empty or broken id', () => {
    for (const h of ['', '#/', '#/feed', '#/words', '#/w', '#/w/', '#main', '#/wort/haus']) {
      expect(parseWordHash(h)).toBeNull();
    }
    expect(parseWordHash('#/w/100%')).toBe('100%'); // a stray % reads as typed, never throws
  });
});

describe('what the address bar does (hashWrite)', () => {
  const link = wordHash('voc:A1:der Brief');
  it('keeps a word link while its entry is open, so a reload reopens the word', () => {
    expect(hashWrite(link, '#/feed', { view: 'feed', linkOpen: true })).toEqual({});
  });
  it('turns a closed link into the feed in place, so Back does not reopen it', () => {
    expect(hashWrite(link, '#/feed', { view: 'feed', linkOpen: false })).toEqual({ settle: '#/feed' });
  });
  it('pushes a tab over that feed, so Back from the tab lands on the feed', () => {
    expect(hashWrite(link, '#/words', { view: 'words', linkOpen: false }))
      .toEqual({ settle: '#/feed', hash: '#/words', replace: false });
  });
  it('lets a session take the address even with the link still open', () => {
    expect(hashWrite(link, '#/session', { view: 'session', linkOpen: true }))
      .toEqual({ settle: '#/feed', hash: '#/session', replace: true });
  });
  it('pushes a tab, replaces a session and a course chip, and leaves a match alone', () => {
    expect(hashWrite('#/feed', '#/words', { view: 'words', linkOpen: false })).toEqual({ hash: '#/words', replace: false });
    expect(hashWrite('#/feed', '#/session', { view: 'session', linkOpen: false })).toEqual({ hash: '#/session', replace: true });
    expect(hashWrite('#/words/kurs/A2', '#/words/kurs/B1', { view: 'words', linkOpen: false }))
      .toEqual({ hash: '#/words/kurs/B1', replace: true });
    expect(hashWrite('#/words', '#/words', { view: 'words', linkOpen: false })).toEqual({});
  });
});
