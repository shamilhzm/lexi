// Lexi — an open-source German vocabulary terminal (A1–C2), donation-supported.
// Four surfaces: Markt (the dictionary market, by theme group), Üben (FSRS
// review), Decks (sectors), Wortkarte (semantic map). Dark Bloomberg aesthetic.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, GraduationCap, Layers, Network, Heart, Sunrise, ScanText, Cog, Settings as SettingsIcon, TrendingDown, MoreHorizontal } from 'lucide-react';
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
import BlindSpots from './views/BlindSpots.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { recordVisit, totals } from './store.ts';
import { useStore } from './useStore.ts';
import { primeVoices, fmt } from './lib/ui.ts';
import type { Target } from './types.ts';

export type View = 'today' | 'markt' | 'review' | 'decks' | 'karte' | 'mining' | 'gym' | 'placement' | 'galaxy' | 'settings' | 'blindspots';
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

type NavItem = { id: View; label: string; icon: any };
const PRIMARY: NavItem[] = [
  { id: 'today', label: 'Today', icon: Sunrise },
  { id: 'markt', label: 'Market', icon: LayoutGrid },
  { id: 'review', label: 'Study', icon: GraduationCap },
  { id: 'gym', label: 'Gym', icon: Cog },
  { id: 'galaxy', label: 'Word Map', icon: Network },
];
const MORE: NavItem[] = [
  { id: 'mining', label: 'Mine', icon: ScanText },
  { id: 'decks', label: 'Decks', icon: Layers },
  { id: 'blindspots', label: 'Blind Spots', icon: TrendingDown },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  useStore();
  const [view, setView] = useState<View>('today');
  const [target, setTarget] = useState<Target>(ALL);
  const [decksGroup, setDecksGroup] = useState<string | null>(null);
  const [mapSector, setMapSector] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { recordVisit(); primeVoices(); }, []);

  const study = (t: Target) => { setTarget(t); setView('review'); };
  const openGroup = (g: string) => { setDecksGroup(g); setView('decks'); };
  const openMap = (sector: string) => { setMapSector(sector); setView('karte'); };
  const go = (v: View) => { if (v === 'review') setTarget(ALL); setView(v); setMoreOpen(false); };

  const t = totals();
  const key = view + (view === 'review' ? `:${target.kind}:${target.name}` : '') + (view === 'karte' ? `:${mapSector}` : '') + (view === 'decks' ? `:${decksGroup}` : '');

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden">
      <header className="safe-top flex items-center gap-2 sm:gap-3.5 px-3 sm:px-4 pb-2.5 bg-panel border-b border-line flex-shrink-0">
        <Logo />
        <nav className="flex gap-1 ml-2">
          {PRIMARY.map((n) => {
            const active = view === n.id;
            return (
              <button key={n.id} onClick={() => go(n.id)}
                className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                  active ? 'text-amber bg-panel2' : 'text-dim hover:text-txt hover:bg-panel2'}`}>
                <n.icon size={14} strokeWidth={active ? 2.4 : 1.8} />
                <span className="hidden sm:inline">{n.label}</span>
                {active && <motion.span layoutId="nav-underline" className="absolute left-2 right-2 -bottom-px h-px bg-amber" />}
              </button>
            );
          })}
          {/* More menu */}
          <div className="relative">
            <button onClick={() => setMoreOpen((o) => !o)}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                MORE.some((m) => m.id === view) ? 'text-amber bg-panel2' : 'text-dim hover:text-txt hover:bg-panel2'}`}>
              <MoreHorizontal size={14} />
              <span className="hidden sm:inline">More</span>
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
                <div className="absolute left-0 mt-1.5 z-40 bg-panel border border-line rounded-lg shadow-2xl py-1 w-44">
                  {MORE.map((m) => (
                    <button key={m.id} onClick={() => go(m.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors ${
                        view === m.id ? 'text-amber' : 'text-txt hover:bg-panel2'}`}>
                      <m.icon size={15} /> {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>
        <div className="flex-1" />
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
            <ErrorBoundary resetKey={view}>
            {view === 'today' && <Today onStart={study} onStudySector={(s) => study({ kind: 'sector', name: s })} onPlacement={() => setView('placement')} />}
            {view === 'placement' && <Placement onDone={() => setView('today')} />}
            {view === 'settings' && <Settings />}
            {view === 'blindspots' && <BlindSpots onDrill={() => setView('gym')} />}
            {view === 'mining' && <Mining onStudy={study} />}
            {view === 'gym' && <Gym />}
            {view === 'markt' && <Markt onOpenGroup={openGroup} onStudyGroup={(g) => study({ kind: 'group', name: g })} onStudyAll={() => study(ALL)} />}
            {view === 'review' && <Review target={target} onExit={() => setView('today')} onPick={() => { setDecksGroup(null); setView('decks'); }} />}
            {view === 'galaxy' && <Galaxy onOpenSector={openMap} onStudySector={study} />}
            {view === 'decks' && <Decks initialGroup={decksGroup} onStudy={study} onMap={openMap} />}
            {view === 'karte' && <Wortkarte initialSector={mapSector} onStudy={study} />}
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
