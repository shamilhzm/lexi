// Decks — semantic sectors as cards with a coverage bar and due pill. Filter by
// theme group (or browse all), sort by urgency / size / progress, and study a
// single sector or a whole group.
import { useMemo, useState, type ReactNode } from 'react';
import { Network, Play } from 'lucide-react';
import { sectorStats } from '../store.ts';
import { GROUPS } from '../data/index.ts';
import { useStore } from '../useStore.ts';
import { heat, fmt } from '../lib/ui.ts';
import LevelFilter from '../components/LevelFilter.tsx';
import type { Target } from '../types.ts';

type Sort = 'attention' | 'size' | 'coverage';

/** Known ratio = consolidated (FSRS Review) / total — the headline for a deck. */
const kpct = (d: { known: number; count: number }) => (d.count ? d.known / d.count : 0);

export default function Decks({ initialGroup, onStudy, onMap }:
  { initialGroup: string | null; onStudy: (t: Target) => void; onMap: (sector: string) => void }) {
  const v = useStore();
  const [group, setGroup] = useState<string | null>(initialGroup);
  const [sort, setSort] = useState<Sort>('attention');

  const decks = useMemo(() => {
    const s = sectorStats(group ?? undefined);
    const by: Record<Sort, (a: any, b: any) => number> = {
      attention: (a, b) => (b.due - a.due) || (a.coverage - b.coverage),
      size: (a, b) => b.count - a.count,
      coverage: (a, b) => b.coverage - a.coverage,
    };
    return s.sort(by[sort]);
  }, [group, sort, v]);

  return (
    <div className="bg-panel border border-line rounded-[10px]">
      <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 border-b border-line flex-wrap">
        <h2 className="text-[15px] font-semibold">Vocabulary Decks</h2>
        <span className="text-[11px] text-amber border border-line px-1.5 py-0.5 rounded-full tracking-[1px]">{decks.length} SECTORS</span>
        {group && (
          <button onClick={() => onStudy({ kind: 'group', name: group })}
            className="flex items-center gap-1.5 bg-amber text-bg font-bold rounded-md px-3 py-1.5 text-[13px] hover:brightness-105">
            <Play size={13} /> Study {group}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2.5 flex-wrap">
          <LevelFilter />
          <div className="flex gap-1 text-[13px]">
            {(['attention', 'size', 'coverage'] as Sort[]).map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-2.5 py-1 rounded-md ${sort === s ? 'text-amber bg-panel2' : 'text-dim hover:text-txt'}`}>
                {s === 'attention' ? 'Urgent' : s === 'size' ? 'Size' : 'Progress'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* group filter row */}
      <div className="flex gap-1.5 px-4 py-2.5 border-b border-line overflow-x-auto">
        <Chip on={group === null} onClick={() => setGroup(null)}>All groups</Chip>
        {GROUPS.map((g) => <Chip key={g} on={group === g} onClick={() => setGroup(g)}>{g}</Chip>)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {decks.map((d) => (
          <div key={d.name} className="group bg-panel2 border border-line rounded-[10px] p-3.5 hover:border-amber transition-colors">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[15px] font-semibold leading-tight">{d.name}</h3>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => onMap(d.name)} title="Wortkarte" className="text-dim hover:text-amber"><Network size={15} /></button>
                <button onClick={() => onStudy({ kind: 'sector', name: d.name })} title="Üben" className="text-dim hover:text-green"><Play size={15} /></button>
              </div>
            </div>
            <div className="font-mono text-[11px] text-dim mt-0.5">{fmt(d.count)} cards · {d.levels.join('/')} · {d.group}</div>
            {/* Known (heat) is the headline; coverage sits behind it as a faint "seen" underlay. */}
            <div className="relative h-1.5 bg-[#05070b] rounded mt-2.5 overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded bg-[#2a3340]" style={{ width: `${Math.max(2, d.coverage * 100)}%` }} />
              <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${Math.max(2, kpct(d) * 100)}%`, background: heat(kpct(d)) }} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => onStudy({ kind: 'sector', name: d.name })}
                className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${d.due > 0 ? 'bg-[#3d1216] text-[#ff8a90]' : 'bg-[#0b3b2c] text-[#7ff0c4]'}`}>
                {d.due > 0 ? `${d.due} due` : `${d.newCount} new`}
              </button>
              <span className="font-mono text-[11px] text-dim ml-auto">{Math.round(kpct(d) * 100)}% known</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className={`whitespace-nowrap text-[13px] px-2.5 py-1 rounded-full border transition-colors ${
        on ? 'border-amber text-amber bg-panel2' : 'border-line text-dim hover:text-txt'}`}>{children}</button>
  );
}
