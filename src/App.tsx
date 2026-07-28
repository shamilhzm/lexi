// Lexi — an atlas of your German (A1–C2).
//
// Two rooms, not one app with a modal in it.
//
//   The instrument — Today, Progress, Library. Nav rail or bottom bar, the live
//   ticker, a bounded content column. Dense and scannable: the map room.
//
//   The desk — a session. Full-bleed, no navigation, no ticker, no streak
//   counter competing with the word. You go there; you don't render it inside
//   the chrome.
//
// One aesthetic cannot serve both — scanning a heatmap and studying a single
// word want opposite things. See docs/DESIGN.md.
import { useEffect, useRef, useState } from 'react';
// No `motion` import here any more: both entrances in this file are CSS
// keyframes without a fill-mode, so a stalled animation cannot hide a room.
import { Menu } from 'lucide-react';
import Ticker from './components/Ticker.tsx';
import Sidebar, { LexiMark } from './components/Sidebar.tsx';
import BottomNav from './components/BottomNav.tsx';
import Review from './views/Review.tsx';
import Today from './views/Today.tsx';
import Progress from './views/Progress.tsx';
import Grammar, { type GrammarInit } from './views/Grammar.tsx';
import { MODE_TAG, type Mode as DrillMode } from './views/Fundamentals.tsx';
import Placement from './views/Placement.tsx';
import Interests from './views/Interests.tsx';
import Profile from './views/Profile.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { recordVisit, recordSnapshot, setOnboarded, firstRunIds, buildBriefing, profileName, placementLevel, streak } from './store.ts';
import { useStore } from './useStore.ts';
import { primeVoices } from './lib/ui.ts';
import { startReminderWatch } from './lib/reminder.ts';
import { parseHash, toHash, type ProgressRoute } from './route.ts';
import type { Target } from './types.ts';

export type View = 'today' | 'progress' | 'library' | 'session' | 'placement' | 'interests' | 'profile';
const ALL: Target = { kind: 'all', name: 'All sectors' };
const COLLAPSE_KEY = 'lexi.sidebar.collapsed.v1';

export default function App() {
  useStore(); // keep the sidebar profile (name / level / streak) live
  const boot = parseHash();
  const [view, setView] = useState<View>(boot.view);
  const [target, setTarget] = useState<Target>(boot.target ?? ALL);
  const [progress, setProgress] = useState<ProgressRoute>(boot.progress);
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
      setProgress(r.progress);
      if (r.target) setTarget(r.target);
      setMobileOpen(false);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const next = toHash(view, target, progress);
    if (fromHash.current) { fromHash.current = false; return; }
    if (location.hash === next) return;
    // Today replaces rather than pushes, so Back from Today leaves the app once
    // instead of walking a trail of identical entries.
    if (view === 'today') location.replace(next);
    else location.hash = next;
  }, [view, target, progress]);

  const toggleCollapse = () => setCollapsed((c) => {
    const n = !c;
    try { localStorage.setItem(COLLAPSE_KEY, n ? '1' : '0'); } catch { /* */ }
    return n;
  });

  const study = (t: Target) => { setTarget(t); setView('session'); };
  const go = (v: View) => {
    if (v === 'session') setTarget(ALL);
    if (v === 'library') setDrillInit(null);
    if (v === 'progress') setProgress({ level: 'overview' });
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
  const firstRunSession = () => { setOnboarded(); setTarget({ kind: 'custom', name: 'First session', ids: firstRunIds(10) }); setView('session'); };
  const endGuided = () => { setOnboarded(); setGuided(false); setView('today'); };
  /** Blind Spots → the matching practice. Word-drill misses log a mode tag;
   *  grammar misses log the point's own title, which now opens that concept
   *  rather than dumping the learner into the whole mixed bank. */
  const drillFor = (tag?: string) => {
    const mode = Object.entries(MODE_TAG).find(([, t]) => t === tag)?.[0] as DrillMode | undefined;
    setDrillInit(mode ?? (tag ? { point: tag } : 'grammar'));
    setView('library');
  };
  const exitSession = () => { if (guided) endGuided(); else setView('today'); };

  // ---- the desk -------------------------------------------------------------
  // Deliberately an early return. A session is not a view inside the shell; it
  // is the other room, and nothing from the instrument follows you into it.
  if (view === 'session') {
    return (
      <div className="h-[100dvh] w-full overflow-y-auto bg-bg">
        {/* Same fill-mode-free rule as the route entrance: entering the desk is
            a bigger move than changing rooms in the instrument, so it gets its
            own slightly longer curve — but it can no more strand the session at
            opacity 0 than a route can. */}
        <main
          id="main" tabIndex={-1}
          className="desk-in min-h-[100dvh] w-full flex flex-col px-3 sm:px-5 py-4 safe-top safe-bottom">
          <ErrorBoundary resetKey={`session:${target.kind}:${target.name}`}>
            <Review
              target={target} firstRun={guided}
              onExit={exitSession}
              onPick={() => { setProgress({ level: 'decks' }); setView('progress'); }}
              onDrills={() => { setDrillInit(null); setView('library'); }}
            />
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  // ---- the instrument -------------------------------------------------------
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      {/* Without this a keyboard user re-tabs the sidebar's controls on every
          single view change before reaching any content. */}
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
          <button onClick={() => setMobileOpen(true)} className="grid place-items-center w-11 h-11 -ml-2.5 text-dim hover:text-amber" title="Menu" aria-label="Open menu" aria-expanded={mobileOpen}><Menu size={20} /></button>
          <LexiMark size={24} />
          <span className="font-bold text-lg tracking-wide">Lexi</span>
        </header>

        <Ticker onPick={(g) => study({ kind: 'group', name: g })} />

        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto bg-bg min-h-0">
          {/* The route entrance is CSS, not Framer, and deliberately so.
              It used to be `initial={{ opacity: 0 }}` inside an AnimatePresence,
              which strands the whole destination at opacity 0 whenever the
              animation does not run — a hash change landing while the tab is
              backgrounded throttles rAF, and it was caught doing exactly that
              with 1,769px of Progress laid out and invisible.
              `.route-in` has no fill-mode, so the resting state is the correct
              one and a stalled, disabled or never-started animation simply shows
              the page. This is the same rule `.bar-grow` and `.node-in` already
              follow; it had never been applied to the layer every navigation
              passes through. See docs/DESIGN.md §7. */}
          <div key={view}
            className="route-in max-w-[1280px] w-full min-h-full mx-auto flex flex-col px-3 sm:px-5 py-4 safe-bottom">
              <ErrorBoundary resetKey={view}>
                {view === 'today' && <Today onStart={study} onPlacement={() => setView('placement')} onGuidedStart={startFirstRun} onBlindDrill={drillFor} onDecks={() => { setProgress({ level: 'decks' }); setView('progress'); }} onBackup={() => go('profile')} onGrammar={() => go('library')} onProgress={() => go('progress')} />}
                {view === 'progress' && <Progress route={progress} onNavigate={setProgress} onStudy={study} onBlindDrill={drillFor} />}
                {view === 'library' && <Grammar initial={drillInit} />}
                {view === 'placement' && <Placement onDone={() => { if (guided) setView('interests'); else setView('today'); }} />}
                {view === 'interests' && <Interests onDone={firstRunSession} />}
                {view === 'profile' && <Profile />}
              </ErrorBoundary>
          </div>
        </main>

        <BottomNav view={view} onGo={go} onStartSession={startSession} />
      </div>
    </div>
  );
}
