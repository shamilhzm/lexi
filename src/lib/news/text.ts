// Small text helpers for the reader.

/** Split a paragraph into sentences, keeping the offsets so a tapped token can be
 *  placed in its sentence. Deliberately conservative: German news is full of
 *  "z. B.", "Dr.", "1.3 Prozent" and "3. Oktober", and splitting inside one of
 *  those hands the explainer half a sentence. A boundary is end punctuation,
 *  whitespace, then something that can start a sentence. */
const ABBREV = /(?<!\p{L})(z|B|d|h|u|a|o|v|bzw|ca|Dr|Nr|St|Mio|Mrd|vgl|evtl|inkl|sog|Prof|Hr|Fr|Jh|usw|bspw|ggf|etc|Abs|Bd|Tel|zit|geb|gest|Str)\.$/u;

export function sentences(p: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  const re = /[.!?…]["“”»«'’)]*\s+(?=["„“»«'‘(]?[A-ZÄÖÜ0-9])/g;
  let start = 0;
  for (let m = re.exec(p); m; m = re.exec(p)) {
    const end = m.index + m[0].trimEnd().length;
    const candidate = p.slice(start, end);
    // Do not end on an abbreviation, an initial or an ordinal: "z. B.", "Dr.", "J.", "3."
    // A list, not a length rule — "er." and "an." end sentences all the time, and
    // `\b` would be wrong anyway: it treats *ä* as a boundary, so *fällt.* read as
    // the abbreviation "llt.".
    if (!/[!?…]$/.test(candidate) && (ABBREV.test(candidate) || /(?<!\p{L})\p{L}\.$/u.test(candidate) || /(?<!\d)\d{1,2}\.$/.test(candidate))) continue;
    out.push({ text: candidate.trim(), start, end });
    start = m.index + m[0].length;
  }
  if (start < p.length && p.slice(start).trim()) out.push({ text: p.slice(start).trim(), start, end: p.length });
  return out;
}

/** The sentence containing character `offset`. */
export function sentenceAt(p: string, offset: number): string {
  return sentences(p).find((s) => offset >= s.start && offset <= s.end)?.text ?? p;
}

/** Content-ish words, for the "words read" count. */
export const wordCount = (s: string) => (s.match(/\p{L}[\p{L}-]*/gu) ?? []).length;

/** "12 min ago", "3 h ago", "2 d ago". English, because the UI is. */
export function ago(ms: number, now = Date.now()): string {
  if (!ms) return '';
  const m = Math.max(0, Math.floor((now - ms) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
