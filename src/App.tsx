// Lexi — a German vocabulary terminal (A1–C2).
// Layout: a collapsible left Sidebar (desktop) / hamburger drawer (mobile) + a
// main content area. One home screen (Today); Study launches from "Start session";
// Explore holds the market; Fundamentals holds the grammar drills; Settings live
// inside the Profile. Cool "Glacier" terminal aesthetic.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Menu } from 'lucide-react';
import Ticker from './components/Ticker.tsx';
import Sidebar, { LexiMark } from './components/Sidebar.tsx';
import BottomNav from './components/BottomNav.tsx';
import Review from './views/Review.tsx';
import Today from './views/Today.tsx';
import Explore from './views/Explore.tsx';
import Grammar, { type GrammarInit } from './views/Grammar.tsx';
import { MODE_TAG, type Mode as DrillMode } from './views/Fundamentals.tsx';
import Placement from './views/Placement.tsx';
import Interests from './views/Interests.tsx';
import Profile from './views/Profile.tsx';
import Stats from './views/Stats.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { recordVisit, recordSnapshot, setOnboarded, firstRunIds, buildBriefing, profileName, placementLevel, streak } from './store.ts';
import { useStore } from './useStore.ts';
import { primeVoices } from './lib/ui.ts';
import { startReminderWatch } from './lib/reminder.ts';
import { parseHash, toHash } from './route.ts';
import type { Target } from './types.ts';

export type View = 'home' | 'explore' | 'grammar' | 'stats' | 'review' | 'placement' | 'interests' | 'profile';
const ALL: Target = { kind: 'all', name: 'All sectors' };
const COLLAPSE_KEY = 'lexi.sidebar.collapsed.v1';

