// Explore — the dictionary market and its drill-downs, split out of Home into its
// own destination. The back-stack (Markt → Decks → Wortkarte) lives here; drilling
// in replaces the surface with a back button. Studying anything exits to a session.
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Markt from './Markt.tsx';
import Decks from './Decks.tsx';
import Wortkarte from './Wortkarte.tsx';
import type { Target } from '../types.ts';

type Level = 'markt' | 'decks' | 'karte';

export default function Explore({ onStudy, initial = 'markt' }:
  { onStudy: (t: Target) => void; initial?: 'markt' | 'decks' }) {
  const [stack, setStack] = useState<Level[]>(initial === 'decks' ? ['markt', 'decks'] : ['markt']);
  const [group, setGroup] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);

  const level = stack[stack.length - 1];
  const push = (l: Level) => setStack((s) => [...s, l]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const openGroup = (g: string) => { setGroup(g); push('decks'); };
  const openMap = (s: string) => { setSector(s); push('karte'); };

  if (level === 'markt') {
    return (
      <Markt
        onStudy={onStudy}
        onStudyGroup={(g) => onStudy({ kind: 'group', name: g })}
        onStudyAll={() => onStudy({ kind: 'all', name: 'All sectors' })}
        onOpenGroup={openGroup}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <button onClick={back} title="Back" className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-amber">
          <ArrowLeft size={18} />
        </button>
      </div>
      {level === 'decks' && <Decks initialGroup={group} onStudy={onStudy} onMap={openMap} />}
      {level === 'karte' && <Wortkarte initialSector={sector} onStudy={onStudy} />}
    </div>
  );
}
