// What a film's pattern beat measures, and the test re-measures. Kept apart from
// the player so the claim and its check are the same code.
import { WORDS } from '../data/index.ts';
import type { Gender } from './types.ts';

export interface EndingCount {
  ending: string;
  total: number;
  der: number; die: number; das: number;
  /** The article most of them take. */
  majority: Gender;
  /** Nouns with this ending that take another article — shown, never hidden. */
  exceptions: string[];
}

const bare = (t: string) => t.replace(/^(der|die|das)\s+/i, '');

/** Count, over every noun Lexi teaches, how the nouns ending in `ending` are
 *  gendered. Plural-only nouns carry no gender and are left out. */
export function countEnding(ending: string): EndingCount {
  const e = ending.toLowerCase();
  const hit = WORDS.filter((w) => w.pos === 'noun' && (w.gender === 'der' || w.gender === 'die' || w.gender === 'das')
    && bare(w.term).toLowerCase().endsWith(e));
  const n = { der: 0, die: 0, das: 0 };
  for (const w of hit) n[w.gender as Gender]++;
  const majority = (['der', 'die', 'das'] as Gender[]).reduce((a, b) => (n[b] > n[a] ? b : a));
  return {
    ending, total: hit.length, ...n, majority,
    exceptions: hit.filter((w) => w.gender !== majority).map((w) => w.term),
  };
}
