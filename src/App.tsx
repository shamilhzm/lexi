// Lexi — a German vocabulary terminal (A1–C2).
// Layout: a collapsible left Sidebar (desktop) / hamburger drawer (mobile) + a
// main content area. One home screen (Today); Study launches from "Start session";
// Explore holds the market; Fundamentals holds the grammar drills; Settings live
// inside the Profile. Cool "Glacier" terminal aesthetic.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu } from 'lucide-react';
import Ticker from './components/Ticker.tsx';
import Sidebar, { LexiMark } from './components/Sidebar.tsx';
import Review from './views/Review.tsx';
import Today from './views/Today.tsx';
import Explore from './views/Explore.tsx';
import Fundamentals, { MODE_TAG, type Mode as DrillMode } from './views/Fundamentals.tsx';
import Placement from './views/Placement.tsx';
import Profile from './views/Profile.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { recordVisit, recordSnapshot, setOnboarded, firstRunIds, buildBriefing, profileName, placementLevel, streak } from './store.ts';
import { useStore } from './useStore.ts';
import { primeVoices } from './lib/ui.ts';
import type { Target } from './types.ts';

export type View = 'home' | 'explore' | 'fundamentals' | 'review' | 'placement' | 'profile';
const ALL: Target = { kind: 'all', name: 'All sectors' };
const COLLAPSE_KEY = 'lexi.sidebar.collapsed.v1';

export default function App() {
  useStore(); // keep the sidebar profile (name / level / streak) live
  const [view, setView] = useState<View>('home');
  const [target, setTarget] = useState<Target>(ALL);
  const [exploreInit, setExploreInit] = useState<'markt' | 'decks'>('markt');
  const [drillInit, setDrillInit] = useState<DrillMode | 'grammar' | null>(null);
  const [guided, setGuided] = useState(false);   // first-run: placement → first session → recap
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { recordVisit(); recordSnapshot(); primeVoices(); }, []);

  const toggleCollapse = () => setCollapsed((c) => {
    const n = !c;
    try { localStorage.setItem(COLLAPSE_KEY, n ? '1' : '0'); } catch { /* */ }
    return n;
  });

  const study = (t: Target) => { setTarget(t); setView('review'); };
  const go = (v: View) => {
    if (v === 'review') setTarget(ALL);
    if (v === 'fundamentals') setDrillInit(null);
    if (v === 'explore') setExploreInit('markt');
    setGuided(false); setView(v); setMobileOpen(false);
  };
  /** The primary CTA — assemble and launch today's session. */
  const startSession = () => { setGuided(false); setMobileOpen(false); study({ kind: 'custom', name: "Today's session", ids: buildBriefing().ids }); };

  // First-run chain: hero → placement → an auto-built 10-card session → recap.
  const startFirstRun = () => { setGuided(true); setView('placement'); };
  const firstRunSession = () => { setTarget({ kind: 'custom', name: 'First session', ids: firstRunIds(10) }); setView('review'); };
  const endGuided = () => { setOnboarded(); setGuided(false); setView('home'); };
  /** Today's Fundamentals widget → straight into a specific drill (or the exercise bank). */
  const openDrill = (m: DrillMode | 'grammar') => { setDrillInit(m); setView('fundamentals'); };
  /** Blind Spots → the matching Fundamentals drill (word-drill tags map to a mode; grammar tags open the exercise bank). */
  const drillFor = (tag?: string) => {
    const mode = (Object.entries(MODE_TAG).find(([, t]) => t === tag)?.[0] as DrillMode | undefined) ?? 'grammar';
    setDrillInit(mode); setView('fundamentals');
  };

  const key = view + (view === 'review' ? `:${target.kind}:${target.name}` : '');

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      <Sidebar
        view={view} onGo={go} onStartSession={startSession}
        collapsed={collapsed} onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}
        onProfile={() => go('profile')}
        name={profileName()} level={placementLevel()} streak={streak()}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar — the sidebar is a drawer on phones. */}
        <header className="sm:hidden safe-top flex items-center gap-2.5 px-3 h-[52px] bg-panel border-b border-line flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="grid place-items-center w-9 h-9 -ml-1 text-dim hover:text-amber" title="Menu"><Menu size={20} /></button>
          <LexiMark size={24} />
          <span className="font-bold text-[17px] tracking-wide">Lexi</span>
        </header>

        {/* The live ticker is peripheral motion — hide it during a session. */}
        {view !== 'review' && <Ticker onPick={(g) => study({ kind: 'group', name: g })} />}

        <main className="flex-1 overflow-y-auto bg-bg">
          <AnimatePresence mode="wait">
            <motion.div key={key}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className="max-w-[1280px] mx-auto px-3 sm:px-5 py-4 safe-bottom">
              <ErrorBoundary resetKey={view}>
                {view === 'home' && <Today onStart={study} onPlacement={() => setView('placement')} onGuidedStart={startFirstRun} onDrill={openDrill} onBlindDrill={drillFor} />}
                {view === 'explore' && <Explore onStudy={study} initial={exploreInit} />}
                {view === 'fundamentals' && <Fundamentals initial={drillInit} />}
                {view === 'placement' && <Placement onDone={() => { if (guided) firstRunSession(); else setView('home'); }} />}
                {view === 'profile' && <Profile />}
                {view === 'review' && <Review target={target} firstRun={guided} onExit={() => { if (guided) endGuided(); else setView('home'); }} onPick={() => { setExploreInit('decks'); setView('explore'); }} onDrills={() => { setDrillInit(null); setView('fundamentals'); }} />}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
