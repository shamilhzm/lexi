// The small uppercase label above a section — the app's most repeated text
// treatment (~65 uses of the exact same four-class string, in two tones).
// Mono, because in this app anything mono is data.
import type { ComponentProps, ReactNode } from 'react';

type Props = ComponentProps<'span'> & {
  /** `accent` is the section-opening kicker; `dim` labels a value. */
  tone?: 'accent' | 'dim';
  children?: ReactNode;
};

export default function Kicker({ tone = 'dim', className = '', children, ...rest }: Props) {
  return (
    <span
      className={`font-mono text-2xs uppercase tracking-widest
        ${tone === 'accent' ? 'text-amber font-semibold' : 'text-dim'} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
