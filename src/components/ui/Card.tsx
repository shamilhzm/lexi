// The surface.
//
// `bg-panel border border-line rounded-md` appeared 41 times across the app,
// with nine different padding values, while `--radius-lg` — documented in the
// token block as the card step — was used exactly zero times. Everything was
// the same 10px box, so nothing read as more or less important than anything
// else, and the flip card (the app's hero object) shared its radius and border
// colour with the panel it sat inside.
//
// The radius now carries the hierarchy:
//   rounded-lg (16px) = a surface you read
//   rounded-md (10px) = a control you press, or a row nested inside a surface
//
// `tone` picks the material: `panel` is the raised default, `sunken` is the
// inset fill used for rows and rule blocks, `card` is the lifted study surface
// with the deeper drop shadow.
import type { ComponentProps, ElementType, ReactNode } from 'react';

export type CardTone = 'panel' | 'sunken' | 'card';
export type CardPad = 'none' | 'sm' | 'md' | 'lg';

const TONE: Record<CardTone, string> = {
  panel: 'bg-panel',
  sunken: 'bg-panel2',
  card: 'bg-card',
};

const PAD: Record<CardPad, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'px-6 py-8 sm:px-8 sm:py-10',
};

type Props<T extends ElementType> = {
  as?: T;
  tone?: CardTone;
  pad?: CardPad;
  /** Nested rows inside a card keep the control radius, not the surface radius. */
  nested?: boolean;
  /** Accent hairline — for a card that is asking for something (nudges, first run). */
  accent?: boolean;
  /** Drop the hairline entirely and let the material carry the elevation. */
  bare?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<T>, 'as' | 'className' | 'children'>;

export default function Card<T extends ElementType = 'div'>({
  as, tone = 'panel', pad = 'md', nested = false, accent = false, bare = false,
  className = '', children, ...rest
}: Props<T>) {
  const El = (as ?? 'div') as ElementType;
  // Border is resolved here rather than by the caller, so an accent card can't
  // end up with two competing border-colour utilities and a coin-flip winner.
  const border = bare ? '' : accent ? 'border border-amber/40' : 'border border-line';
  return (
    <El
      className={`${TONE[tone]} ${border} ${nested ? 'rounded-md' : 'rounded-lg'} ${PAD[pad]} ${className}`}
      {...rest}
    >
      {children}
    </El>
  );
}
