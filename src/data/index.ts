// Lexi lexicon — the A1–C2 vocabulary, loaded at runtime
// from /public/data so the corpus is a separately-cached fetch rather than parsed
// inside the JS bundle. Exports are live `let` bindings, populated by initData()
// before the app renders.
//
// What boots here is `cards.json` — the corpus minus examples and definitions,
// 286 KB gzipped against 1,107 KB for cards + detail together (measured 2026-08-26). The other 70% arrives
// after first paint via `data/detail.ts`. `vocab.json` remains the canonical file
// that every `scripts/corpus/*` tool reads and writes; both shipped files are
// projections of it. See scripts/corpus/split.ts.
//
// *Since 2026-11-23* the boot fetch is `cards.pack.json`: the same rows packed
// positionally at build time, 75 KB lighter gzipped (data/pack.ts). `cards.json` is
// still the file every script reads, and it is the fallback in `loadCards`.
import type { Word, SectorMeta, CEFR } from '../types.ts';
import { setKnownVerbs } from '../lib/conjugate.ts';
import { primeFreq, decodeFreq } from '../lib/freq.ts';
import { unpackCards } from './pack.ts';

export let WORDS: Word[] = [];
export let SECTORS: SectorMeta[] = [];
export let BY_ID = new Map<string, Word>();
export let WORDS_BY_SECTOR = new Map<string, Word[]>();
export let SECTOR_GROUP = new Map<string, string>();
export let GROUP_SECTORS = new Map<string, string[]>();
export let GROUPS: string[] = [];
// Each sector's ORIGINAL fine group (the 16 corpus groups), captured before
// s.group is coarsened to the 10 market categories. Interest targeting keys off
// this so learners pick from the finer, more meaningful topic set.
export let SECTOR_FINEGROUP = new Map<string, string>();

export const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** The one sector the app does not load — see `initData`. */
const GRAMMAR_SECTOR = 'Grammar';

// Words mined or enriched by the learner live here. They join the lexicon under
// a dedicated "Mein Wortschatz" group so they appear in stats, decks and review
// exactly like built-in cards. Persistence is owned by the store.
export const USER_WORDS_KEY = 'lexi.userwords.v1';
export const USER_GROUP = 'Mein Wortschatz';

// Coarsen the 16 fine theme groups from the corpus into ~10 balanced top-level
// categories, so the market's first level is readable (especially on a phone).
// This is an app-side presentation choice applied at load — the corpus JSON stays
// canonical; the 284 sectors remain the study granularity. Any group not listed
// (e.g. the user's "Mein Wortschatz") passes through unchanged.
const GROUP_SUPER: Record<string, string> = {
  'Language Building Blocks': 'Building Blocks',
  'Core Vocabulary': 'Core Vocabulary',
  'Society & Politics': 'Society & Politics',
  'Work & Economy': 'Work & Economy',
  'Tech & Science': 'Work & Economy',
  'Education & Language': 'Education & Language',
  'Arts, Media & Leisure': 'Arts & Leisure',
  'Travel & Transport': 'Travel & Nature',
  'Nature & Environment': 'Travel & Nature',
  'Home & Daily Life': 'Daily Life',
  'Food & Drink': 'Daily Life',
  'Shopping & Clothing': 'Daily Life',
  'Health & Body': 'People & Health',
  'Feelings & Relationships': 'People & Health',
  'Miscellaneous': 'Miscellaneous',
};

function loadUserWords(): Word[] {
  try {
    const a = JSON.parse(localStorage.getItem(USER_WORDS_KEY) || '[]');
    return Array.isArray(a) ? (a as Word[]) : [];
  } catch { return []; }
}

/** Rebuild the derived indexes from WORDS + SECTORS. Idempotent. */
function reindex(): void {
  BY_ID = new Map(WORDS.map((w) => [w.id, w]));
  WORDS_BY_SECTOR = new Map();
  for (const w of WORDS) {
    const a = WORDS_BY_SECTOR.get(w.field) ?? [];
    a.push(w);
    WORDS_BY_SECTOR.set(w.field, a);
  }
  // **Counts and levels are the corpus's, not the file's** *(2026-11-14)*. They are
  // stored in sectors.json, and nothing that adds cards one batch at a time —
  // `authoring:new`, `fix-authored` — rebuilds it: 215 of 274 counts were stale,
  // so the word map offered "Communication (156)" for a sector of 228 words, and a
  // deck's level range left out the C1 cards added since. Derived here, where the
  // words are, they cannot drift.
  for (const s of SECTORS) {
    const ws = WORDS_BY_SECTOR.get(s.name) ?? [];
    s.count = ws.length;
    s.levels = LEVELS.filter((l) => ws.some((w) => w.level === l));
  }
  SECTOR_GROUP = new Map(SECTORS.map((s) => [s.name, s.group]));
  GROUP_SECTORS = new Map();
  for (const s of SECTORS) {
    const a = GROUP_SECTORS.get(s.group) ?? [];
    a.push(s.name);
    GROUP_SECTORS.set(s.group, a);
  }
  GROUPS = [...GROUP_SECTORS.keys()];
}

