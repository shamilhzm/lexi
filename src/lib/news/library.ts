// What the learner has done with the news: the topics they follow, what they
// read, where the words they saved came from, and what they wrote back.
//
// All of it is small and all of it is theirs, so it lives in localStorage beside
// the other settings and rides the backup export (see SETTING_KEYS in store.ts).
import { notifyLexiconChanged, isSaved, toggleSaved } from '../../store.ts';
import type { TopicId } from './sources.ts';

export const NEWS_TOPICS_KEY = 'lexi.news.topics.v1';
export const READING_KEY = 'lexi.reading.v1';
export const SAVED_FROM_KEY = 'lexi.savedfrom.v1';
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

// ---- where a saved word came from ------------------------------------------------
//
// Bookmarking a word in an article is the feed's own instruction — *teach me this
// one* — and `buildBriefing` already serves saved words first. What the article
// adds is provenance: the session can say which story the word came from, and the
// sentence it was met in is kept beside it. Words the corpus does not carry are
// *noted* instead (`noteWanted`), never turned into cards: see DICTIONARY.md,
// "the one rule that must not bend".

export interface SavedFrom { title: string; url: string; sentence: string; at: number }
export function savedFromAll(): Record<string, SavedFrom> {
  const v = read<Record<string, SavedFrom>>(SAVED_FROM_KEY, {});
  return v && typeof v === 'object' ? v : {};
}
export function savedFrom(id: string): SavedFrom | null { return savedFromAll()[id] ?? null; }

/** Bookmark a card from an article, remembering where. Idempotent. */
export function saveFromArticle(id: string, from: { title: string; url: string }, sentence: string) {
  if (!isSaved(id)) toggleSaved(id);
  const all = savedFromAll();
  if (!all[id]) {
    all[id] = { title: from.title, url: from.url, sentence, at: Date.now() };
    write(SAVED_FROM_KEY, all);
  }
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
