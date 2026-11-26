// The small uppercase label above a section — the app's most repeated text
// treatment (~65 uses of the exact same four-class string, in two tones).
// Sans, tracked caps *(2026-10-11)*. It was mono, on the grounds that "anything
// mono is data" — but a kicker is a label (TOPICS, ANSWER, CHAPTER), not a
// measurement, so the rule itself said it should never have been mono.
import type { ComponentProps, ReactNode } from 'react';

const TONE = {
  accent: 'text-accent font-semibold',
  dim: 'text-dim',
  // `reward` (green, the flip card's ANSWER) went on 2026-11-26: in the Heft green
  // means *right*, and an answer nobody has graded is not that yet.
} as const;

type Props = ComponentProps<'span'> & {
  /** `accent` is the section-opening kicker (and the flip card's ANSWER); `dim`
   *  labels a value. */
  tone?: keyof typeof TONE;
  children?: ReactNode;
};

export default function Kicker({ tone = 'dim', className = '', children, ...rest }: Props) {
  return (
    <span
      className={`text-2xs font-semibold uppercase tracking-widest ${TONE[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