/** Ensure a SectorMeta exists for every sector referenced by `words`. */
function ensureSectors(words: Word[]): void {
  const known = new Set(SECTORS.map((s) => s.name));
  for (const w of words) {
    if (known.has(w.field)) continue;
    known.add(w.field);
    SECTORS.push({ name: w.field, count: 0, levels: [w.level], group: USER_GROUP });
  }
}

/**
 * Merge runtime words (mined / enriched) into the live lexicon and rebuild
 * indexes. Skips ids already present. Returns the words actually added.
 */
export function registerWords(words: Word[]): Word[] {
  const added: Word[] = [];
  for (const w of words) {
    if (BY_ID.has(w.id)) continue;
    WORDS.push(w);
    BY_ID.set(w.id, w);
    added.push(w);
  }
  if (added.length) { ensureSectors(added); reindex(); }
  return added;
}

/** The canonical boot file, which every build still ships for shells older than the
 *  pack. Deliberately not written as the literal `fetch(base + 'data/….json')`:
 *  `scripts/costs.ts` counts that form as boot traffic, and this fetch happens only
 *  when the pack cannot be read. */
const LEGACY_CARDS = 'data/cards.json';

/** Every card's front. The pack first (`cards.pack.json`, see data/pack.ts), then
 *  `cards.json`. On the launch after the deploy that introduced the pack, the service
 *  worker can answer a new shell from a cache that holds only the old file. In that
 *  case the pack request misses offline, or a dev server without the plugin 404s it,
 *  and the canonical file has the same rows. */
async function loadCards(base: string): Promise<Word[]> {
  const pack = await fetch(base + 'data/cards.pack.json')
    .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
    .catch(() => null);
  const rows = unpackCards(pack);
  if (rows) return rows as unknown as Word[];
  if (pack != null) console.warn('cards.pack.json is unreadable; booting from cards.json');
  const legacy = unpackCards(await fetch(base + LEGACY_CARDS).then((r) => r.json() as Promise<unknown>));
  if (!legacy) throw new Error('cards.json is not a list of cards');
  return legacy as unknown as Word[];
}

let loaded = false;
export function isLoaded() { return loaded; }

export async function initData(): Promise<void> {
  if (loaded) return;
  const base = import.meta.env.BASE_URL || '/';
  const [words, sectors, freq] = await Promise.all([
    loadCards(base),
    fetch(base + 'data/sectors.json').then((r) => r.json() as Promise<SectorMeta[]>),
    // Frequency ranks for intra-band ordering, by position in `cards.json` (see
    // lib/freq.ts). Optional by construction: an older deploy without the file, a
    // failed fetch, or a file written against another card order leaves the index
    // empty, and the scheduler falls back to corpus order rather than failing to
    // boot over a nice-to-have.
    fetch(base + 'data/freq.json')
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
      .catch(() => null),
  ]);
  const ranks = freq == null ? {} : decodeFreq(freq, words.map((w) => w.id));
  if (!ranks) console.warn('freq.json does not match cards.json; words keep corpus order within a level');
  primeFreq(ranks ?? {});

  // `cards.json` omits ex/def/defDe (see scripts/corpus/split.ts), so materialise
  // the defaults here. Deliberately not emitted into the file — 6,622 × `"ex": [],`
  // is bytes for nothing — and deliberately not solved by making the fields optional
  // on `Word`, which would ripple into `classpack.validCard` and every consumer's
  // types. Every read site already guards for empty (`card.ex[0] &&`, `card.def &&`),
  // so a card renders correctly from the moment it exists and gains its examples
  // when `data/detail.ts` attaches them.
  //
  // The example-cleaning pass that used to live here has moved to build time. It
  // scanned every card on every launch on every device to fix nine of them;
  // `corpus:split` now ships bytes that are already clean, and `data/split.test.ts`
  // asserts they stay that way.
  for (const w of words) {
    w.ex = [];
    w.def = null;
    w.defDe = null;
  }

  // Grammar cards do not enter the lexicon. 110 of the 6,630 rows in
  // `cards.json` are `kind: 'grammar'` — authored rule cards that fed the
  // grammar syllabus, the rule panels and the linked/remedy machinery, all of
  // which the 2026-09-05 refocus removed (docs/VISION.md, "the vocabulary
  // ruling"). They are filtered here rather than cut from the corpus because
  // the corpus is canonical and never hand-edited: this is a shipping decision
  // about the app, and reversing it is one line.
  //
  // The sector goes with them, or the browse index would carry a "Grammar" tile
  // holding nothing.
  WORDS = words.filter((w) => w.kind !== 'grammar');
  SECTORS = sectors.filter((s) => s.name !== GRAMMAR_SECTOR);

  // Snapshot the fine (16-group) taxonomy before coarsening — interest topics use it.
  SECTOR_FINEGROUP = new Map(SECTORS.map((s) => [s.name, s.group]));
  // Roll the fine corpus groups up to the coarse market categories (see GROUP_SUPER).
  for (const s of SECTORS) s.group = GROUP_SUPER[s.group] ?? s.group;

  // Fold in the learner's own words before the first index build.
  const user = loadUserWords();
  if (user.length) { WORDS = WORDS.concat(user); ensureSectors(user); }

  reindex();
  // Prime the conjugation engine's known-verb set (avoids false prefix splits).
  setKnownVerbs(WORDS.filter((w) => w.pos === 'verb').map((w) => w.term));
  loaded = true;
}
