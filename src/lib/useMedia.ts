import { useEffect, useState } from 'react';

/** Subscribe to a media query. */
export function useMedia(query: string, initial = false): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? initial : window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** True below Tailwind's `sm` breakpoint — i.e. where the sidebar is a drawer,
 *  the bottom bar exists, and layouts get the phone treatment. Kept as one
 *  constant so JS-side breakpoint decisions can't drift from the CSS. */
export const useIsNarrow = () => useMedia('(max-width: 639px)');
