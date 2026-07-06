// Leipzig Corpora Collection word-frequency parser (CC BY 4.0). The archive's
// `*-words.txt` has tab-separated `rank<TAB>word<TAB>frequency`. These are surface
// FORMS (inflected, cased), which is exactly what we want for measuring real
// reader coverage. Cite: Goldhahn, Eckart & Quasthoff, LREC 2012.
import { readFileSync } from 'node:fs';

export interface FreqEntry { rank: number; word: string; freq: number; }

// A German word token: letters (incl. umlauts/ß) and internal hyphen. Filters out
// the numeric/punctuation rows some Leipzig exports include.
const WORD_RE = /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*$/;

/**
 * Parse a Leipzig words file into a rank-ordered list. `rank` is taken from the
 * file's first column when numeric, else the 1-based line order. Duplicate
 * surface forms keep their first (highest-frequency) occurrence.
 */
export function loadFrequency(path: string, limit = Infinity): FreqEntry[] {
  const text = readFileSync(path, 'utf8');
  const out: FreqEntry[] = [];
  const seen = new Set<string>();
  let line = 0;
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    // Whitespace-tolerant: Leipzig uses tabs (`rank word freq` / `word freq`),
    // OpenSubtitles uses spaces (`word count`).
    const cols = raw.trim().split(/\s+/);
    // Layouts seen in the wild: [rank, word, freq] or [word, freq]. Detect by
    // whether col0 is an integer.
    let word: string, freq: number, rank: number;
    if (cols.length >= 3 && /^\d+$/.test(cols[0])) {
      rank = parseInt(cols[0], 10); word = cols[1]; freq = parseInt(cols[2], 10) || 0;
    } else {
      word = cols[0]; freq = parseInt(cols[1] ?? '0', 10) || 0; rank = ++line;
    }
    word = (word ?? '').trim();
    if (!WORD_RE.test(word)) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ rank, word, freq });
    if (out.length >= limit) break;
  }
  // Re-rank densely by descending frequency so ranks are contiguous even if the
  // source omitted a rank column or we skipped rows.
  out.sort((a, b) => b.freq - a.freq || a.word.localeCompare(b.word));
  out.forEach((e, i) => { e.rank = i + 1; });
  return out;
}

/**
 * Merge several frequency lists into one ranking. A word's priority is its best
 * (lowest) rank across the lists, so a word common in ANY source (e.g. everyday
 * words that rank high in subtitles but low in news) surfaces near the top.
 * Missing files are skipped; the result is re-ranked densely.
 */
export function loadFrequencies(paths: string[], limit = Infinity, perList = 60000): FreqEntry[] {
  const best = new Map<string, FreqEntry>();
  for (const p of paths) {
    let list: FreqEntry[];
    try { list = loadFrequency(p, perList); } catch { continue; }
    for (const e of list) {
      const k = e.word.toLowerCase();
      const prev = best.get(k);
      if (!prev || e.rank < prev.rank) best.set(k, { ...e });
    }
  }
  const out = [...best.values()].sort((a, b) => a.rank - b.rank || b.freq - a.freq);
  out.forEach((e, i) => { e.rank = i + 1; });
  return limit === Infinity ? out : out.slice(0, limit);
}
