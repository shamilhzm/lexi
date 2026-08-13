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
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
// No `motion` import here any more: both entrances in this file are CSS
// keyframes without a fill-mode, so a stalled animation cannot hide a room.
import Ticker from './components/Ticker.tsx';
import TopBar from './components/TopBar.tsx';
import BottomNav from './components/BottomNav.tsx';
import Review from './views/Review.tsx';
import Today from './views/Today.tsx';
import Progress from './views/Progress.tsx';
import Grammar, { type GrammarInit } from './views/Grammar.tsx';
import Games from './views/Games.tsx';
import { MODE_TAG, type Mode as DrillMode } from './views/Fundamentals.tsx';
import Placement from './views/Placement.tsx';
import Interests from './views/Interests.tsx';
import Profile from './views/Profile.tsx';
import BrainRoom from './views/BrainRoom.tsx';
// The exam room is five surfaces nobody on the boot path renders — the answer
// sheet, the cloze, the listening controls, the speaking lab, the result — and
// most sessions never open it. Split for the same reason `three` is: the paper
// itself is already a second dynamic import behind this one, so opening `#/exam`
// costs two fetches and opening anything else costs none.
const Exam = lazy(() => import('./views/Exam.tsx'));
// Paper. Lazy like Exam: a worksheet is opened deliberately and rarely, and the
// A4 rendering has no business on the boot path.
const Print = lazy(() => import('./views/Print.tsx'));
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { recordVisit, recordSnapshot, setOnboarded, firstRunIds, buildBriefing, profileName, placementLevel, streak } from './store.ts';
import { useStore } from './useStore.ts';
import { primeVoices } from './lib/ui.ts';
import { loadAudioManifest } from './lib/audio.ts';
import { loadDetail } from './data/detail.ts';
import { startReminderWatch } from './lib/reminder.ts';
import { parseHash, toHash, type ProgressRoute } from './route.ts';
import type { Target } from './types.ts';

export type View = 'today' | 'progress' | 'library' | 'games' | 'session' | 'placement' | 'interests' | 'profile' | 'brain' | 'exam' | 'print';
const ALL: Target = { kind: 'all', name: 'All sectors' };

