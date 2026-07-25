// An icon-only control with a real touch target.
//
// The app already knew the rule — `grid place-items-center w-11 h-11 -m-2`
// appears in four places — but applied it unevenly: header icons sat at 36px,
// the rule-card close at 28px, and the two buttons on a deck card had no sizing
// class at all (a 15px icon with no padding, which fails even WCAG 2.5.8's
// 24px floor). This makes the compliant version the default and the small
// version impossible to reach by accident.
//
// `pull` applies the negative margin that keeps a 44px box from visually
// inflating a tight header row — the target grows, the layout doesn't.
import type { ComponentProps, ReactNode } from 'react';

type Props = ComponentProps<'button'> & {
  /** Required: an icon alone has no accessible name. */
  label: string;
  /** Negative margin so the enlarged target doesn't push neighbours around. */
  pull?: boolean;
  /** Marks the control as on (renders in the accent colour). */
  active?: boolean;
  children?: ReactNode;
};

export default function IconButton({
  label, pull = false, active = false, className = '', children, ...rest
}: Props) {
  return (
    <button
      title={label}
      aria-label={label}
      className={`grid place-items-center w-11 h-11 rounded-md transition-colors flex-shrink-0
        ${active ? 'text-amber' : 'text-dim hover:text-amber'}
        disabled:opacity-30 disabled:hover:text-dim disabled:pointer-events-none
        ${pull ? '-m-2' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
