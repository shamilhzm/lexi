// Explore — one surface over the market, decks, sector maps, and the galaxy.
// A Markt / Galaxie segmented toggle picks the root; Markt drills into Decks, and
// a deck opens its Wortkarte. The back stack lives here; the composed views are
// reused as-is. Studying anything exits Explore into the session (onStudy).
import { useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import Markt from './Markt.tsx';
import Decks from './Decks.tsx';
import Wortkarte from './Wortkarte.tsx';
import Galaxy from './Galaxy.tsx';
import type { Target } from '../types.ts';

type Level = 'markt' | 'decks' | 'karte' | 'galaxy';

export default function Explore({ onStudy, onStudyAll, initial = 'markt' }:
  { onStudy: (t: Target) => void; onStudyAll: () => void; initial?: 'markt' | 'decks' }) {
  const [stack, setStack] = useState<Level[]>(initial === 'decks' ? ['markt', 'decks'] : ['markt']);
  const [group, setGroup] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);

  const level = stack[stack.length - 1];
  const root = stack[0];
  const push = (l: Level) => setStack((s) => [...s, l]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  const openGroup = (g: string) => { setGroup(g); push('decks'); };
  const openMap = (s: string) => { setSector(s); push('karte'); };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
        {stack.length > 1 && (
          <button onClick={back} title="Back" className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-amber">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex rounded-[10px] bg-panel2 border border-line p-0.5 text-[13px]">
          <Seg on={root === 'markt'} onClick={() => setStack(['markt'])}>Markt</Seg>
          <Seg on={root === 'galaxy'} onClick={() => setStack(['galaxy'])}>Galaxie</Seg>
        </div>
      </div>

      {level === 'markt' && <Markt onOpenGroup={openGroup} onStudyGroup={(g) => onStudy({ kind: 'group', name: g })} onStudyAll={onStudyAll} />}
      {level === 'decks' && <Decks initialGroup={group} onStudy={onStudy} onMap={openMap} />}
      {level === 'karte' && <Wortkarte initialSector={sector} onStudy={onStudy} />}
      {level === 'galaxy' && <Galaxy onOpenSector={openMap} onStudySector={onStudy} />}
    </div>
  );
}

function Seg({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-[10px] font-semibold transition-colors ${on ? 'bg-amber text-bg' : 'text-dim hover:text-txt'}`}>
      {children}
    </button>
  );
}
