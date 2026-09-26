// A word's pictogram — the mnemonic mark, never the meaning.
//
// Rendered where a learner *reads* a word (the feed, the full entry) and nowhere a
// word is *tested*: a picture on a review front or a gender drill would answer the
// question it asks. The asset has no colour of its own; it takes the page's ink,
// so dark mode and every future theme cost nothing.
//
// The data is tiny (`public/data/picto/`, ~150 bytes a word) and loaded once, all
// levels together, the first time any pictogram is asked for. Every entry is run
// through `validatePicto` again before it touches the DOM — the build already
// checked it, and this is the second check, because the markup is set as SVG.
import { useEffect, useState } from 'react';
import { validatePicto, pictoSvg } from '../lib/picto.ts';

const cache = new Map<string, string>();
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (loading) return loading;
  const base = import.meta.env.BASE_URL || '/';
  const get = (path: string) => fetch(`${base}data/picto/${path}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  loading = get('index.json').then(async (idx: { levels?: string[] } | null) => {
    const maps = await Promise.all((idx?.levels ?? []).map((l) => get(`${l}.json`)));
    for (const m of maps) {
      if (!m || typeof m !== 'object') continue;
      for (const [id, inner] of Object.entries(m as Record<string, unknown>)) {
        if (typeof inner === 'string' && validatePicto(inner).length === 0) cache.set(id, inner);
      }
    }
    listeners.forEach((fn) => fn());
  });
  return loading;
}

/** The pictogram for a card, or nothing — no placeholder, no fallback emblem. */
export default function Picto({ id, size = 96, className = '' }: { id: string; size?: number; className?: string }) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (cache.has(id)) return;
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    void load();
    return () => { listeners.delete(fn); };
  }, [id]);
  const inner = cache.get(id);
  if (!inner) return null;
  return (
    <span aria-hidden="true" className={`inline-block text-txt ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: pictoSvg(inner, size) }} />
  );
}
