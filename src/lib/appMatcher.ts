// One matcher for the whole app, built from the live lexicon.
//
// `buildMatcher` walks the corpus and generates every inflection it can, which is
// far too expensive to do per lookup and slightly too expensive to do twice. Both
// the reading surface and the comprehension meter need it, so it lives here rather
// than being cached separately in each — the shape of duplication that has already
// produced two bugs in two days (`reader.ts` and `matcher.ts` each indexing
// `w.plural` raw, then only one of them being fixed).
//
// Deliberately *not* inside `matcher.ts`: that module is imported by the corpus
// scripts under node, where `WORDS` does not exist and pulling in `data/index.ts`
// would drag the app's boot path into a build-time script.
//
// The lexicon is not fixed at boot — `initData` replaces `WORDS` and
// `registerWords` appends — so the cache carries its own provenance and rebuilds
// itself rather than relying on every writer to remember to invalidate it.
import { buildMatcher, type Matcher } from './matcher.ts';
import { WORDS } from '../data/index.ts';
import type { Word } from '../types.ts';

let cached: Matcher | null = null;
let builtFrom: Word[] | null = null;
let builtLen = 0;

export function appMatcher(): Matcher {
  if (!cached || builtFrom !== WORDS || builtLen !== WORDS.length) {
    cached = buildMatcher(WORDS);
    builtFrom = WORDS;
    builtLen = WORDS.length;
  }
  return cached;
}

/** Force the next call to rebuild. Production growth is picked up on its own; a
 *  test can swap the lexicon for one of the same length, which identity misses. */
export function resetAppMatcher() { cached = null; builtFrom = null; builtLen = 0; }
