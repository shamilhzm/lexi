// Scrolling group ticker — each theme group's coverage as a % with an up/down
// mark, the way a market terminal streams symbols. Pauses on hover.
import { useMemo } from 'react';
import { groupStats } from '../store.ts';
import { useStore } from '../useStore.ts';

export default function Ticker({ onPick }: { onPick: (group: string) => void }) {
  const v = useStore();
  const items = useMemo(() => {
    return groupStats().map((s) => {
      const pctVal = Math.round(s.coverage * 100);
      const chg = pctVal - 50;
      const cls = chg > 4 ? 'text-green' : chg < -4 ? 'text-red' : 'text-amber';
      const arr = chg >= 0 ? '▲' : '▼';
      const sym = s.name.replace(/[^A-Za-zÄÖÜäöü ]/g, '').split(' ')[0].toUpperCase().slice(0, 6);
      return { key: s.name, name: s.name, sym, pctVal, cls, arr, mag: Math.abs(chg) };
    });
  }, [v]);

  const row = (dupe: boolean) => items.map((it) => (
    <button key={(dupe ? 'b' : 'a') + it.key} onClick={() => onPick(it.name)}
      title={`Study ${it.name}`} className="text-dim hover:text-amber transition-colors cursor-pointer">
      <b className="text-txt">{it.sym}</b> {it.pctVal}% <span className={it.cls}>{it.arr}{it.mag}</span>
    </button>
  ));

  return (
    <div className="bg-[#06080c] border-b border-line overflow-hidden flex-shrink-0">
      <div className="ticker-track flex gap-8 py-1.5 px-4 whitespace-nowrap font-mono text-[12px] w-max">
        {row(false)}{row(true)}
      </div>
    </div>
  );
}
