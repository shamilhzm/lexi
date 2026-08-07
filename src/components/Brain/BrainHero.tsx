// The brain on Today — a strip you glance at, and a door.
//
// It earns its place at the top of the first screen by answering a question no
// other surface on Today answers: not "what do I do now?" but "what have I
// built?". The treemap and the trend charts measure; this one is the only thing
// in the app that shows the *shape* of a lexicon.
//
// It is also where the session pays off. Grade a card and its point flares;
// come back from a session and the whole thing replays what changed.
import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import BrainScene from './BrainScene.tsx';
import { useBrainField } from './useBrain.ts';
import { REGIONS, REGION_BY_ID } from '../../lib/brain/atlas.ts';
import { HEX } from '../../lib/brain/palette.ts';
import { fmt } from '../../lib/ui.ts';

export default function BrainHero({ onOpen }: { onOpen: () => void }) {
  const { progress } = useBrainField();

  const { known, all, top } = useMemo(() => {
    let known = 0, all = 0;
    const ranked: { id: string; known: number }[] = [];
    for (const r of REGIONS) {
      const p = progress.get(r.id);
      if (!p) continue;
      known += p.known; all += p.total;
      if (p.known > 0) ranked.push({ id: r.id, known: p.known });
    }
    ranked.sort((a, b) => b.known - a.known);
    return { known, all, top: ranked.slice(0, 4) };
  }, [progress]);

  return (
    <button
      onClick={onOpen}
      className="brain-hero group relative block w-full overflow-hidden rounded-lg mb-4 text-left"
      aria-label={
        known > 0
          ? `Your lexicon across the brain: ${known} words consolidated of ${all}. Strongest in ${top.map((t) => REGION_BY_ID.get(t.id)?.short).join(', ')}. Open the map.`
          : 'Your lexicon across the brain. Nothing learned yet. Open the map.'
      }>
      <BrainScene mode="hero" className="h-[210px] sm:h-[260px] w-full" />

      {/* Text sits over the canvas rather than beside it: the brain is the
          object, and a two-column layout would make it an illustration. */}
      <span className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
        <span className="flex items-start gap-3">
          <span className="min-w-0">
            <span className="block text-white/50 text-2xs font-mono uppercase tracking-wider">Dein Wortschatz</span>
            <span className="block mt-1.5">
              <span className="font-mono font-bold text-white text-2xl sm:text-3xl tabular-nums leading-none">{fmt(known)}</span>
              <span className="text-white/45 text-xs ml-2">of {fmt(all)} consolidated</span>
            </span>
          </span>
          <span className="ml-auto flex items-center gap-1 text-white/45 text-2xs flex-shrink-0
            group-hover:text-white/80 transition-colors">
            Explore <ChevronRight size={13} />
          </span>
        </span>

        <span className="flex items-center gap-2.5 flex-wrap">
          {top.length > 0 ? top.map((t) => {
            const r = REGION_BY_ID.get(t.id);
            return (
              <span key={t.id} className="flex items-center gap-1.5 text-2xs text-white/55">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: HEX[t.id], boxShadow: `0 0 6px ${HEX[t.id]}` }} />
                {r?.short}
              </span>
            );
          }) : (
            <span className="text-2xs text-white/45">
              Every word you learn lights up where its meaning lives.
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
