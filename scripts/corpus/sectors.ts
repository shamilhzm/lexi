// Sector/field assignment and sectors.json rebuild. New cards join an existing
// fine sector (`field`) that rolls up into one of the 16 theme groups. We only
// ever assign a field that already exists (validated against sectors.json) or the
// LLM's suggestion when it names a real field; otherwise cards fall back to the
// "Miscellaneous" sector. sectors.json is then recomputed from the merged corpus
// so counts/levels stay accurate.
import { DEFAULT_FIELD, DEFAULT_GROUP } from './config.ts';
import { LEVELS } from './lib.ts';
import type { Word, SectorMeta } from '../../src/types.ts';

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
