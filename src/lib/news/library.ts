// What the learner has done with the news: the topics they follow, what they
// read, the words they took from it, and what they wrote back.
//
// All of it is small and all of it is theirs, so it lives in localStorage beside
// the other settings and rides the backup export (see SETTING_KEYS in store.ts).
// The one exception is the words themselves, which are ordinary user cards
// (`usr:read:*`) and persist with the rest of the learner's lexicon.
import { addUserWords, notifyLexiconChanged, review, statusOf, studyLevel } from '../../store.ts';
import { BY_ID } from '../../data/index.ts';
import { Rating } from '../../srs.ts';
import type { Word } from '../../types.ts';
import type { Lookup } from '../wiktionary.ts';
import type { TopicId } from './sources.ts';

export const NEWS_TOPICS_KEY = 'lexi.news.topics.v1';
export const READING_KEY = 'lexi.reading.v1';
export const MINED_KEY = 'lexi.mined.v1';
export const JOURNAL_KEY = 'lexi.journal.v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw) as T;
    return v ?? fallback;
  } catch { return fallback; }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota */ }
  notifyLexiconChanged();
}

// ---- topics --------------------------------------------------------------------

/** `null` until the learner has chosen — the reader asks rather than guesses. */
export function newsTopics(): TopicId[] | null {
  const v = read<TopicId[] | null>(NEWS_TOPICS_KEY, null);
  return Array.isArray(v) ? v : null;
}
export function setNewsTopics(ids: TopicId[]) { write(NEWS_TOPICS_KEY, ids); }

// ---- the reading log -------------------------------------------------------------
//
// Words *read* is an input count, and an honest one: it says how much German went
// past your eyes, not how much you know. LingQ's problem was never counting words
// read — it was calling words seen "known". This counts reading and claims nothing.

export interface ReadEntry { id: string; title: string; source: string; url: string; words: number; at: number }
const MAX_LOG = 500;

export function readingLog(): ReadEntry[] {
  const v = read<ReadEntry[]>(READING_KEY, []);
  return Array.isArray(v) ? v : [];
}
export function isRead(id: string): boolean { return readingLog().some((e) => e.id === id); }
export function markRead(e: Omit<ReadEntry, 'at'>) {
  const log = readingLog().filter((x) => x.id !== e.id);
  write(READING_KEY, [{ ...e, at: Date.now() }, ...log].slice(0, MAX_LOG));
}
/** Words read in the last `days` days. */
export function wordsRead(days = 7, now = Date.now()): { words: number; articles: number } {
  const since = now - days * 86400_000;
  const recent = readingLog().filter((e) => e.at >= since);
  return { words: recent.reduce((s, e) => s + e.words, 0), articles: recent.length };
}

// ---- mined words ---------------------------------------------------------------------

export interface MinedMeta { title: string; url: string; sentence: string; at: number }
export function minedMeta(): Record<string, MinedMeta> {
  const v = read<Record<string, MinedMeta>>(MINED_KEY, {});
  return v && typeof v === 'object' ? v : {};
}
/** Where a mined word came from — the scheduler says so on the card. */
export function minedFrom(id: string): MinedMeta | null { return minedMeta()[id] ?? null; }

/** The sector mined words live in. One sector, under the user group, so Words can
 *  show "what I took from my reading" as one deck. */
export const MINED_SECTOR = 'Aus deiner Lektüre';

export const minedId = (lemma: string) => `usr:read:${lemma}`;

/** A card built from a dictionary lookup and the sentence it was met in.
 *
 *  Every field is either looked up (lemma, gender, plural, IPA, part of speech,
 *  gloss — de/en.wiktionary) or observed (the example: the learner's own
 *  sentence). None is written. The level is the learner's own study level, not a
 *  claim about the word: the level filter decides what enters a session, and a
 *  word the learner chose must not be filtered out by a guess. */
export function cardFromLookup(l: Lookup, sentence: string): Word {
  const term = l.pos === 'noun' && l.gender ? `${l.gender} ${l.lemma}` : l.lemma;
  const plural = l.pos === 'noun' && l.plural ? `die ${l.plural}` : null;
  return {
    id: minedId(l.lemma),
    term,
    en: l.glosses.slice(0, 2).join('; ') || '—',
    pos: l.pos ?? 'word',
    level: studyLevel(),
    gender: l.pos === 'noun' ? l.gender : null,
    plural,
    ipa: l.ipa,
    def: l.glosses.length > 2 ? l.glosses.slice(2).join('; ') : null,
    syn: [],
    ant: [],
    ex: sentence ? [{ de: sentence, en: '', lvl: 'read' }] : [],
    field: MINED_SECTOR,
    kind: 'word',
  };
}

/** Save a looked-up word as a card. Idempotent: saving it again from another
 *  article keeps the first card and adds nothing. */
export function mineLookup(l: Lookup, sentence: string, from: { title: string; url: string }): Word {
  const card = cardFromLookup(l, sentence);
  const existing = BY_ID.get(card.id);
  if (existing) return existing;
  addUserWords([card]);
  const meta = minedMeta();
  meta[card.id] = { title: from.title, url: from.url, sentence, at: Date.now() };
  write(MINED_KEY, meta);
  return card;
}

/** "I already know this." Recorded as a real first review graded *Easy*, which
 *  is what it is: the learner's own claim, now on the schedule, and checked
 *  again when FSRS says so. A lapse later retracts it the ordinary way. */
export function markKnown(id: string) {
  if (statusOf(id) === 'known') return;
  review(id, Rating.Easy);
}

// ---- the journal --------------------------------------------------------------------
//
// What the learner wrote back. Kept even without feedback: writing is the output
// half, and having written is the point before any correction is.

export interface Correction {
  corrected: string;
  natural: string;
  verdict: string;
  issues: { original: string; fix: string; why: string; kind: string }[];
  tip: string;
}
export interface JournalEntry {
  id: string;
  articleId: string;
  title: string;
  text: string;
  correction: Correction | null;
  at: number;
}
const MAX_JOURNAL = 200;

export function journal(): JournalEntry[] {
  const v = read<JournalEntry[]>(JOURNAL_KEY, []);
  return Array.isArray(v) ? v : [];
}
export function addJournal(e: Omit<JournalEntry, 'id' | 'at'>): JournalEntry {
  const entry: JournalEntry = { ...e, id: `j:${Date.now().toString(36)}`, at: Date.now() };
  write(JOURNAL_KEY, [entry, ...journal()].slice(0, MAX_JOURNAL));
  return entry;
}
export function updateJournal(id: string, patch: Partial<JournalEntry>) {
  write(JOURNAL_KEY, journal().map((e) => (e.id === id ? { ...e, ...patch } : e)));
}
