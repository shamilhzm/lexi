// Home — the merged daily surface. The Today briefing sits on top; the Word
// Exchange (Markt) mounts directly beneath it, so "your day" and "the market"
// live on one scroll. The market's back-stack (Markt → Decks → Wortkarte) is
// owned here; drilling in replaces the surface with a back button. Studying
// anything exits into the session.
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Today from './Today.tsx';
import Markt from './Markt.tsx';
import Decks from './Decks.tsx';
import Wortkarte from './Wortkarte.tsx';
import type { Mode } from './Gym.tsx';
import type { Target } from '../types.ts';

type Level = 'home' | 'decks' | 'karte';

export default function Home({ onStudy, onStudyAll, onDrill, onPlacement, onGuidedStart, onBlindDrill, initial = 'home' }:
  { onStudy: (t: Target) => void; onStudyAll: () => void; onDrill: (m: Mode | 'grammar') => void;
    onPlacement: () => void; onGuidedStart: () => void; onBlindDrill: (tag?: string) => void; initial?: 'home' | 'decks' }) {
  const [stack, setStack] = useState<Level[]>(initial === 'decks' ? ['home', 'decks'] : ['home']);
  const [group, setGroup] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);

  const level = stack[stack.length - 1];
  const push = (l: Level) => setStack((s) => [...s, l]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  const openGroup = (g: string) => { setGroup(g); push('decks'); };
  const openMap = (s: string) => { setSector(s); push('karte'); };

  if (level === 'home') {
    return (
      <Today onStart={onStudy} onPlacement={onPlacement} onGuidedStart={onGuidedStart} onDrill={onDrill} onBlindDrill={onBlindDrill}>
        <div className="mt-5">
          <Markt onOpenGroup={openGroup} onStudyGroup={(g) => onStudy({ kind: 'group', name: g })} onStudyAll={onStudyAll} />
        </div>
      </Today>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
        <button onClick={back} title="Back" className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-amber">
          <ArrowLeft size={18} />
        </button>
      </div>
      {level === 'decks' && <Decks initialGroup={group} onStudy={onStudy} onMap={openMap} />}
      {level === 'karte' && <Wortkarte initialSector={sector} onStudy={onStudy} />}
    </div>
  );
}
