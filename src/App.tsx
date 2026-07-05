// Lexi — an open-source German vocabulary terminal (A1–C2), donation-supported.
// Primary surfaces: Today (daily briefing), Study (the FSRS session + drills),
// and Explore (the Markt treemap → Decks → Wortkarte, plus the Galaxie map).
// Dark Bloomberg aesthetic.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Compass, Heart, Sunrise, BookOpen, Settings as SettingsIcon, TrendingDown, MoreHorizontal, MessagesSquare, Swords } from 'lucide-react';
import Ticker from './components/Ticker.tsx';
import Review from './views/Review.tsx';
import Explore from './views/Explore.tsx';
import Today from './views/Today.tsx';
import Reader from './views/Reader.tsx';
import Gym, { MODE_TAG, type Mode as GymMode } from './views/Gym.tsx';
import Placement from './views/Placement.tsx';
import Settings from './views/Settings.tsx';
import BlindSpots from './views/BlindSpots.tsx';
import Tutor from './views/Tutor.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { recordVisit, recordSnapshot, totals, setOnboarded, firstRunIds } from './store.ts';
import { useStore } from './useStore.ts';
import { primeVoices, fmt } from './lib/ui.ts';
import type { Target } from './types.ts';

export type View = 'today' | 'review' | 'explore' | 'reader' | 'gym' | 'placement' | 'settings' | 'blindspots' | 'tutor';
const ALL: Target = { kind: 'all', name: 'All sectors' };

function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="grid place-items-center w-7 h-7 rounded-[10px] font-serif font-bold text-bg text-[20px]"
            style={{ background: 'linear-gradient(135deg,#ffb000,#ff7b00)' }}>L</span>
      <span className="leading-none">
        <span className="font-bold tracking-wide text-[15px]">Lexi</span><br />
        <span className="text-amber font-semibold tracking-[2px]" style={{ fontSize: 9 }}>GERMAN VOCAB TERMINAL</span>
      </span>
    </div>
  );
}

type NavItem = { id: View; label: string; icon: any; short?: string };
const PRIMARY: NavItem[] = [
  { id: 'today', label: 'Today', icon: Sunrise },
  { id: 'review', label: 'Study', icon: GraduationCap },
  { id: 'explore', label: 'Explore', icon: Compass },
];
const MORE: NavItem[] = [
  { id: 'tutor', label: 'AI Tutor', icon: MessagesSquare },
  { id: 'reader', label: 'Lesen', icon: BookOpen },
  { id: 'blindspots', label: 'Blind Spots', icon: TrendingDown },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];
// Paper ("Kartenwerk") surface is available but OFF — the warm look clashed with
// the terminal identity. Everything stays on the cohesive dark terminal. To try
// the hybrid again, add view ids here (the `.paper` styles still live in index.css).
const PAPER_VIEWS = new Set<View>([]);

export default function App() {
  useStore();
  const [view, setView] = useState<View>('today');
  const [target, setTarget] = useState<Target>(ALL);
  const [exploreInit, setExploreInit] = useState<'markt' | 'decks'>('markt');
  const [gymInit, setGymInit] = useState<GymMode | 'grammar' | null>(null);
  const [guided, setGuided] = useState(false);   // first-run: placement → first session → recap
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { recordVisit(); recordSnapshot(); primeVoices(); }, []);

  const study = (t: Target) => { setTarget(t); setView('review'); };
  const go = (v: View) => {
    if (v === 'review') setTarget(ALL);
    if (v === 'gym') setGymInit(null);
    if (v === 'explore') setExploreInit('markt');
    setGuided(false); setView(v); setMoreOpen(false);
  };
  // First-run chain: hero → placement → an auto-built 10-card session → recap.
  const startFirstRun = () => { setGuided(true); setView('placement'); };
  const firstRunSession = () => { setTarget({ kind: 'custom', name: 'First session', ids: firstRunIds(10) }); setView('review'); };
  const endGuided = () => { setOnboarded(); setGuided(false); setView('today'); };
  /** Blind Spots → the matching Gym drill (word-drill tags map to a mode; grammar tags open the exercise bank). */
  const drillFor = (tag?: string) => {
    const mode = (Object.entries(MODE_TAG).find(([, t]) => t === tag)?.[0] as GymMode | undefined) ?? 'grammar';
    setGymInit(mode); setView('gym');
  };

  const t = totals();
  const key = view + (view === 'review' ? `:${target.kind}:${target.name}` : '');

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden">
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
                  <a href="/lexi-duel.html" target="_blank" rel="noreferrer"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left text-txt hover:bg-panel2 transition-colors border-t border-line mt-1 pt-2"
                    title="Pass-and-play word duel — challenge friends, family or classmates">
                    <Swords size={15} /> Lexi Duel
                  </a>
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

      <Ticker onPick={(g) => study({ kind: 'group', name: g })} />

      <main className={`flex-1 overflow-y-auto bg-bg ${PAPER_VIEWS.has(view) ? 'paper' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div key={key}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="max-w-[1280px] mx-auto px-3 sm:px-4 py-4 safe-bottom">
            <ErrorBoundary resetKey={view}>
            {view === 'today' && <Today onStart={study} onStudySector={(s) => study({ kind: 'sector', name: s })} onPlacement={() => setView('placement')} onGuidedStart={startFirstRun} onGym={() => { setGymInit(null); setView('gym'); }} />}
            {view === 'placement' && <Placement onDone={() => { if (guided) firstRunSession(); else setView('today'); }} />}
            {view === 'settings' && <Settings />}
            {view === 'blindspots' && <BlindSpots onDrill={drillFor} />}
            {view === 'tutor' && <Tutor onOpenSettings={() => setView('settings')} />}
            {view === 'reader' && <Reader onStudy={study} />}
            {view === 'gym' && <Gym initial={gymInit} />}
            {view === 'explore' && <Explore onStudy={study} onStudyAll={() => study(ALL)} initial={exploreInit} />}
            {view === 'review' && <Review target={target} firstRun={guided} onExit={() => { if (guided) endGuided(); else setView('today'); }} onPick={() => { setExploreInit('decks'); setView('explore'); }} onDrills={() => { setGymInit(null); setView('gym'); }} />}
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
                <a href="/lexi-duel.html" target="_blank" rel="noreferrer"
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-left text-txt hover:bg-panel2 transition-colors border-t border-line mt-1"
                  title="Pass-and-play word duel — challenge friends, family or classmates">
                  <Swords size={15} /> Lexi Duel
                </a>
              </div>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
