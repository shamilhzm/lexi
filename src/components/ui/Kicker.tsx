// The small uppercase label above a section — the app's most repeated text
// treatment (~65 uses of the exact same four-class string, in two tones).
// Mono, because in this app anything mono is data.
import type { ComponentProps, ReactNode } from 'react';

const TONE = {
  accent: 'text-amber font-semibold',
  dim: 'text-dim',
  // The reveal's own kicker. Green is the reward colour, and this is the one place
  // it belongs on a study card — as a *mark* on the answer, not as the ground
  // under it (see the flip back face in Review.tsx).
  reward: 'text-green font-semibold',
} as const;

type Props = ComponentProps<'span'> & {
  /** `accent` is the section-opening kicker; `dim` labels a value; `reward` marks
   *  a revealed answer. */
  tone?: keyof typeof TONE;
  children?: ReactNode;
};

export default function Kicker({ tone = 'dim', className = '', children, ...rest }: Props) {
  return (
    <span
      className={`font-mono text-2xs uppercase tracking-widest ${TONE[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
