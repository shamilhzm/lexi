// The pill. One shape, one padding.
//
// Previously the same visual element carried five different horizontal paddings
// (px-1.5 / px-2 / px-3) and two verticals across Review, Decks, Today, Grammar
// and Markt — small enough that no single instance looked wrong, and collectively
// the reason the app read as slightly unresolved at close range.
import type { ComponentProps, ReactNode } from 'react';

export type ChipTone = 'accent' | 'dim' | 'good' | 'bad';

const TONE: Record<ChipTone, string> = {
  accent: 'text-amber border-line',
  dim: 'text-dim border-line',
  good: 'text-green border-green/40',
  bad: 'text-red-txt border-red/40',
};

type Props = ComponentProps<'span'> & {
  tone?: ChipTone;
  children?: ReactNode;
};

export default function Chip({ tone = 'accent', className = '', children, ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 flex-shrink-0 rounded-full border px-2 py-0.5
        font-mono text-2xs tabular-nums tracking-wider ${TONE[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
