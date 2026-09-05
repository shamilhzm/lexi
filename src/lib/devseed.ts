// Persona seeding — **development only, and structurally unable to ship.**
//
// Every call site is inside `if (import.meta.env.DEV)`, which Vite replaces with
// `false` in a production build, so the whole module is dropped by tree-shaking.
// Check that before trusting this sentence: `npm run build && grep -c devseed
// dist/assets/*.js` must be 0.
//
// ## Why this exists
//
// The app's interesting states are *earned* — a B1 learner with a 400-card
// backlog and a gender blind spot is 2,000 grades and thirty days away. Testing
// the surfaces that only appear in those states (the backlog burn-down, blind
// spots, the recall drill, "All clear", a finished sector) by driving the UI is
// not slow, it is impossible. So the states are constructed.
//
// It writes through `store.importData`, which is the app's own restore path,
// rather than reaching into storage keys directly: a seeder that knows the key
// layout is a second source of truth that goes stale the first time a key moves.
// The one thing it writes directly is the pair of feed lists, because those are
// settings rather than cards.
import { WORDS } from '../data/index.ts';
import { State } from '../srs.ts';
import type { Word, CEFR } from '../types.ts';

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

/** One FSRS card, in a state the scheduler will believe.
 *
 *  `dueIn` is days from now — negative is overdue. `state` decides what the app
 *  calls it: Review is "known", Learning is "learning", New never gets a card at
 *  all (the absence *is* the state). */
function card(dueIn: number, state: State, reps = 4, lapses = 0) {
  const now = Date.now();
  return {
    due: iso(now + dueIn * DAY),
    stability: Math.max(1, dueIn + 8),
    difficulty: 5.2,
    elapsed_days: Math.max(0, -dueIn),
    scheduled_days: Math.max(1, Math.abs(dueIn) + 3),
    reps,
    lapses,
    state,
    last_review: iso(now - Math.max(1, Math.abs(dueIn)) * DAY),
  };
}

/** Card counts are kept deliberately small — a few hundred, not a few thousand.
 *
 *  Every surface these personas exist to exercise (the heatmap, blind spots, the
 *  recall drill, coverage, "All clear") is driven by *ratios and states*, not by
 *  volume: 400 known words shows all of it. Seeding 2,000 only made each
 *  `importData` a large IndexedDB write, and on the iOS Simulator repeated large
 *  writes wedged Safari's storage and left the app on its boot splash. The
 *  fidelity that cost was zero. */
const MAX_CARDS = 460;

/** Words at or below a level, commonest first — the pool a learner of that level
 *  would plausibly have met. Uses corpus order, which is already band-ordered. */
function pool(upTo: CEFR): Word[] {
  const bands: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const cap = bands.indexOf(upTo);
  return WORDS.filter((w) => bands.indexOf(w.level) <= cap);
}

interface Persona {
  name: string;
  /** What a tester should be looking at on this run. */
  looksAt: string;
  build: () => { cards: Record<string, unknown>; settings: Record<string, string>; visits: string[]; misses: unknown[] };
}

/** Days of visits ending today, for the streak. */
const streakDays = (n: number): string[] => {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.now() - i * DAY).toISOString().slice(0, 10));
  return out;
};

/** A miss log the blind-spot list will rank. */
const missesFor = (tag: string, n: number, terms: string[]) =>
  Array.from({ length: n }, (_, i) => ({
    tag, term: terms[i % terms.length], at: Date.now() - (i % 20) * DAY,
  }));

const LEVELS = (...l: CEFR[]) => JSON.stringify(l);

