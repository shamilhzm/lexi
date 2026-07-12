// Lexi lexicon — 6,951 A1–C2 cards (vocabulary + grammar). Loaded at runtime
// from /public/data so the ~2 MB corpus is a separately-cached fetch rather than
// parsed inside the JS bundle (keeps first paint fast; the service worker caches
// it for instant offline reloads). Exports are live `let` bindings, populated by
// initData() before the app renders.
import type { Word, SectorMeta, CEFR } from '../types.ts';
import { setKnownVerbs } from '../lib/conjugate.ts';

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
  'Grammar': 'Building Blocks',
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

let loaded = false;
export function isLoaded() { return loaded; }

export async function initData(): Promise<void> {
  if (loaded) return;
  const base = import.meta.env.BASE_URL || '/';
  const [words, sectors] = await Promise.all([
    fetch(base + 'data/vocab.json').then((r) => r.json() as Promise<Word[]>),
    fetch(base + 'data/sectors.json').then((r) => r.json() as Promise<SectorMeta[]>),
  ]);

  WORDS = words;
  SECTORS = sectors;

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
