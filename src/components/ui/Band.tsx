// Full-bleed sections and rows — the layout the feed taught the rest of the app.
//
// ## Why this exists rather than another `Card`
//
// `Card` was the default wrapper for everything, which is why every surface
// looked like every other surface and none of them looked like the feed. A card
// drawn inside a page that is *itself* a surface is a box in a box: it spends a
// border, a radius and two gutters to say "these things belong together", which
// a hairline says for free and a printed lexicon has said for four hundred
// years.
//
// So `Card` keeps one job — the study surface, where "card" is the literal
// metaphor and the object is meant to feel picked up — and everything that was
// only ever *grouping* uses these instead.
//
// ## The negative margin is the whole trick
//
// The page lays itself out with `px-3 sm:px-5`. A band cancels that gutter with
// a matching negative margin and re-pays it inside each row, so the rule runs
// edge to edge and the tap target is the full width of the phone, while the text
// still lines up with everything above it. Getting this wrong in either
// direction is immediately visible: content that does not align with the heading,
// or a rule that stops short of the screen.
import type { ReactNode } from 'react';

/** The gutter the app pads its pages with, cancelled and re-paid. Kept in one
 *  place because a band and its rows have to agree, and they are written apart. */
const BLEED = '-mx-3 sm:-mx-5';
const GUTTER = 'px-3 sm:px-5';

/** A run of rows, ruled above and below, separated by hairlines. */
export function Band({ children, className = '', label }: {
  children: ReactNode; className?: string; label?: string;
}) {
  return (
    <section aria-label={label}
      className={`${BLEED} border-y border-line divide-y divide-line ${className}`}>
      {children}
    </section>
  );
}

/** One row inside a band — or standing alone, in which case it rules itself.
 *
 *  `as` exists because half of these navigate and half do not, and a `<div>` that
 *  responds to clicks is unreachable by keyboard. If it does something, it is a
 *  button. */
export function BandRow({ children, onClick, className = '', tone, alone = false, label }: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  /** `accent` tints the row for the one-off nudges that used to be accent cards. */
  tone?: 'accent';
  /** Draws its own rules, for a row that is not part of a run. */
  alone?: boolean;
  label?: string;
}) {
  const base = `${GUTTER} py-4 w-full text-left flex items-center gap-3.5 ${
    tone === 'accent' ? 'bg-[var(--color-green-d)]/40' : ''} ${
    onClick ? 'hover:bg-panel2 active:bg-panel2 transition-colors' : ''} ${className}`;
  const wrap = alone ? `${BLEED} border-y border-line` : '';
  if (!onClick) return <div className={`${wrap} ${base}`} aria-label={label}>{children}</div>;
  return (
    <div className={wrap}>
      <button onClick={onClick} aria-label={label} className={base}>{children}</button>
    </div>
  );
}

/** A titled stretch of page with no box around it: heading, then content, then a
 *  rule. The replacement for `<Card>` wherever the card was only a container. */
export function Section({ title, children, className = '', id }: {
  title?: string; children: ReactNode; className?: string; id?: string;
}) {
  return (
    <section aria-labelledby={id} className={`py-5 border-b border-line ${BLEED} ${GUTTER} ${className}`}>
      {title && <h2 id={id} className="text-lg font-bold mb-3">{title}</h2>}
      {children}
    </section>
  );
}