function make(opts: {
  level?: CEFR;
  filter?: CEFR[];
  /** [knownCount, learningCount, overdueCount] drawn from the level's pool. */
  counts: [number, number, number];
  streak?: number;
  name?: string;
  saved?: number;
  faves?: number;
  misses?: { tag: string; n: number; terms: string[] };
  goal?: { level: CEFR; inDays: number };
  /** Also schedule the recall drill for the first N known words, so the
   *  production track is live rather than theoretical. */
  recall?: number;
  onboarded?: boolean;
}): Persona['build'] {
  return () => {
    const p = pool(opts.level ?? 'A1');
    const scale = Math.min(1, MAX_CARDS / Math.max(1, opts.counts[0] + opts.counts[1] + opts.counts[2]));
    const [known, learning, overdue] = opts.counts.map((n) => Math.round(n * scale)) as [number, number, number];
    const cards: Record<string, unknown> = {};
    let i = 0;
    for (let n = 0; n < known && i < p.length; n++, i++) cards[p[i].id] = card(3 + (n % 40), State.Review, 6);
    for (let n = 0; n < learning && i < p.length; n++, i++) cards[p[i].id] = card(0, State.Learning, 1);
    for (let n = 0; n < overdue && i < p.length; n++, i++) cards[p[i].id] = card(-(2 + (n % 25)), State.Review, 5, 1);
    // Production is scheduled apart from recognition — that split is the reason
    // the recall drill can exist at all, so a persona that has it must have it
    // on its own track.
    for (let n = 0; n < (opts.recall ?? 0) && n < p.length; n++) {
      cards[`gym:recall:${p[n].id}`] = card(-1, State.Review, 3);
    }

    const settings: Record<string, string> = {
      'lexi.onboarded.v1': opts.onboarded === false ? '' : '1',
      'lexi.levels.v1': LEVELS(...(opts.filter ?? ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])),
    };
    if (opts.onboarded === false) delete settings['lexi.onboarded.v1'];
    if (opts.level) settings['lexi.placement.v1'] = opts.level;
    if (opts.name) settings['lexi.profile.name.v1'] = opts.name;
    if (opts.goal) {
      settings['lexi.goal.v1'] = JSON.stringify({
        level: opts.goal.level,
        date: new Date(Date.now() + opts.goal.inDays * DAY).toISOString().slice(0, 10),
      });
    }
    if (opts.saved) {
      const rows = p.slice(known + learning + overdue, known + learning + overdue + opts.saved)
        .map((w) => ({ id: w.id, at: Date.now() - Math.floor(Math.random() * 2) * DAY }));
      settings['lexi.saved.v1'] = JSON.stringify(rows);
    }
    if (opts.faves) {
      settings['lexi.faves.v1'] = JSON.stringify(p.slice(0, opts.faves).map((w) => ({ id: w.id, at: Date.now() })));
    }

    return {
      cards,
      settings,
      visits: streakDays(opts.streak ?? 1),
      misses: opts.misses ? missesFor(opts.misses.tag, opts.misses.n, opts.misses.terms) : [],
    };
  };
}

const GENDER_TAG = 'Gender (der/die/das)';
const PLURAL_TAG = 'Noun plurals';

