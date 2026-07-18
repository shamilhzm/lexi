// Scrolling group ticker — each theme group's coverage as a %, coloured on the
// slate→green heat scale (no red down-marks), the way a market terminal streams
// symbols. Pauses on hover. Theme-aware surface so it stays legible in light mode.
import { useMemo } from 'react';
import { groupStats } from '../store.ts';
import { useStore } from '../useStore.ts';

export default function Ticker({ onPick }: { onPick: (group: string) => void }) {
  const v = useStore();
  const items = useMemo(() => {
    return groupStats().map((s) => {
      const pctVal = Math.round(s.coverage * 100);
      const sym = s.name.replace(/[^A-Za-zÄÖÜäöü ]/g, '').split(' ')[0].toUpperCase().slice(0, 6);
      // Neutral until you're doing well, then green. Theme tokens (not raw heat)
      // so the % stays AA-legible on the bar in both light and dark. No red.
      const cls = s.coverage >= 0.6 ? 'text-green' : '';
      return { key: s.name, name: s.name, sym, pctVal, cls };
    });
  }, [v]);

  const row = (dupe: boolean) => items.map((it) => (
    <button key={(dupe ? 'b' : 'a') + it.key} onClick={() => onPick(it.name)}
      title={`Study ${it.name}`} className="text-dim hover:text-amber transition-colors cursor-pointer">
      <b className="text-txt">{it.sym}</b> <span className={it.cls}>{it.pctVal}%</span>
    </button>
  ));

  return (
    <div className="bg-panel2 border-b border-line overflow-hidden flex-shrink-0">
      <div className="ticker-track flex items-center gap-8 py-2 px-4 whitespace-nowrap font-mono text-xs leading-normal w-max">
        {row(false)}{row(true)}
      </div>
    </div>
  );
}
