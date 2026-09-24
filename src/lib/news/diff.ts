// A word diff for showing a correction: which words of the corrected sentence are
// new. Longest common subsequence over tokens, which is exact and cheap at the
// size of anything a learner writes in one go (a few hundred words at most).

export interface DiffPart { text: string; changed: boolean }

const tokens = (s: string) => s.match(/\s+|[^\s]+/g) ?? [];

/** The corrected text, each word flagged if it is not in the learner's version
 *  at the same place in the sequence. Whitespace is carried through unflagged. */
export function correctionDiff(original: string, corrected: string): DiffPart[] {
  const a = tokens(original).filter((t) => t.trim());
  const bAll = tokens(corrected);
  const b = bAll.filter((t) => t.trim());
  const n = a.length, m = b.length;
  // dp[i][j] = LCS length of a[i..], b[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const keep = new Set<number>();
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) { keep.add(j); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const out: DiffPart[] = [];
  let wi = 0;
  for (const t of bAll) {
    if (!t.trim()) { out.push({ text: t, changed: false }); continue; }
    out.push({ text: t, changed: !keep.has(wi) });
    wi++;
  }
  return out;
}