export const PERSONAS: Record<string, Persona> = {
  cold: {
    name: '1 · Cold visitor',
    looksAt: 'the welcome slot, and whether a stranger can tell what this is',
    build: make({ counts: [0, 0, 0], streak: 1, onboarded: false }),
  },
  day2: {
    name: '2 · Day two, unplaced',
    looksAt: 'the placement nudge, and 10 words in Learning showing 0 “known”',
    build: make({ counts: [0, 10, 0], streak: 2, name: 'Mira' }),
  },
  a1: {
    name: '3 · A1, three weeks in',
    looksAt: 'the first real numbers; A1 descriptors; a small heatmap',
    build: make({ level: 'A1', filter: ['A1'], counts: [90, 14, 8], streak: 14, name: 'Tom',
      misses: { tag: GENDER_TAG, n: 9, terms: ['die Tür', 'das Fenster', 'der Löffel'] } }),
  },
  saver: {
    name: '4 · A2 who bookmarks everything',
    looksAt: 'the goal pill at 5/5, and whether Üben opens with the saved words',
    build: make({ level: 'A2', filter: ['A1', 'A2'], counts: [140, 10, 0], streak: 6, name: 'Ines',
      saved: 18, faves: 6 }),
  },
  b1: {
    name: '5 · B1 with a gender blind spot',
    looksAt: 'blind spots ranked by rate, and the one-tap drill',
    build: make({ level: 'B1', filter: ['A1', 'A2', 'B1'], counts: [880, 30, 40], streak: 41, name: 'Yusuf',
      misses: { tag: GENDER_TAG, n: 22, terms: ['die Regierung', 'das Verhältnis', 'der Anspruch'] },
      goal: { level: 'B1', inDays: 60 } }),
  },
  backlog: {
    name: '6 · B1 back after a month away',
    looksAt: 'the comeback copy, the backlog burn-down, and a bounded day',
    build: () => {
      const base = make({ level: 'B1', filter: ['A1', 'A2', 'B1'], counts: [600, 0, 420], name: 'Katia',
        goal: { level: 'B2', inDays: 120 } })();
      // Visited a lot, then vanished for 34 days. The streak is zero and the
      // record is not — that distinction is the whole point of the copy.
      base.visits = Array.from({ length: 30 }, (_, i) =>
        new Date(Date.now() - (34 + 30 - i) * DAY).toISOString().slice(0, 10));
      return base;
    },
  },
  b2: {
    name: '7 · B2 producing, not just recognising',
    looksAt: 'the recall drill in a session, and “Auf Deutsch” in the word sheet',
    build: make({ level: 'B2', filter: ['A2', 'B1', 'B2'], counts: [1600, 20, 25], streak: 88, name: 'Deniz',
      recall: 40, saved: 4,
      misses: { tag: PLURAL_TAG, n: 12, terms: ['das Verhältnis', 'der Anspruch'] } }),
  },
  c1: {
    name: '8 · C1, narrow filter',
    looksAt: 'a feed scoped to two bands, and whether the level strip agrees',
    build: make({ level: 'C1', filter: ['B2', 'C1'], counts: [2400, 12, 16], streak: 120, name: 'Rowan',
      recall: 60 }),
  },
  c2: {
    name: '9 · C2, near the end of the corpus',
    looksAt: 'the feed’s end-of-list slot, and high coverage without a fake 100%',
    build: () => {
      const base = make({ level: 'C2', filter: ['C1', 'C2'], counts: [700, 4, 3], streak: 200, name: 'Alex',
        recall: 80 })();
      base.settings['lexi.completions.v1'] = JSON.stringify([{ id: 'Adverbs', name: 'Adverbs', at: Date.now() }]);
      return base;
    },
  },
  clear: {
    name: '10 · Nothing due today',
    looksAt: '“All clear”, which is what the app opens into on a second visit',
    build: make({ level: 'A2', filter: ['A1', 'A2'], counts: [400, 0, 0], streak: 9, name: 'Sam' }),
  },
};

/** Apply `?seed=<name>` if there is one.
 *
 *  **Deliberately does not reload.** The first version stripped the query and
 *  called `location.reload()`, which on Safari reloaded the *document's* URL
 *  rather than the one `replaceState` had just written — so the seed ran again,
 *  and again, and the app sat on its boot splash in a loop that looked exactly
 *  like a slow load. `main.tsx` calls this *before* `hydrate()`, so falling
 *  through is both simpler and correct: the store is written, then read. */
export async function applySeedFromUrl(
  importData: (json: string) => Promise<void>,
): Promise<void> {
  const name = new URLSearchParams(location.search).get('seed');
  if (!name) return;
  const persona = PERSONAS[name];
  if (!persona) {
    // eslint-disable-next-line no-console
    console.warn(`[devseed] unknown persona "${name}". Try: ${Object.keys(PERSONAS).join(', ')}`);
    return;
  }
  localStorage.clear();
  const { cards, settings, visits, misses } = persona.build();
  await importData(JSON.stringify({ app: 'lexi', v: 1, cards, misses, visits, settings }));
  // eslint-disable-next-line no-console
  console.info(`[devseed] ${persona.name} — ${persona.looksAt}`);
  // Strip the query so a manual reload does not re-seed. No navigation: the
  // caller has not hydrated yet and is about to.
  history.replaceState(null, '', location.pathname + location.hash);
}
