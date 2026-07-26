// Domain model: six CEFR galaxies, each a flat field of stars. A star is one
// learnable item — a word or a grammar exercise. There is no "group" layer:
// every star lives directly in its level, scattered across the galaxy.
import { THEMED_DECKS, FREQ } from './data.ts';
import { PERSONAL_DECKS } from './seed.ts';
import { GRAMMAR, type Exercise } from './grammar.ts';
import { tagFor } from './lessonmap.ts';
import { LEXIKON } from './lexikon.ts';
import { UI_LEXIKON } from './ui-lexikon.ts';
import { allExploreDecks } from './explore-decks.ts';
import { addedDecks } from './prefs.ts';
export type { Exercise };

// Auto-ported demo decks + the hand-authored personalized "For You" decks.
const ALL_DECKS = [...THEMED_DECKS, ...PERSONAL_DECKS];

export type CEFR = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Galaxy identity: an English level name (the learner's native language) + hue.
export const GALAXY_META: Record<CEFR, { hue: string; title: string }> = {
  A1: { hue: 'var(--level-A1)', title: 'First steps' },
  A2: { hue: 'var(--level-A2)', title: 'Everyday' },
  B1: { hue: 'var(--level-B1)', title: 'Independent' },
  B2: { hue: 'var(--level-B2)', title: 'In the flow' },
  C1: { hue: 'var(--level-C1)', title: 'Confident' },
  C2: { hue: 'var(--level-C2)', title: 'Mastery' }
};

// A star = one card. `term`/`translation` are the German front + native back.
// `category` is metadata only (it never groups the map). Grammar stars carry a
// rule + exercises.
export interface Star {
  id: string;
  term: string;
  translation: string;
  cefr: CEFR;
  category: string;
  kind: 'word' | 'grammar';
  summary?: string;
  rule?: string;
  exercises?: Exercise[];
  pos?: string;
  example?: string;
  lektion?: number;   // curriculum Lektion (1..30, or an uploaded slot) this star belongs to
  feld?: string;      // semantic field within that Lektion
  plural?: string;    // noun plural ending, book style: 'die Wohnung, -en'
  antonym?: string;   // adjectives: 'groß ↔ klein'
  emoji?: string;     // optional meaning-image (one emoji)
}
export interface Galaxy { cefr: CEFR; title: string; hue: string; stars: Star[]; count: number; }

function normLevel(l?: string): CEFR {
  const u = (l || '').toUpperCase().slice(0, 2);
  return (LEVELS as string[]).includes(u) ? (u as CEFR) : 'B1';
}
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');
// German Wortart label → native (English) part of speech for the card front.
const POS_EN: Record<string, string> = { Nomen: 'noun', Verb: 'verb', Adjektiv: 'adjective', Adverb: 'adverb' };
const posEn = (de?: string) => (de ? POS_EN[de] || '' : '');

let _galaxies: Galaxy[] | null = null;
export function galaxies(): Galaxy[] {
  if (_galaxies) return _galaxies;
  const buckets: Record<CEFR, Star[]> = {} as any;
  LEVELS.forEach((l) => (buckets[l] = []));
  for (const d of ALL_DECKS) {
    for (const card of d.cards) {
      const cefr = normLevel(card.level);
      buckets[cefr].push({ id: d.id + ':' + card.front, term: card.front, translation: card.back, cefr, category: d.name, kind: 'word', example: card.example, pos: posEn(card.pos) });
    }
  }
  for (const lvl of LEVELS) {
    for (const [front, back] of FREQ[lvl] || []) {
      buckets[lvl].push({ id: 'freq-' + lvl + ':' + front, term: front, translation: back, cefr: lvl, category: 'Core vocabulary', kind: 'word' });
    }
  }
  for (const lvl of LEVELS) {
    for (const gp of GRAMMAR[lvl] || []) {
      buckets[lvl].push({ id: 'gram-' + lvl + ':' + slug(gp.title), term: gp.title, translation: gp.summary, cefr: lvl, category: 'Grammar', kind: 'grammar', summary: gp.summary, rule: gp.rule, exercises: gp.exercises });
    }
  }
  // Explore-catalog decks the learner has opted into — their cards join the
  // galaxy as free `xp:` stars (scatter in their CEFR ring, not lesson-tagged).
  const added = new Set(addedDecks());
  for (const d of allExploreDecks()) {
    if (!added.has(d.id)) continue;
    for (const c of d.cards) {
      const cefr = normLevel(c.level || d.defaultLevel);
      buckets[cefr].push({ id: 'xp:' + d.id + ':' + c.de, term: c.de, translation: c.en, cefr, category: d.name, kind: 'word', example: c.example, pos: c.pos ? POS_EN[c.pos] || c.pos : undefined });
    }
  }
  // Newly authored per-Lektion vocabulary (own id scheme, never collides).
  for (const e of LEXIKON) {
    buckets[e.level].push({ id: 'lex-l' + e.lektion + ':' + e.term, term: e.term, translation: e.translation, cefr: e.level, category: 'Lektion ' + e.lektion, kind: 'word', pos: posEn(e.pos), example: e.example, lektion: e.lektion, feld: e.feld, plural: e.plural, antonym: e.antonym });
  }
  // Der Kartenrand: the app's own German chrome words as searchable stars
  // (`ui:{slug}` — additive scheme, frozen once shipped). The UI teaches the
  // language it speaks (COHESION-PLAN Phase 6).
  for (const e of UI_LEXIKON) {
    buckets[e.level].push({ id: 'ui:' + e.slug, term: e.term, translation: e.translation, cefr: e.level, category: 'Kartenrand', kind: 'word', pos: e.pos, example: e.example, feld: e.where });
  }
  // Apply the lesson-tag overlay (ids stay untouched; tags only decorate).
  for (const lvl of LEVELS) {
    for (const s of buckets[lvl]) {
      if (s.lektion) continue;
      const t = tagFor(s.id);
      if (t) { s.lektion = t.lektion; s.feld = t.feld; }
    }
  }
  _galaxies = LEVELS.map((cefr) => ({ cefr, title: GALAXY_META[cefr].title, hue: GALAXY_META[cefr].hue, stars: buckets[cefr], count: buckets[cefr].length }));
  return _galaxies;
}

export function allStars(): Star[] { return galaxies().flatMap((g) => g.stars); }
let _byId: Map<string, Star> | null = null;
export function starById(id: string): Star | undefined {
  if (!_byId) { _byId = new Map(); allStars().forEach((s) => _byId!.set(s.id, s)); }
  return _byId.get(id);
}
// After uploading a lesson (or adding a deck), the star set changes — drop the
// memoized galaxies/index so the next read rebuilds with the new content.
export function resetModelCache() { _galaxies = null; _byId = null; }

// All stars belonging to a Lektion: tagged stars plus the grammar stars the
// curriculum links explicitly (which may live at another CEFR level).
export function starsForLesson(n: number, grammarStarIds: string[] = []): Star[] {
  const tagged = allStars().filter((s) => s.lektion === n);
  const seen = new Set(tagged.map((s) => s.id));
  for (const id of grammarStarIds) {
    if (seen.has(id)) continue;
    const s = starById(id);
    if (s) { tagged.push(s); seen.add(id); }
  }
  return tagged;
}
// Canonical Wortart ordering — the book's tiered taxonomy (Feld → Wortart).
// Unknown/missing pos sorts with Nomen (most entries are nouns).
export const WORTART_ORDER = ['Nomen', 'Verb', 'Adjektiv', 'Adverb', 'Präposition', 'Partikel', 'Wendung'] as const;
export function wortartRank(pos?: string): number {
  const i = (WORTART_ORDER as readonly string[]).indexOf(pos || 'Nomen');
  return i === -1 ? 0 : i;
}

// Lesson vocabulary grouped by semantic field (grammar stars excluded); within
// each Feld, entries are ordered by Wortart (Nomen → Verben → Adjektive → …)
// then alphabetically — mirroring the coursebook's "Wortschatz in Feldern".
export function lessonVocabByFeld(n: number): Map<string, Star[]> {
  const out = new Map<string, Star[]>();
  for (const s of allStars()) {
    if (s.lektion !== n || s.kind !== 'word') continue;
    const feld = s.feld || 'Wortschatz';
    if (!out.has(feld)) out.set(feld, []);
    out.get(feld)!.push(s);
  }
  for (const stars of out.values()) {
    stars.sort((a, b) => wortartRank(a.pos) - wortartRank(b.pos) || a.term.localeCompare(b.term, 'de'));
  }
  return out;
}

// FNV-1a hash for deterministic star placement.
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
