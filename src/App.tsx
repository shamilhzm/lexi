// Lexi — an open-source German vocabulary terminal (A1–C2), donation-supported.
// Four surfaces: Markt (the dictionary market, by theme group), Üben (FSRS
// review), Decks (sectors), Wortkarte (semantic map). Dark Bloomberg aesthetic.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, GraduationCap, Layers, Network, Heart, Sunrise, ScanText, Cog, Settings as SettingsIcon } from 'lucide-react';
import Ticker from './components/Ticker.tsx';
import Markt from './views/Markt.tsx';
import Review from './views/Review.tsx';
import Decks from './views/Decks.tsx';
import Wortkarte from './views/Wortkarte.tsx';
import Today from './views/Today.tsx';
import Mining from './views/Mining.tsx';
import Gym from './views/Gym.tsx';
import Placement from './views/Placement.tsx';
import Galaxy from './views/Galaxy.tsx';
import Settings from './views/Settings.tsx';
import { recordVisit, totals } from './store.ts';
import { useStore } from './useStore.ts';
import { primeVoices, fmt } from './lib/ui.ts';
import type { Target } from './types.ts';

export type View = 'today' | 'markt' | 'review' | 'decks' | 'karte' | 'mining' | 'gym' | 'placement' | 'galaxy' | 'settings';
const ALL: Target = { kind: 'all', name: 'All sectors' };

function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="grid place-items-center w-7 h-7 rounded-[7px] font-serif font-bold text-bg text-[18px]"
            style={{ background: 'linear-gradient(135deg,#ffb000,#ff7b00)' }}>L</span>
      <span className="leading-none">
        <span className="font-bold tracking-wide text-[15px]">Lexi</span><br />
        <span className="text-amber font-semibold tracking-[2px]" style={{ fontSize: 9 }}>GERMAN VOCAB TERMINAL</span>
      </span>
    </div>
  );
}

const NAV: { id: View; label: string; icon: any }[] = [
  { id: 'today', label: 'Today', icon: Sunrise },
  { id: 'markt', label: 'Market', icon: LayoutGrid },
  { id: 'review', label: 'Study', icon: GraduationCap },
  { id: 'gym', label: 'Gym', icon: Cog },
  { id: 'mining', label: 'Mine', icon: ScanText },
  { id: 'decks', label: 'Decks', icon: Layers },
  { id: 'galaxy', label: 'Word Map', icon: Network },
];

export default function App() {
  useStore();
  const [view, setView] = useState<View>('today');
  const [target, setTarget] = useState<Target>(ALL);
  const [decksGroup, setDecksGroup] = useState<string | null>(null);
  const [mapSector, setMapSector] = useState<string | null>(null);

  useEffect(() => { recordVisit(); primeVoices(); }, []);

  const study = (t: Target) => { setTarget(t); setView('review'); };
  const openGroup = (g: string) => { setDecksGroup(g); setView('decks'); };
  const openMap = (sector: string) => { setMapSector(sector); setView('karte'); };
  const go = (v: View) => { if (v === 'review') setTarget(ALL); setView(v); };

  const t = totals();
  const key = view + (view === 'review' ? `:${target.kind}:${target.name}` : '') + (view === 'karte' ? `:${mapSector}` : '') + (view === 'decks' ? `:${decksGroup}` : '');

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden">
      <header className="safe-top flex items-center gap-2 sm:gap-3.5 px-3 sm:px-4 pb-2.5 bg-panel border-b border-line flex-shrink-0">
        <Logo />
        <nav className="flex gap-1 ml-2">
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button key={n.id} onClick={() => go(n.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                  active ? 'text-amber bg-panel2' : 'text-dim hover:text-txt hover:bg-panel2'}`}>
                <n.icon size={14} strokeWidth={active ? 2.4 : 1.8} />
                <span className="hidden sm:inline">{n.label}</span>
                {active && <motion.span layoutId="nav-underline" className="absolute left-2 right-2 -bottom-px h-px bg-amber" />}
              </button>
            );
          })}
        </nav>
        <div className="flex-1" />
        <button onClick={() => setView('settings')}
          className={`grid place-items-center w-8 h-8 rounded-md transition-colors ${view === 'settings' ? 'text-amber bg-panel2' : 'text-dim hover:text-txt hover:bg-panel2'}`} title="Settings">
          <SettingsIcon size={15} />
        </button>
        <a href="https://opencollective.com" target="_blank" rel="noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-[11px] text-dim hover:text-amber border border-line rounded-full px-2.5 py-1 transition-colors" title="Lexi is free & open-source — support it">
          <Heart size={12} /> Donate
        </a>
        <div className="text-[11px] text-dim hidden md:block">{fmt(t.count)} cards · A1–C2 · Open Source</div>
      </header>

      <Ticker />

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={key}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="max-w-[1280px] mx-auto px-3 sm:px-4 py-4 safe-bottom">
            {view === 'today' && <Today onStart={study} onStudySector={(s) => study({ kind: 'sector', name: s })} onPlacement={() => setView('placement')} />}
            {view === 'placement' && <Placement onDone={() => setView('today')} />}
            {view === 'settings' && <Settings />}
            {view === 'mining' && <Mining onStudy={study} />}
            {view === 'gym' && <Gym />}
            {view === 'markt' && <Markt onOpenGroup={openGroup} onStudyGroup={(g) => study({ kind: 'group', name: g })} onStudyAll={() => study(ALL)} />}
            {view === 'review' && <Review target={target} onExit={() => setView('today')} onPick={() => { setDecksGroup(null); setView('decks'); }} />}
            {view === 'galaxy' && <Galaxy onOpenSector={openMap} onStudySector={study} />}
            {view === 'decks' && <Decks initialGroup={decksGroup} onStudy={study} onMap={openMap} />}
            {view === 'karte' && <Wortkarte initialSector={mapSector} onStudy={study} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
