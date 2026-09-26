// Public copy — the numbers and the address that strangers read before they ever
// open the app: the page title, the search snippet, the link preview.
//
// **Why this file exists.** On 2026-09-25 the live meta description said "6,500
// words" while the corpus held 10,023 — a third stale, on every search result and
// every unfurled link, because the number was typed into `index.html` by hand and
// nothing re-read it (panel review, marketing F4; LESSONS: *never put a number in a
// doc that didn't come from a script*). Now `index.html` carries tokens and the
// build stamps them from the shipped data (`scripts/marketing/publicCopyPlugin.ts`),
// so the figure a stranger reads is the figure the app teaches.
//
// Pure and browser-safe: the Vite plugin reads the files and hands the numbers in;
// the share card reads the origin from here too.

/** Where the app lives, for the absolute URLs a link preview needs (`og:image` must
 *  be absolute) and for the address printed on a shared image.
 *
 *  **Owner decision pending.** This is the Vercel subdomain the app has always run
 *  on. A permanent name and domain are the owner's call (panel review, marketing
 *  F1/F6: the name "Lexi" is crowded in exactly this category, and in a local-first
 *  app the origin *is* the learner's account — IndexedDB does not follow a domain
 *  move). When that is decided it changes here, or through `LEXI_PUBLIC_ORIGIN` at
 *  build time, and nowhere else. */
export const PUBLIC_ORIGIN = 'https://lexi-eosin.vercel.app';

export interface PublicCounts {
  /** Word cards the app teaches — what `data/index.ts` puts in `WORDS`. */
  words: number;
  /** Dictionary headwords the search answers (`lex/index.json → n`). */
  dictionary: number;
}

/** Word cards, counted the way the app counts them: `data/index.ts` drops the
 *  `kind: 'grammar'` cards at load, so they are not something Lexi teaches and must
 *  not be something it advertises. */
export function countTaught(cards: { kind?: string }[]): number {
  return cards.filter((c) => c.kind !== 'grammar').length;
}

/** A count as a stranger should read it: rounded *down* to the thousand, with a
 *  `+` when that drops anything. "10,000+" is exactly true of 10,078 and stays true
 *  until the corpus shrinks, so a marketing line never needs re-typing after a
 *  batch — while a bare "10,000" would undersell and "over 10,000" would be false
 *  of exactly 10,000. Below a thousand, the exact number. */
export function roundedDown(n: number): string {
  const fmt = (x: number) => x.toLocaleString('en-US');
  if (!Number.isFinite(n) || n < 0) throw new Error(`roundedDown: not a count (${n})`);
  if (n < 1000) return fmt(Math.floor(n));
  const floor = Math.floor(n / 1000) * 1000;
  return n > floor ? `${fmt(floor)}+` : fmt(floor);
}

/** Replace the `%LEXI_…%` tokens in `index.html`.
 *
 *  An unknown or misspelt token **throws**, so it fails the build instead of
 *  shipping the literal `%LEXI_WORSD%` into every search result — the same reason
 *  the version stamp is emitted rather than committed. */
export function stampPublicCopy(html: string, counts: PublicCounts, origin = PUBLIC_ORIGIN): string {
  const values: Record<string, string> = {
    LEXI_WORDS: roundedDown(counts.words),
    LEXI_DICTIONARY: roundedDown(counts.dictionary),
    LEXI_ORIGIN: origin.replace(/\/+$/, ''),
  };
  return html.replace(/%(LEXI_[A-Z_]+)%/g, (_, key: string) => {
    const v = values[key];
    if (v === undefined) throw new Error(`index.html: unknown public-copy token %${key}%`);
    return v;
  });
}
