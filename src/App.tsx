// Lexi — a German vocabulary terminal (A1–C2).
// Primary surfaces: Home (the daily briefing + the Knowledge Heatmap on one
// scroll) and Study (the FSRS session + drills).
// Cool "Glacier" terminal aesthetic.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Heart, Sunrise, Settings as SettingsIcon, TrendingDown, MoreHorizontal } from 'lucide-react';
import Ticker from './components/Ticker.tsx';
import Review from './views/Review.tsx';
import Home from './views/Home.tsx';
import Gym, { MODE_TAG, type Mode as GymMode } from './views/Gym.tsx';
import Placement from './views/Placement.tsx';
import Settings from './views/Settings.tsx';
import BlindSpots from './views/BlindSpots.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { recordVisit, recordSnapshot, totals, setOnboarded, firstRunIds } from './store.ts';
import { useStore } from './useStore.ts';
import { primeVoices, fmt } from './lib/ui.ts';
import type { Target } from './types.ts';

export type View = 'home' | 'review' | 'gym' | 'placement' | 'settings' | 'blindspots';
const ALL: Target = { kind: 'all', name: 'All sectors' };

function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg viewBox="0 0 150 150" className="w-7 h-7" role="img" aria-label="Lexi">
        <rect width="150" height="150" rx="34" fill="#0e1722" />
        <rect x="52" y="40" width="20" height="72" rx="3" fill="#38cde8" />
        <rect x="52" y="92" width="60" height="20" rx="3" fill="#38cde8" />
        <rect x="88" y="40" width="20" height="22" rx="3" fill="#38cde8" />
      </svg>
      <span className="leading-none">
        <span className="font-bold tracking-wide text-[15px]">Lexi</span><br />
        <span className="text-amber font-semibold tracking-[2px]" style={{ fontSize: 9 }}>GERMAN VOCAB TERMINAL</span>
      </span>
    </div>
  );
}

type NavItem = { id: View; label: string; icon: any; short?: string };
const PRIMARY: NavItem[] = [
  { id: 'home', label: 'Today', icon: Sunrise },
  { id: 'review', label: 'Study', icon: GraduationCap },
];
const MORE: NavItem[] = [
  { id: 'blindspots', label: 'Blind Spots', icon: TrendingDown },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];
// Paper ("Kartenwerk") surface is available but OFF — the warm look clashed with
// the terminal identity. Everything stays on the cohesive dark terminal. To try
// the hybrid again, add view ids here (the `.paper` styles still live in index.css).
const PAPER_VIEWS = new Set<View>([]);

export default function App() {
  useStore();
  const [view, setView] = useState<View>('home');
  const [target, setTarget] = useState<Target>(ALL);
  const [homeInit, setHomeInit] = useState<'home' | 'decks'>('home');
  const [gymInit, setGymInit] = useState<GymMode | 'grammar' | null>(null);
  const [guided, setGuided] = useState(false);   // first-run: placement → first session → recap
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { recordVisit(); recordSnapshot(); primeVoices(); }, []);

  const study = (t: Target) => { setTarget(t); setView('review'); };
  const go = (v: View) => {
    if (v === 'review') setTarget(ALL);
    if (v === 'gym') setGymInit(null);
    if (v === 'home') setHomeInit('home');
    setGuided(false); setView(v); setMoreOpen(false);
  };
  // First-run chain: hero → placement → an auto-built 10-card session → recap.
  const startFirstRun = () => { setGuided(true); setView('placement'); };
  const firstRunSession = () => { setTarget({ kind: 'custom', name: 'First session', ids: firstRunIds(10) }); setView('review'); };
  const endGuided = () => { setOnboarded(); setGuided(false); setView('home'); };
  /** Today's grammar-drills widget → straight into a specific drill (or the exercise bank). */
  const openDrill = (m: GymMode | 'grammar') => { setGymInit(m); setView('gym'); };
  /** Blind Spots → the matching Gym drill (word-drill tags map to a mode; grammar tags open the exercise bank). */
  const drillFor = (tag?: string) => {
    const mode = (Object.entries(MODE_TAG).find(([, t]) => t === tag)?.[0] as GymMode | undefined) ?? 'grammar';
    setGymInit(mode); setView('gym');
  };

  const t = totals();
  const key = view + (view === 'review' ? `:${target.kind}:${target.name}` : '');

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden">
      <header className="safe-top flex items-center gap-2 sm:gap-3.5 px-3 sm:px-4 pb-2.5 bg-panel border-b border-line flex-shrink-0">
        <Logo />
        <nav className="hidden sm:flex gap-1 ml-2">
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
        {/* TODO: point at the real pricing/support page once billing is set up. */}
        <a href="#" className="hidden sm:flex items-center gap-1.5 text-[11px] text-dim hover:text-amber border border-line rounded-full px-2.5 py-1 transition-colors" title="Support Lexi's development">
          <Heart size={12} /> Support
        </a>
        <div className="text-[11px] text-dim hidden md:block">{fmt(t.count)} cards · A1–C2</div>
      </header>

      {/* The live ticker is peripheral motion — hide it during a session so the card stays the focus. */}
      {view !== 'review' && <Ticker onPick={(g) => study({ kind: 'group', name: g })} />}

      <main className={`flex-1 overflow-y-auto bg-bg ${PAPER_VIEWS.has(view) ? 'paper' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div key={key}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="max-w-[1280px] mx-auto px-3 sm:px-4 py-4 safe-bottom">
            <ErrorBoundary resetKey={view}>
            {view === 'home' && <Home onStudy={study} onStudyAll={() => study(ALL)} onDrill={openDrill} onPlacement={() => setView('placement')} onGuidedStart={startFirstRun} onBlindSpots={() => setView('blindspots')} initial={homeInit} />}
            {view === 'placement' && <Placement onDone={() => { if (guided) firstRunSession(); else setView('home'); }} />}
            {view === 'settings' && <Settings />}
            {view === 'blindspots' && <BlindSpots onDrill={drillFor} />}
            {view === 'gym' && <Gym initial={gymInit} />}
            {view === 'review' && <Review target={target} firstRun={guided} onExit={() => { if (guided) endGuided(); else setView('home'); }} onPick={() => { setHomeInit('decks'); setView('home'); }} onDrills={() => { setGymInit(null); setView('gym'); }} />}
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden flex items-stretch border-t border-line bg-panel safe-bottom flex-shrink-0">
        {PRIMARY.map((n) => {
          const active = view === n.id;
          return (
            <button key={n.id} onClick={() => go(n.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${active ? 'text-amber' : 'text-dim'}`}>
              <n.icon size={19} strokeWidth={active ? 2.4 : 1.8} />
              {n.short ?? n.label}
            </button>
          );
        })}
        <div className="relative flex-1">
          <button onClick={() => setMoreOpen((o) => !o)}
            className={`w-full flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${MORE.some((m) => m.id === view) || moreOpen ? 'text-amber' : 'text-dim'}`}>
            <MoreHorizontal size={19} /> More
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
              <div className="absolute bottom-full right-1 mb-1.5 z-40 bg-panel border border-line rounded-lg shadow-2xl py-1 w-44">
                {MORE.map((m) => (
                  <button key={m.id} onClick={() => go(m.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-left transition-colors ${view === m.id ? 'text-amber' : 'text-txt hover:bg-panel2'}`}>
                    <m.icon size={15} /> {m.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
