// Vocab recall ladder — pure logic, no DOM/CSS, unit-testable.
// As FSRS reps grow, a word climbs from recognition to production:
//   flip (see + self-rate) → mc (DE→EN choice) → reverse (EN→DE choice) → type (produce the word)

export type WordMode = 'flip' | 'mc' | 'reverse' | 'type';

export function modeForReps(reps: number): WordMode {
  if (reps <= 1) return 'flip';
  if (reps <= 3) return 'mc';
  if (reps <= 5) return 'reverse';
  return 'type';
}

// Deterministic xorshift for stable option ordering per (card, rep).
function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Pick n distinct distractors from the pool (excluding `exclude`), seeded.
// The pool should already be filtered to plausible candidates (same level, same kind).
export function sampleDistractors<T>(pool: T[], n: number, seed: number, exclude: (x: T) => boolean): T[] {
  const candidates = pool.filter((x) => !exclude(x));
  if (candidates.length <= n) return candidates.slice(0, n);
  const next = rng(seed);
  const picked: T[] = [];
  const used = new Set<number>();
  while (picked.length < n && used.size < candidates.length) {
    const i = Math.floor(next() * candidates.length);
    if (used.has(i)) continue;
    used.add(i);
    picked.push(candidates[i]);
  }
  return picked;
}

// Shuffle options deterministically, returning the index of `correct`.
export function shuffleOptions<T>(correct: T, distractors: T[], seed: number): { options: T[]; answer: number } {
  const options = [correct, ...distractors];
  const next = rng(seed ^ 0x9e3779b9);
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answer: options.indexOf(correct) };
}

// Type-mode answer matching: case-insensitive, umlaut-tolerant, article-optional.
// "frau", "die frau", "Frau" all match "die Frau". The full form is still shown
// as the canonical answer so the article is reinforced.
const ARTICLES = /^(der|die|das)\s+/i;
function norm(s: string): string {
  return s.trim().toLowerCase()
    .replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/\s+/g, ' ');
}
export function matchTerm(attempt: string, term: string): boolean {
  const a = norm(attempt);
  if (!a) return false;
  const t = norm(term);
  return a === t || a === t.replace(ARTICLES, '') || a.replace(ARTICLES, '') === t.replace(ARTICLES, '');
}

// Warmth for a near-miss in type mode (shared idea with lesen-core, but
// term-level: prefix match after article stripping).
export function termWarmth(attempt: string, term: string): 'warm' | 'cold' {
  const a = norm(attempt).replace(ARTICLES, '');
  const t = norm(term).replace(ARTICLES, '');
  if (!a) return 'cold';
  let i = 0;
  while (i < a.length && i < t.length && a[i] === t[i]) i++;
  return i >= Math.min(4, Math.ceil(t.length * 0.6)) ? 'warm' : 'cold';
}