export default function App() {
  useStore(); // keep the sidebar profile (name / level / streak) live
  const reduce = useReducedMotion();
  const boot = parseHash();
  const [view, setView] = useState<View>(boot.view);
  const [target, setTarget] = useState<Target>(boot.target ?? ALL);
  const [exploreInit, setExploreInit] = useState<'markt' | 'decks'>(boot.explore);
  const [drillInit, setDrillInit] = useState<GrammarInit>(null);
  const [guided, setGuided] = useState(false);   // first-run: placement → first session → recap
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { recordVisit(); recordSnapshot(); primeVoices(); }, []);
  // Only does anything once a study time is set and permission granted; the
  // watch itself is three localStorage reads a minute.
  useEffect(() => startReminderWatch(), []);

  // ---- URL <-> state -------------------------------------------------------
  // `fromHash` guards the loop: a hashchange we caused ourselves must not be
  // re-applied as if the user had pressed Back.
  const fromHash = useRef(false);
  useEffect(() => {
    const onHash = () => {
      fromHash.current = true;
      const r = parseHash();
      setView(r.view);
      setExploreInit(r.explore);
      if (r.target) setTarget(r.target);
      setMobileOpen(false);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const next = toHash(view, target, exploreInit);
    if (fromHash.current) { fromHash.current = false; return; }
    if (location.hash === next) return;
    // Home replaces rather than pushes, so Back from Home leaves the app once
    // instead of walking a trail of identical Home entries.
    if (view === 'home') location.replace(next);
    else location.hash = next;
  }, [view, target, exploreInit]);

  const toggleCollapse = () => setCollapsed((c) => {
    const n = !c;
    try { localStorage.setItem(COLLAPSE_KEY, n ? '1' : '0'); } catch { /* */ }
    return n;
  });

  const study = (t: Target) => { setTarget(t); setView('review'); };
  const go = (v: View) => {
    if (v === 'review') setTarget(ALL);
    if (v === 'grammar') setDrillInit(null);
    if (v === 'explore') setExploreInit('markt');
    // Leaving the guided chain by the sidebar is still leaving it. Without this
    // the first-run hero came back on the next visit, as though placement and
    // the first session had never happened.
    if (guided) setOnboarded();
    setGuided(false); setView(v); setMobileOpen(false);
  };
  /** The primary CTA — assemble and launch today's session. */
  const startSession = () => { setGuided(false); setMobileOpen(false); study({ kind: 'custom', name: 'Today’s session', ids: buildBriefing().ids }); };

  // First-run chain: hero → placement → pick topics → an auto-built 10-card session → recap.
  const startFirstRun = () => { setGuided(true); setView('placement'); };
  // Onboarded the moment the first session begins: placement and topics are
  // behind them, so the hero has done its job whether or not they finish.
  const firstRunSession = () => { setOnboarded(); setTarget({ kind: 'custom', name: 'First session', ids: firstRunIds(10) }); setView('review'); };
  const endGuided = () => { setOnboarded(); setGuided(false); setView('home'); };
  /** Blind Spots → the matching practice. Word-drill misses log a mode tag;
   *  grammar misses log the point's own title, which now opens that concept
   *  rather than dumping the learner into the whole mixed bank. */
  const drillFor = (tag?: string) => {
    const mode = Object.entries(MODE_TAG).find(([, t]) => t === tag)?.[0] as DrillMode | undefined;
    setDrillInit(mode ?? (tag ? { point: tag } : 'grammar'));
    setView('grammar');
  };

  const key = view + (view === 'review' ? `:${target.kind}:${target.name}` : '');

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      {/* Without this a keyboard user re-tabs the sidebar's seven controls on
          every single view change before reaching any content. */}
      <a href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]
          focus:bg-amber focus:text-bg focus:font-bold focus:rounded-md focus:px-4 focus:py-2.5">
        Skip to content
      </a>
      <Sidebar
        view={view} onGo={go} onStartSession={startSession}
        collapsed={collapsed} onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}
        onProfile={() => go('profile')}
        name={profileName()} level={placementLevel()} streak={streak()}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar — the sidebar is a drawer on phones. min-height adds the
            safe-area inset on top of a 52px bar so the notch never eats the logo. */}
        <header className="sm:hidden safe-top pb-2 flex items-center gap-2.5 px-3 min-h-[calc(52px_+_env(safe-area-inset-top))] bg-panel border-b border-line flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="grid place-items-center w-9 h-9 -ml-1 text-dim hover:text-amber" title="Menu" aria-label="Open menu" aria-expanded={mobileOpen}><Menu size={20} /></button>
          <LexiMark size={24} />
          <span className="font-bold text-lg tracking-wide">Lexi</span>
        </header>

        {/* The live ticker is peripheral motion — hide it during a session. */}
        {view !== 'review' && <Ticker onPick={(g) => study({ kind: 'group', name: g })} />}

        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto bg-bg min-h-0">
          <AnimatePresence mode="wait">
            {/* The route transition ignored prefers-reduced-motion, unlike the
                rest of the app. A cross-fade is still motion. */}
            <motion.div key={key}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: [0.32, 0.72, 0, 1] }}
              className="max-w-[1280px] w-full min-h-full mx-auto flex flex-col px-3 sm:px-5 py-4 safe-bottom">
              <ErrorBoundary resetKey={view}>
                {view === 'home' && <Today onStart={study} onPlacement={() => setView('placement')} onGuidedStart={startFirstRun} onBlindDrill={drillFor} onDecks={() => { setExploreInit('decks'); setView('explore'); }} onBackup={() => go('profile')} onGrammar={() => go('grammar')} />}
                {view === 'explore' && <Explore onStudy={study} initial={exploreInit} />}
                {view === 'grammar' && <Grammar initial={drillInit} />}
                {view === 'placement' && <Placement onDone={() => { if (guided) setView('interests'); else setView('home'); }} />}
                {view === 'interests' && <Interests onDone={firstRunSession} />}
                {view === 'profile' && <Profile />}
                {view === 'stats' && <Stats />}
                {view === 'review' && <Review target={target} firstRun={guided} onExit={() => { if (guided) endGuided(); else setView('home'); }} onPick={() => { setExploreInit('decks'); setView('explore'); }} onDrills={() => { setDrillInit(null); setView('grammar'); }} />}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Same rule as the Ticker: a session owns the screen. */}
        {view !== 'review' && <BottomNav view={view} onGo={go} onStartSession={startSession} />}
      </div>
    </div>
  );
}
