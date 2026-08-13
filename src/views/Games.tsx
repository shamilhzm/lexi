// Games — the fourth destination.
//
// One game today. It is a destination rather than a card buried in Library
// because the point of a game surface is that it is *findable when you do not
// feel like studying*, and something you have to go three levels deep to reach
// is not that. Connections lands beside it; the shell is built for two, and
// deliberately does not ship a "coming soon" tile for the one that does not
// exist yet — dead UI teaches a learner that this app's buttons sometimes do
// nothing.
import { useMemo, useState } from 'react';
import { Keyboard, Trophy } from 'lucide-react';
import Card from '../components/ui/Card.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import Chip from '../components/ui/Chip.tsx';
import { placementLevel, studyLevel } from '../store.ts';
import { useStore } from '../useStore.ts';
import { raceBests } from '../lib/exam-store.ts';
import Race from './games/Race.tsx';
import { ALL_LEVELS, type CEFR } from '../types.ts';

export default function Games() {
  useStore();
  const start = (placementLevel() as CEFR | null) ?? (studyLevel() as CEFR | null) ?? 'A1';
  const [level, setLevel] = useState<CEFR>(start);
  const [playing, setPlaying] = useState(false);
  const bests = useMemo(() => raceBests(), [playing]);
  const best = bests[level];

  if (playing) return <Race level={level} onExit={() => setPlaying(false)} />;

  return (
    <div className="w-full">
      <h2 className="text-lg sm:text-xl font-bold mb-1">Spiele</h2>
      <p className="text-dim text-xs mb-4 leading-relaxed max-w-[46rem]">
        Kurze Runden mit echtem Deutsch — für die Tage, an denen eine Lernsitzung zu viel verlangt ist.
      </p>

      {/* A local pick, not the global level filter: choosing to race at A2 for fun
          must not silently re-scope the study session waiting on Today. */}
      <div className="mb-4">
        <Kicker className="block mb-1.5">Niveau</Kicker>
        <div className="flex items-center gap-1 flex-wrap">
          {ALL_LEVELS.map((l) => (
            <button key={l} onClick={() => setLevel(l as CEFR)} aria-pressed={level === l}
              className={`tap-44-sq inline-flex items-center justify-center font-mono text-2xs px-2 py-1
                rounded-md border transition-colors ${
                  level === l ? 'border-amber text-amber bg-panel2' : 'border-line text-dim hover:text-txt'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => setPlaying(true)}
        className="tap-44 w-full text-left group">
        <Card pad="md" className="hover:border-amber transition-colors">
          <div className="flex items-start gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-md bg-panel2 text-amber flex-shrink-0">
              <Keyboard size={20} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-base font-bold">Tipprennen</span>
                {best && <Chip tone="good"><Trophy size={11} /> {best.wpm} WPM</Chip>}
              </span>
              <span className="block text-sm text-dim leading-relaxed">
                Drei Sätze aus Ihren eigenen Karten, gegen zwei Gegner mit festem Tempo. Groß­schreibung,
                Umlaute und ß zählen — genau das, was in der Prüfung Punkte kostet.
              </span>
            </span>
          </div>
        </Card>
      </button>

      <p className="text-2xs text-dim mt-4 leading-relaxed max-w-[46rem]">
        Tippgeschwindigkeit ist kein Maß für Ihr Deutsch — Schreiben wird in allen sechs Prüfungen mit
        der Hand geschrieben. Das Rennen übt die Rechtschreibung unter Zeitdruck; die WPM-Zahl ist nur
        dazu da, dass Sie wiederkommen.
      </p>
    </div>
  );
}
