// The button. Before this existed the same idea was retyped at every call site:
// eight variants of the amber primary alone, with padding drifting across
// py-1.5 / py-2 / py-2.5 / py-3 and size across text-xs / text-sm / text-base.
// The tokens were always consistent; the *composition* wasn't, and that reads at
// close range as an app that was assembled rather than designed.
//
// Three variants, three sizes. If a call site needs a fourth, the answer is
// almost always that it should be using one of these three.
import { motion, useReducedMotion } from 'motion/react';
import type { ComponentProps, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  // The single call to action on a surface.
  primary: 'bg-accent text-bg font-bold hover:brightness-105',
  // Everything else that is still a real action.
  secondary: 'bg-panel2 border border-line font-semibold hover:border-accent',
  // Tertiary — present, but never competing.
  quiet: 'border border-line text-dim font-semibold hover:border-accent hover:text-accent',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'gap-1.5 px-3.5 py-2 text-xs',
  md: 'gap-2 px-5 py-2.5 text-sm',
  lg: 'gap-2 px-6 py-3 text-base',
};

// Controls are rounded-md (10px); rounded-lg (16px) is reserved for cards, so
// radius alone tells you whether a thing is a surface or something you press.
// `tap-44` here rather than at each call site, because the padding scale alone
// does not reach 44px at any size: lg computes to 42, md to ~37, sm to ~32. The
// app's primary action — *Start session* on Today — was one of the 42s. It only
// applies on a coarse pointer, so the desktop rhythm is unchanged.
const BASE = 'tap-44 inline-flex items-center justify-center rounded-md transition-colors '
  + 'disabled:opacity-40 disabled:pointer-events-none';

/** The button's classes, for the rare case where the element can't be a button
 *  (e.g. a span styled as a CTA inside a larger button). Prefer <Button />. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${extra}`.trim();
}

type Props = Omit<ComponentProps<typeof motion.button>, 'children'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container width (and centre the content). */
  block?: boolean;
  children?: ReactNode;
};

export default function Button({
  variant = 'primary', size = 'md', block = false, className = '', ...rest
}: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      // A press should be felt. Guarded, because a scale is still motion.
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={buttonClass(variant, size, `${block ? 'w-full' : ''} ${className}`)}
      {...rest}
    />
  );
}
