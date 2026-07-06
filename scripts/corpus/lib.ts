// Shared helpers for the corpus pipeline: corpus IO, dedupe keys, deterministic
// ordering, provenance tracking, and priming the real app matcher so coverage
// and validation measure exactly what the reader would light up.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Word, SectorMeta, CEFR } from '../../src/types.ts';

export const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_ORDER: Record<string, number> = Object.fromEntries(LEVELS.map((l, i) => [l, i]));

// ---- IO -------------------------------------------------------------------
export function readJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}
/** Write pretty JSON with a trailing newline (stable, diff-friendly). */
export function writeJSON(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}
/** Write plain text, creating parent dirs. */
export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
export const fileExists = existsSync;

export function loadCorpus(path: string): Word[] {
  return readJSON<Word[]>(path);
}
export function loadSectors(path: string): SectorMeta[] {
  return readJSON<SectorMeta[]>(path);
}

// ---- terms, keys, ids -----------------------------------------------------
export const stripArticle = (term: string): string => term.replace(/^(der|die|das)\s+/i, '').trim();

/** Case-insensitive, article-stripped headword — the identity used for dedupe. */
export const lemmaKey = (term: string): string => stripArticle(term).toLowerCase();

/** The corpus id scheme (`voc:LEVEL:term`). Mirrors existing built-in cards and
 *  never collides with user words (`usr:`) or grammar (`gram:`). */
export const cardId = (level: string, term: string): string => `voc:${level}:${term}`;

/** Deterministic, locale-independent order: by CEFR level, then headword, then
 *  full term. Keeps regenerated vocab.json diffs reviewable. */
export function sortCards(words: Word[]): Word[] {
  return [...words].sort((a, b) => {
    const lv = (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99);
    if (lv) return lv;
    const ka = lemmaKey(a.term), kb = lemmaKey(b.term);
    if (ka < kb) return -1; if (ka > kb) return 1;
    return a.term < b.term ? -1 : a.term > b.term ? 1 : 0;
  });
}

/** The article-bearing headword for a card — the app's real identity. Nouns carry
 *  der/die/das, so verb/noun homographs ("essen" vs "das Essen") and gender
 *  homonyms ("der See" vs "die See") stay distinct. */
export const termFor = (lemma: string, pos: string, gender: string | null): string =>
  pos === 'noun' && gender ? `${gender} ${lemma}` : lemma;

/** Set of case-insensitive full terms already present — cross-level dedupe so we
 *  never re-add an existing card (but still allow legitimate homographs). */
export function existingTerms(corpus: Word[]): Set<string> {
  return new Set(corpus.map((w) => w.term.toLowerCase()));
}

// ---- provenance -----------------------------------------------------------
export interface Provenance {
  id: string;
  lemma: string;
  level: string;
  levelSource: 'reference' | 'frequency' | 'llm';
  freqRank: number | null;
  glossSource: string;              // e.g. "wiktextract:kaikki-de"
  factsSource: string;              // gender/plural/ipa origin
  exampleSource: string | null;     // "tatoeba:<id>" | "wiktextract" | null
  fieldSource: 'llm' | 'heuristic' | 'default';
}

/** Accumulates per-card provenance, merged with any prior run and keyed by id so
 *  the file stays deterministic and re-runs are additive. */
export class ProvenanceLog {
  private map = new Map<string, Provenance>();
  constructor(path?: string) {
    if (path && fileExists(path)) {
      const prev = readJSON<Provenance[]>(path);
      for (const p of prev) this.map.set(p.id, p);
    }
  }
  record(p: Provenance): void { this.map.set(p.id, p); }
  toArray(): Provenance[] {
    return [...this.map.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
}

// ---- prime the real app matcher ------------------------------------------
// Populates the app's live WORDS binding and the conjugation engine so the
// genuine mining `annotate()` runs against a given corpus (Goal 6 fidelity).
export async function primeApp(corpus: Word[]): Promise<typeof import('../../src/lib/mining.ts')> {
  const data = await import('../../src/data/index.ts');
  const conj = await import('../../src/lib/conjugate.ts');
  const mining = await import('../../src/lib/mining.ts');
  data.registerWords(corpus);
  conj.setKnownVerbs(corpus.filter((w) => w.pos === 'verb').map((w) => w.term));
  mining.resetMiningIndex();
  return mining;
}

export type { Word, SectorMeta, CEFR };
