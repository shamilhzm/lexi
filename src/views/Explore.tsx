// Explore — the dictionary market and its drill-downs, split out of Home into its
// own destination. The back-stack (Markt → Decks → Wortkarte) lives here; drilling
// in replaces the surface with a back button. Studying anything exits to a session.
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Markt from './Markt.tsx';
import Decks from './Decks.tsx';
import Wortkarte from './Wortkarte.tsx';
import IconButton from '../components/ui/IconButton.tsx';
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

  // The back row used to hold a lone arrow in an otherwise empty bar, with no
  // indication of what you were backing out of. Name the level and where it sits.
  const title = level === 'decks' ? (group ?? 'All decks') : (sector ?? 'Word map');
  const parent = level === 'decks' ? 'Markt' : 'Decks';

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <IconButton label={`Back to ${parent}`} pull onClick={back}><ArrowLeft size={18} /></IconButton>
        <nav aria-label="Breadcrumb" className="flex items-baseline gap-1.5 min-w-0 ml-1.5">
          <span className="text-2xs text-dim font-mono uppercase tracking-widest flex-shrink-0">{parent} /</span>
          <span className="text-base font-semibold truncate">{title}</span>
        </nav>
      </div>
      {level === 'decks' && <Decks initialGroup={group} onStudy={onStudy} onMap={openMap} />}
      {level === 'karte' && <Wortkarte initialSector={sector} onStudy={onStudy} />}
    </div>
  );
}
