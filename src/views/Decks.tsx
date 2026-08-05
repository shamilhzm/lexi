// Decks — semantic sectors as cards with a coverage bar and due pill. Filter by
// theme group (or browse all), sort by urgency / size / progress, and study a
// single sector or a whole group.
import { useMemo, useState, type ReactNode } from 'react';
import { Network, Play, Check, Share2 } from 'lucide-react';
import { sectorStats, completions, profileName } from '../store.ts';
import { GROUPS, WORDS_BY_SECTOR } from '../data/index.ts';
import { buildPack, packFilename } from '../lib/classpack.ts';
import { loadDetail } from '../data/detail.ts';
import { useStore } from '../useStore.ts';
import { heat, fmt } from '../lib/ui.ts';
import LevelFilter from '../components/LevelFilter.tsx';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Chip from '../components/ui/Chip.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import type { Target } from '../types.ts';

type Sort = 'attention' | 'size' | 'coverage';

/** Known ratio = consolidated (FSRS Review) / total — the headline for a deck. */
const kpct = (d: { known: number; count: number }) => (d.count ? d.known / d.count : 0);

/** Download one sector as a shareable pack. Self-contained cards, no progress —
 *  see lib/classpack.ts. Nothing leaves the device except through this click. */
async function exportDeck(sector: string) {
  // Await the detail sidecar first. `validCard` accepts `ex: []`, so a pack built
  // before examples land looks perfectly valid, downloads without complaint, and
  // arrives on a classmate's device with every example stripped. The one silent
  // failure in the split that lands on a third party.
  await loadDetail();
  const cards = WORDS_BY_SECTOR.get(sector) ?? [];
  if (!cards.length) return;
  const pack = buildPack(sector, cards, profileName());
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = packFilename(sector);
  a.click();
  URL.revokeObjectURL(url);
}

export default function Decks({ initialGroup, onStudy, onMap }:
  { initialGroup: string | null; onStudy: (t: Target) => void; onMap: (sector: string) => void }) {
  const v = useStore();
  const [group, setGroup] = useState<string | null>(initialGroup);
  const [sort, setSort] = useState<Sort>('attention');
  const done = useMemo(() => new Set(completions().map((c) => c.id)), [v]);

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
    <Card pad="none">
      <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 border-b border-line flex-wrap">
        {/* h1, not h2: this is the whole content of the #/progress/decks route,
            and it was the only route in the app rendering no top-level heading.
            Sized to match its neighbours rather than to announce itself. */}
        <h1 className="text-base font-semibold">Vocabulary Decks</h1>
        <Chip>{decks.length} sectors</Chip>
        {group && (
          <Button size="sm" onClick={() => onStudy({ kind: 'group', name: group })}>
            <Play size={13} /> Study {group}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2.5 flex-wrap">
          <LevelFilter />
          <div className="flex gap-1 text-xs">
            {(['attention', 'size', 'coverage'] as Sort[]).map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`tap-44 inline-flex items-center px-2.5 py-1 rounded-md ${sort === s ? 'text-amber bg-panel2' : 'text-dim hover:text-txt'}`}>
                {s === 'attention' ? 'Urgent' : s === 'size' ? 'Size' : 'Progress'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* group filter row */}
      <div className="flex gap-1.5 px-4 py-2.5 border-b border-line overflow-x-auto">
        <FilterChip on={group === null} onClick={() => setGroup(null)}>All groups</FilterChip>
        {GROUPS.map((g) => <FilterChip key={g} on={group === g} onClick={() => setGroup(g)}>{g}</FilterChip>)}
      </div>

      {/* The 640–1024px band (every tablet) used to sit at two columns with a
          lot of dead width. md fills it, xl uses a genuinely wide desktop. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
        {decks.map((d) => (
          <Card key={d.name} tone="sunken" nested pad="none"
            className={`group p-3.5 transition-colors ${done.has(d.name) ? 'border-green/40 hover:border-green' : 'hover:border-amber'}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold leading-tight flex items-center gap-1.5 min-w-0">
                {/* Somewhere you've been all the way through, marked as such. */}
                {done.has(d.name) && <Check size={15} className="text-green flex-shrink-0" aria-label="Finished" />}
                {/* Two lines, not one. `truncate` clipped 77 deck names at 375px —
                    "Intermediate descriptive adjec…" and "Intermediate travel and
                    daily …" are the same card to a reader, and the deck name is the
                    only thing distinguishing one deck from another. The `title`
                    stays for the rare name that still needs a third line, but it is
                    a hover affordance and this is a surface people use on a phone. */}
                <span className="line-clamp-2" title={d.name}>{d.name}</span>
              </h3>
              {/* These two had no sizing class at all — a 15px icon with no
                  padding, the smallest touch targets in the app. */}
              <div className="flex gap-0.5 flex-shrink-0 -mt-2 -mr-2">
                {/* The one thing local-first can't do is hand a deck to the person
                    next to you. A pack is the bridge: a file, no account. */}
                <IconButton label={`Export ${d.name} as a word pack to share`}
                  onClick={() => exportDeck(d.name)}><Share2 size={15} /></IconButton>
                <IconButton label={`Word map for ${d.name}`} onClick={() => onMap(d.name)}><Network size={15} /></IconButton>
                <IconButton label={`Study ${d.name}`} onClick={() => onStudy({ kind: 'sector', name: d.name })}
                  className="hover:text-green"><Play size={15} /></IconButton>
              </div>
            </div>
            <div className="font-mono text-2xs text-dim mt-0.5">{fmt(d.count)} cards · {d.levels.join('/')} · {d.group}</div>
            {/* Known (heat) is the headline; coverage sits behind it as a faint "seen" underlay.
                The track is bg-bg, not bg-panel2: the card itself is panel2, so a panel2 track
                was invisible — a deck at 0% known showed no bar at all. */}
            <div className="relative h-1.5 bg-bg rounded-sm mt-2.5 overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-sm bg-line transition-[width] duration-500" style={{ width: `${Math.max(2, d.coverage * 100)}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-500" style={{ width: `${Math.max(2, kpct(d) * 100)}%`, background: heat(kpct(d)) }} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => onStudy({ kind: 'sector', name: d.name })}
                className={`tap-hit font-mono text-2xs px-2 py-0.5 rounded-full ${d.due > 0 ? 'bg-red-d text-red-txt' : 'bg-green-d text-green'}`}>
                {d.due > 0 ? `${d.due} due` : `${d.newCount} new`}
              </button>
              <span className="font-mono text-2xs text-dim ml-auto">{Math.round(kpct(d) * 100)}% known</span>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}

/** The group filter pill — interactive, unlike the read-only <Chip> badge. */
function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`tap-44 inline-flex items-center whitespace-nowrap text-xs px-2.5 py-1 rounded-full border transition-colors ${
        on ? 'border-amber text-amber bg-panel2' : 'border-line text-dim hover:text-txt'}`}>{children}</button>
  );
}
