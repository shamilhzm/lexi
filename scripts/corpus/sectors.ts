// Sector/field assignment and sectors.json rebuild. New cards join an existing
// fine sector (`field`) that rolls up into one of the 16 theme groups. We only
// ever assign a field that already exists (validated against sectors.json) or the
// LLM's suggestion when it names a real field; otherwise cards fall back to the
// "Miscellaneous" sector. sectors.json is then recomputed from the merged corpus
// so counts/levels stay accurate.
import { readFileSync } from 'node:fs';
import { DEFAULT_FIELD, DEFAULT_GROUP } from './config.ts';
import { LEVELS, lemmaKey, fileExists } from './lib.ts';
import type { Word, SectorMeta } from '../../src/types.ts';

/** lemma → curated sector name, from an optional `lemma<TAB>field` file. */
export function loadSectorReference(path: string): Map<string, string> {
  const m = new Map<string, string>();
  if (!fileExists(path)) return m;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [lemma, field] = line.split('\t');
    if (lemma && field?.trim()) m.set(lemmaKey(lemma), field.trim());
  }
  return m;
}

export interface SectorIndex {
  fields: Set<string>;
  fieldGroup: Map<string, string>;   // field -> group
  groups: Set<string>;
}

export function indexSectors(sectors: SectorMeta[]): SectorIndex {
  const fields = new Set<string>();
  const fieldGroup = new Map<string, string>();
  const groups = new Set<string>();
  for (const s of sectors) { fields.add(s.name); fieldGroup.set(s.name, s.group); groups.add(s.group); }
  return { fields, fieldGroup, groups };
}

/** Part-of-speech → default fine sector for non-nouns (these are fully determined
 *  by POS, so they need no manual tagging). Nouns return undefined (need a topical
 *  sector from the curated map). */
export function posDefaultSector(pos: string): string | undefined {
  switch (pos) {
    case 'verb': return 'Core verbs';
    case 'adverb': return 'Adverbs';
    case 'adjective': return 'Adjectives';
    case 'conjunction': case 'preposition': case 'particle': return 'Connectors';
    case 'interjection': return 'Useful Phrases';
    case 'number': return 'Numbers';
    default: return undefined;
  }
}

/** Resolve a proposed (field, group) against what exists. An unknown field falls
 *  back to Miscellaneous; a known field always uses its real group. */
export function resolveField(idx: SectorIndex, proposedField?: string | null, proposedGroup?: string | null): { field: string; group: string; source: 'llm' | 'default' } {
  const f = (proposedField ?? '').trim();
  if (f && idx.fields.has(f)) return { field: f, group: idx.fieldGroup.get(f)!, source: 'llm' };
  const g = (proposedGroup ?? '').trim();
  if (g && idx.groups.has(g)) return { field: DEFAULT_FIELD, group: g, source: 'llm' };
  return { field: DEFAULT_FIELD, group: DEFAULT_GROUP, source: 'default' };
}

/**
 * Recompute sectors.json from the merged corpus: each field's card count and the
 * set of levels present, with its group. New fields (only ever added deliberately)
 * inherit a group from `priorGroupOf` or fall back to Miscellaneous. Deterministic
 * order (by group then field) keeps diffs reviewable.
 */
export function rebuildSectors(corpus: Word[], prior: SectorMeta[]): SectorMeta[] {
  const priorGroupOf = new Map(prior.map((s) => [s.name, s.group]));
  const agg = new Map<string, { count: number; levels: Set<string> }>();
  for (const w of corpus) {
    const a = agg.get(w.field) ?? { count: 0, levels: new Set<string>() };
    a.count++; a.levels.add(w.level);
    agg.set(w.field, a);
  }
  const out: SectorMeta[] = [];
  for (const [name, a] of agg) {
    out.push({
      name,
      count: a.count,
      levels: LEVELS.filter((l) => a.levels.has(l)),
      group: priorGroupOf.get(name) ?? DEFAULT_GROUP,
    });
  }
  out.sort((x, y) => (x.group < y.group ? -1 : x.group > y.group ? 1 : x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
  return out;
}