export default function App() {
  useStore(); // keep the sidebar profile (name / level / streak) live
  const boot = parseHash();
  const [view, setView] = useState<View>(boot.view);
  const [target, setTarget] = useState<Target>(boot.target ?? ALL);
  const [progress, setProgress] = useState<ProgressRoute>(boot.progress);
  const [drillInit, setDrillInit] = useState<GrammarInit>(null);
  const [guided, setGuided] = useState(false);   // first-run: placement → first session → recap
  const [exam, setExam] = useState(false);      // a sitting under exam conditions

  useEffect(() => { recordVisit(); recordSnapshot(); primeVoices(); }, []);
  // The human-audio manifest is a small id list; loading it at boot lets cards
  // decide synchronously whether to show the "real voice" marker. A missing file
  // resolves to an empty manifest, so this can never block or fail the app.
  useEffect(() => { loadAudioManifest(); }, []);
  // Examples and definitions — 70% of the corpus, and nothing on the boot path
  // reads them, so first paint does not wait. Same slot and same reasoning as the
  // grammar bank's post-paint load in PathCard. Never rejects; a session that
  // starts before this lands waits on it explicitly (see Review).
  useEffect(() => { loadDetail(); }, []);
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

  const study = (t: Target) => { setExam(false); setTarget(t); setView('session'); };
  const go = (v: View) => {
    if (v === 'session') setTarget(ALL);
    if (v === 'library') setDrillInit(null);
    if (v === 'progress') setProgress({ level: 'overview' });
    // Leaving the guided chain by the navigation is still leaving it. Without
    // this the first-run hero came back on the next visit, as though placement
    // and the first session had never happened.
    if (guided) setOnboarded();
    setGuided(false); setView(v);
  };
  /** The primary CTA — assemble and launch today's session. */
  const startSession = () => { setGuided(false); study({ kind: 'custom', name: 'Today’s session', ids: buildBriefing().ids }); };
  /** The same day's material with the scaffolding removed. */
  const startExam = () => {
    setGuided(false);
    setTarget({ kind: 'custom', name: 'Exam conditions', ids: buildBriefing().ids });
    setExam(true); setView('session');
  };

  // First-run chain: hero → an auto-built 10-card session → recap → placement →
  // pick topics.
  //
  // The session used to come *third*, behind a two-minute placement test and a
  // topic picker, which is a long time to ask of someone who has not yet seen the
  // thing work. Nothing was gained by the order: `firstRunIds()` sorts by CEFR band
  // then frequency and the level filter defaults to all six, so a beginner gets the
  // commonest A1 words with or without a placement. Placement is not skipped, it is
  // offered from the recap — once the learner has something to calibrate.
  //
  // Onboarded the moment the first session begins: the hero has done its job
  // whether or not they finish, and `Today`'s placement nudge covers anyone who
  // never takes the test.
  const startFirstRun = () => {
    setOnboarded();
    setGuided(true);
    setTarget({ kind: 'custom', name: 'First session', ids: firstRunIds(10) });
    setView('session');
  };
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

  // ---- the observatory ------------------------------------------------------
  // A second early return, for the same reason as the desk below: the brain is
  // its own room, unconditionally dark, and the instrument's chrome has no
  // business in it. Not in NAV — DESIGN.md §8a keeps three destinations.
  if (view === 'brain') {
    return (
      <ErrorBoundary resetKey="brain">
        <BrainRoom onExit={() => go('today')} onStudy={study} />
      </ErrorBoundary>
    );
  }

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
              target={target} firstRun={guided} exam={exam}
              onExit={exitSession}
              // Recap -> placement, written with `replace` so the finished session
              // is not a Back target. Pressing Back off the placement test would
              // otherwise land on a bare `#/session`, which rebuilds the queue from
              // scratch and drops the learner at card 1 of a session they just
              // finished — on the most fragile learner in the app.
              onPlacement={() => { location.replace('#/placement'); setView('placement'); }}
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
    // Column, not row: the navigation is a bar across the top rather than a rail
    // down the left. See TopBar for why the rail went.
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden">
      {/* Without this a keyboard user re-tabs the navigation's controls on every
          single view change before reaching any content. */}
      <a href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]
          focus:bg-amber focus:text-bg focus:font-bold focus:rounded-md focus:px-4 focus:py-2.5">
        Skip to content
      </a>

      <TopBar
        view={view} onGo={go} onStartSession={startSession}
        onProfile={() => go('profile')}
        name={profileName()} level={placementLevel()} streak={streak()}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Ticker onPick={(g) => study({ kind: 'group', name: g })} />

        <main id="main" tabIndex={-1}
          // `pb-20` on phones only: the bottom nav carries a 56px floating
          // "start session" button 12px above it, and without a gutter the last
          // row of content is permanently pinned underneath it — on Progress
          // that meant a treemap tile whose label could not be read and whose
          // tap went to the button instead (finding #31). The float still
          // overlaps mid-scroll, which is what a floating action button is; the
          // gutter is what makes every tile reachable by scrolling.
          className="flex-1 overflow-y-auto bg-bg min-h-0 pb-20 sm:pb-0">
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
                {view === 'today' && <Today onStart={study} onExam={startExam} onPlacement={() => setView('placement')} onGuidedStart={startFirstRun} onBlindDrill={drillFor} onDecks={() => { setProgress({ level: 'decks' }); setView('progress'); }} onBackup={() => go('profile')} onGrammar={() => go('library')} onProgress={() => go('progress')} onBrain={() => go('brain')} />}
                {view === 'progress' && <Progress route={progress} onNavigate={setProgress} onStudy={study} onBlindDrill={drillFor} />}
                {view === 'library' && <Grammar initial={drillInit} onExam={() => go('exam')} onPrint={() => go('print')} />}
                {view === 'games' && <Games />}
                {view === 'exam' && (
                  <Suspense fallback={<div className="grid place-items-center min-h-[240px] text-dim">Loading…</div>}>
                    <Exam onExit={() => go('library')} onGrammar={() => go('library')} onSession={startSession} />
                  </Suspense>
                )}
                {view === 'print' && (
                  <Suspense fallback={<div className="grid place-items-center min-h-[240px] text-dim">Loading…</div>}>
                    <Print onExit={() => go('library')} />
                  </Suspense>
                )}
                {view === 'placement' && <Placement onDone={() => { if (guided) setView('interests'); else setView('today'); }} />}
                {view === 'interests' && <Interests onDone={endGuided} />}
                {view === 'profile' && <Profile />}
              </ErrorBoundary>
          </div>
        </main>

        <BottomNav view={view} onGo={go} onStartSession={startSession} />
      </div>
    </div>
  );
}
