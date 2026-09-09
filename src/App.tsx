// Lexi — a vocabulary trainer for English speakers learning German.
//
// ## There is no home screen. Opening the app is a German word.
//
// *Changed 2026-09-05.* Lexi had a daily briefing called **Heute** — a greeting,
// a streak, a placement nudge, a level strip, a goal line, a backlog burn-down,
// three short-session budgets and a Start button. Every one of those was true,
// and together they were a page whose entire job was **to get you to a card**.
// A page whose job is to get you somewhere is a page you delete by going there.
//
// What it went to is not the card, though. It is a **feed** (`views/Feed.tsx`):
// one word per screen, scrolled, with the meaning present rather than hidden.
// The flip card demanded a verdict from someone who had not yet decided to
// study; a feed asks nothing, and meeting a hundred German words on a bus is the
// thing a person will actually do on the days they will not sit a session.
//
// The briefing's contents went where they were answers: the numbers to
// Fortschritt, the nudges to the end-of-session recap.
//
// ## The four doors
//
//   Wörter       the feed. The default, and where the app opens.
//   Themen       what words are there / what does this one mean?
//   Üben         test me — the FSRS session and its four word-fact drills.
//   Fortschritt  how far have I come, and what do I keep missing?
//
// **Wörter and Üben are two halves of one loop**, and deliberately not one tab:
// browsing asks nothing and testing asks everything, and a single door onto both
// would have to guess which mood you are in. Bookmarking a word in the feed is
// what connects them — it is the learner telling the scheduler what to teach
// next, and `buildBriefing` serves saved words first.
//
// The session used to be a separate full-bleed room with no navigation ("the
// desk"). That argument was right about *density* and wrong about *navigation*:
// a room you can be dropped into cannot be a room you have to know how to leave.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
// No `motion` import here: the route entrance is a CSS keyframe without a
// fill-mode, so a stalled animation cannot hide a room.
import TopBar from './components/TopBar.tsx';
import BottomNav from './components/BottomNav.tsx';
import SavedWords from './components/SavedWords.tsx';
import { AnimatePresence } from 'motion/react';
import Review from './views/Review.tsx';
import Feed from './views/Feed.tsx';
import Words from './views/Words.tsx';
import Progress from './views/Progress.tsx';
import Placement from './views/Placement.tsx';
import Interests from './views/Interests.tsx';
import Profile from './views/Profile.tsx';
// Its own page as of 2026-09-05. It used to render inline inside Profile, which
// put 14 headings and 3.7 screens behind one tab.
const Settings = lazy(() => import('./views/Settings.tsx'));
import { Drill, type Mode } from './views/drills.tsx';
import SearchSheet from './components/SearchSheet.tsx';
// The text scanner. Opened deliberately and rarely, and it pulls the whole
// matcher — no business on the boot path.
const TextGaps = lazy(() => import('./views/TextGaps.tsx'));
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { recordVisit, recordSnapshot, setOnboarded, firstRunIds, buildBriefing, profileName, placementLevel, streak } from './store.ts';
import { useStore } from './useStore.ts';
import { primeVoices } from './lib/ui.ts';
import { loadAudioManifest } from './lib/audio.ts';
import { startReminderWatch } from './lib/reminder.ts';
import { parseHash, toHash, type WordsRoute } from './route.ts';
import SagEs from './components/SagEs.tsx';
import type { Target } from './types.ts';

export type View = 'feed' | 'session' | 'words' | 'progress' | 'placement' | 'interests' | 'profile' | 'settings' | 'text';
const ALL: Target = { kind: 'all', name: 'All sectors' };
/** The day's queue, rebuilt from the scheduler each time it is asked for. */
const TODAY = (): Target => ({ kind: 'custom', name: 'Today’s session', ids: buildBriefing().ids });

export default function App() {
  useStore(); // keep the top bar's profile (name / level / streak) live
  const boot = parseHash();
  const [view, setView] = useState<View>(boot.view);
  const [target, setTarget] = useState<Target>(() => boot.target ?? TODAY());
  const [words, setWords] = useState<WordsRoute>(boot.words);
  // A standalone run of one word-fact drill, opened by name from Blind spots.
  // Local state rather than a route: it is a scoped exercise set, which is not a
  // linkable thing, and it is always entered from the surface that motivated it.
  const [drill, setDrill] = useState<Mode | null>(null);
  // `Sag es`, the pronunciation game. Local state for the same reason `drill` is:
  // it is a scoped run rather than a linkable place, and it is always entered from
  // the surface that offered it. It is *not* a route on purpose — a link that opens
  // the microphone is a link that should not exist.
  //
  // `?game=1` in dev opens it directly. The game cannot be reached without finishing
  // a session, which makes it the most expensive thing in the app to get to on a
  // phone — and driving it on a phone is the only way to test it, because the
  // browser pane runs hidden and `requestAnimationFrame` is suspended there, so the
  // track never moves. `import.meta.env.DEV` folds to `false` at build time and the
  // whole expression goes with it; `greppable.test.ts` guards that.
  const [game, setGame] = useState(() =>
    import.meta.env.DEV && new URLSearchParams(location.search).has('game'));
  // Bumped by every `go()`. It is part of the route container's key, so tapping
  // the tab you are already on remounts that destination — which is how a tab bar
  // is expected to behave, and on *Lernen* it is also how you rebuild the day's
  // queue after finishing one.
  const [navTick, setNavTick] = useState(0);
  const [guided, setGuided] = useState(false);   // first run: hero → session → recap → placement
  // Not a route. "What does this word mean?" is asked from wherever you already
  // are, and closing the answer has to put you back there — mid-scroll in the
  // feed, mid-card in a session. See components/SearchSheet.
  const [searching, setSearching] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => { recordVisit(); recordSnapshot(); primeVoices(); }, []);

  // ---- the bars materialise -------------------------------------------------
  // `data-scrolled` on <html>, read by `.glass-bar` in index.css.
  //
  // Glass over a *flat* ground is not glass: `backdrop-filter` on an unmoving
  // colour returns that same colour, which is why the material was not landing on
  // the warm paper theme — the bars were opaque panels wearing a blur with nothing
  // to blur. So they now do what every iOS bar does: nearly invisible at the top of
  // the content, and materialising as it slides underneath. The material stops
  // being decoration and starts meaning "there is more above this".
  //
  // Capture phase, on `window`: `scroll` does not bubble, and the app has two
  // scrollers — the route column and the feed's own snap container — neither of
  // which the bars own. Capturing catches both without either having to know the
  // bars exist.
  //
  // The 8px threshold is hysteresis, not a magic number: snap scrolling settles
  // with sub-pixel residue and a 0 test flickers the bars at rest.
  useEffect(() => {
    const root = document.documentElement;
    const apply = (top: number) => {
      const next = top > 8 ? 'true' : 'false';
      if (root.dataset.scrolled !== next) root.dataset.scrolled = next;
    };
    const onScroll = (e: Event) => {
      const t = e.target;
      apply(t === document || t === window ? window.scrollY : (t as HTMLElement).scrollTop ?? 0);
    };
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    apply(0);
    return () => window.removeEventListener('scroll', onScroll, { capture: true });
  }, []);
  // A route change puts a fresh scroller at the top; without this the bars stay
  // materialised from wherever the last one was left.
  useEffect(() => { document.documentElement.dataset.scrolled = 'false'; }, [view, navTick]);

  // ---- how big is the type, really -------------------------------------------
  // `index.css` sets `html { font: -apple-system-body }`, so on Apple platforms the
  // root font size *is* the learner's Dynamic Type setting — and `applyTextScale`
  // writes an explicit size on the same element for the in-app control. One reading
  // covers both, which is the whole reason to measure rather than to sniff.
  //
  // Published as `data-type` because CSS cannot ask this question: `@media` width
  // queries in `em` resolve against the *initial* 16px, not the root, and there is no
  // media feature for text size at all.
  //
  // Measured at 402×714, sweeping the root from 16px to 40px: the chrome and the
  // spacing scale with it (the top bar goes 56 → 137px, the feed's action row 196 →
  // 490px against a 402px viewport) while the viewport does not. Everything holds to
  // ~28px and comes apart between 28 and 34 — the headword slides under the header at
  // 34 and off the screen at 40. So `lg` is where it gets tight and `ax` is where
  // chrome has to stop pretending it can scale.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const px = parseFloat(getComputedStyle(root).fontSize) || 16;
      const next = px >= 30 ? 'ax' : px >= 22 ? 'lg' : 'base';
      if (root.dataset.type !== next) root.dataset.type = next;
    };
    sync();
    // iOS fires `resize` when you come back from Settings with a new size; `pageshow`
    // covers a restore from the back/forward cache, where nothing else fires at all.
    window.addEventListener('resize', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, []);

  // The human-audio manifest is a small id list; loading it at boot lets cards
  // decide synchronously whether to show the "real voice" marker. A missing file
  // resolves to an empty manifest, so this can never block or fail the app.
  useEffect(() => { loadAudioManifest(); }, []);
  // Examples and definitions used to be fetched here, all 857 KB gzipped of them,
  // on every first visit. They are six files now — one per CEFR level — and the
  // surfaces that need them ask for the ones they are about to show: the feed for
  // the page it is rendering, Üben for the levels its queue can draw from, the word
  // sheet for the word it opens. An A1 learner's first visit fetches 172 KB instead
  // of 857, and never sees the other five levels until they reach them.
  //
  // Nothing is kicked off here on purpose. A blanket prefetch from the shell would
  // put all six back on the wire and quietly undo the split.
  // Only does anything once a study time is set and permission granted; the
  // watch itself is three localStorage reads a minute.
  useEffect(() => startReminderWatch(), []);

  // ---- URL <-> state -------------------------------------------------------
  // `fromHash` guards the loop: a hashchange we caused ourselves must not be
  // re-applied as if the user had pressed Back.
  const fromHash = useRef(false);
  // …and `selfWrote` guards the *other* direction, which was missing and cost
  // three features.
  //
  // A `custom` target — an explicit id list — is deliberately not encoded in the
  // hash (see route.ts: a stale id list restored tomorrow would be a lie). So
  // `toHash` renders every custom session as the bare `#/session`. The write
  // effect below then assigned it, the browser fired `hashchange`, and the reader
  // above parsed `#/session`, found no target, and replaced the list the caller
  // had just built with `TODAY()`.
  //
  // Every custom session was destroyed by its own URL, one tick after it started:
  //   · "Learn ten words now"  →  First session, 10 ids  →  Today's session, 20
  //   · "Practise these 3"     →  the three saved words  →  Today's session, 20
  //   · a text's unlock list   →  the words in the text  →  Today's session, 20
  // Scoped sessions were unaffected and hid it, because `sector` and `group`
  // *are* encodable and survive the round trip.
  const selfWrote = useRef(false);
  useEffect(() => {
    const onHash = () => {
      // Our own write, echoing back. The state is already correct — re-deriving
      // it from a hash that cannot carry an id list is how the list got lost.
      if (selfWrote.current) { selfWrote.current = false; return; }
      fromHash.current = true;
      const r = parseHash();
      setView(r.view);
      setWords(r.words);
      setTarget(r.target ?? (r.view === 'session' ? TODAY() : ALL));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const next = toHash(view, target, words);
    if (fromHash.current) { fromHash.current = false; return; }
    if (location.hash === next) return;
    selfWrote.current = true;
    // The session is the root, so it replaces rather than pushes: Back from the
    // card leaves the app once instead of walking a trail of identical entries.
    if (view === 'session') location.replace(next);
    else location.hash = next;
  }, [view, target, words]);

  /** Study a specific scope — a deck, a sector, a list of ids from a text. */
  const study = (t: Target) => { setGuided(false); setDrill(null); setTarget(t); setView('session'); setNavTick((n) => n + 1); };
  /** The feed is a fixed, full-bleed surface: it owns the viewport and paints its
   *  own floating chrome, so the shell's bounded content column would only get in
   *  its way. Everything else renders inside the column. */
  const bare = view === 'feed';
  const go = (v: View) => {
    // *Lernen* always means the day's queue, never whatever deck you were last
    // inside. A destination in a tab bar is a place, not a resume.
    if (v === 'session') setTarget(TODAY());
    if (v === 'words') setWords({ level: 'index' });
    // Leaving the guided chain by the navigation is still leaving it. Without
    // this the first-run hero came back on the next visit, as though placement
    // and the first session had never happened.
    if (guided) setOnboarded();
    setDrill(null);
    // **Every overlay, not just the drill.** A layer renders at `z-40` under the bars
    // at `z-50` precisely so the chrome stays reachable — which means a tab is
    // tappable *through* an open sheet, and `go()` cleared only one of the three
    // things that can be open. Tapping *Themen* over the saved-words sheet moved the
    // selected tab, left the sheet on top of the new surface, and left its back
    // button pointing at a word the learner was no longer on.
    setShowSaved(false); setSearching(false);
    setGuided(false); setView(v); setNavTick((t) => t + 1);
  };

  // First run: a hero, then an auto-built ten-card session, then the recap,
  // which offers placement and topics.
  //
  // The hero is the one screen that stands between a cold visitor and a card,
  // and it earns that: somebody arriving from a shared link has been told
  // nothing about what this is, and a flashcard with no frame around it is not
  // self-explanatory. It renders *inside* the session view (see Review), so it
  // is the same room rather than a stop on the way to one.
  const startFirstRun = () => {
    setOnboarded();
    setGuided(true);
    setTarget({ kind: 'custom', name: 'First session', ids: firstRunIds(10) });
    // **`setView` was missing here, and only here.** `study()` sets it, `go()`
    // sets it; this one prepared the target, flipped `onboarded` — which is what
    // hides the hero — and left the learner on the feed. So the app's primary
    // onboarding call to action, *Learn ten words now*, did exactly one thing:
    // it deleted the onboarding. There is no ten, no session, no way back to the
    // hero, and the only remaining route to a first session is guessing that the
    // graduation cap in the tab bar is it.
    //
    // Found by tapping it on a freshly erased simulator against the deployed
    // build. It is invisible from inside the code because every neighbour is
    // correct, and invisible in a warm profile because the hero never renders.
    setView('session');
    setNavTick((n) => n + 1);
  };
  const endGuided = () => { setOnboarded(); setGuided(false); go('session'); };

  return (
    // `relative`, and the bars are `absolute` children of it. That is what makes
    // the glass real: the material has to have the page behind it to refract, and
    // a bar that is a flex *sibling* of the content has nothing behind it but the
    // window. See TopBar and BottomNav.
    <div className="relative flex flex-col h-[100dvh] w-full overflow-hidden">
      {/* Without this a keyboard user re-tabs the navigation's controls on every
          single view change before reaching any content. */}
      <a href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]
          focus:bg-accent focus:text-bg focus:font-bold focus:rounded-md focus:px-4 focus:py-2.5">
        Skip to content
      </a>

      <TopBar
        view={view} onGo={go}
        onSearch={() => setSearching(true)}
        onSaved={() => setShowSaved(true)}
        onProfile={() => go('profile')}
        name={profileName()} level={placementLevel()} streak={streak()}
      />

      {/* The content area is the *whole* viewport now, and the bars float over
          it. Everything that scrolls therefore pays for them itself, in padding
          rather than in layout — which is the difference between content that
          passes under glass and content that stops at a wall.

          `--bar-t` / `--bar-b` are the two numbers that keep the bars, the scroll
          padding and the feed's slot height agreeing with each other — so the
          `- 14px` here is not a tweak, it is the same subtraction BottomNav
          makes to seat the capsule, and the two have to stay equal or content
          scrolls to a stop in the wrong place. */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0"
        style={{
          // Both are px, and both are px *because the bars stopped growing*. They
          // used to grow: Tailwind's spacing scale is rem, so an accessibility text
          // size inflated the bars' own padding and the 44pt boxes around their
          // 15px icons, and the header went 56 → 137px while this constant did not.
          // The first fix followed that curve (`3.5rem`); the real one pinned the
          // touch targets in px, which took the header flat to 56px from a 16px root
          // to a 53px one. See `index.css`, where both numbers are declared — these
          // are the inline defaults the stylesheet overrides, and the two have to
          // stay together. The `- 14px` is the same subtraction BottomNav makes to
          // seat the capsule; if they disagree, content scrolls to a stop in the
          // wrong place.
          ['--bar-t' as string]: 'calc(56px + env(safe-area-inset-top))',
          ['--bar-b' as string]: 'calc(58px + max(8px, env(safe-area-inset-bottom) - 14px) + 8px)',
        }}>
        <main id="main" tabIndex={-1}
          className={`flex-1 bg-bg min-h-0 ${bare ? 'overflow-hidden' : 'overflow-y-auto'}`}
          style={bare ? undefined : {
            paddingTop: 'var(--bar-t)',
            // Only below `md`: the tab bar is in the top bar from there up.
            scrollPaddingTop: 'var(--bar-t)',
          }}>
          {/* The route entrance is CSS, not Framer, and deliberately so.
              It used to be `initial={{ opacity: 0 }}` inside an AnimatePresence,
              which strands the whole destination at opacity 0 whenever the
              animation does not run — a hash change landing while the tab is
              backgrounded throttles rAF, and it was caught doing exactly that
              with 1,769px of Progress laid out and invisible.
              `.route-in` has no fill-mode, so the resting state is the correct
              one and a stalled, disabled or never-started animation simply shows
              the page. See docs/DESIGN.md §7. */}
          <div key={`${view}:${navTick}:${drill ?? ''}`}
            className={bare
              ? 'w-full h-full min-h-0'
              // `min-h-full` on the session only: the card stage inside it is
              // `flex-1 min-h-0` and cannot distribute space unless this column has a
              // height to distribute. Scoped rather than global because every other
              // route is a document that should size to its content — and on a short
              // viewport this still overflows once the card hits its 260px floor,
              // which is the right order to give up in.
              : `route-in max-w-[1280px] w-full mx-auto flex flex-col px-3 sm:px-5 py-4 pb-[var(--bar-b)] md:pb-6${
                  view === 'session' ? ' min-h-full' : ''}`}>
              <ErrorBoundary resetKey={`${view}:${drill ?? ''}:${game ? 'game' : ''}`}>
                {game
                  ? <SagEs onExit={() => setGame(false)} />
                  : drill
                  ? <Drill mode={drill} onExit={() => setDrill(null)} />
                  : <>
                    {view === 'feed' && <Feed onStartFirstRun={startFirstRun} />}
                    {view === 'session' && (
                      <Review
                        target={target} firstRun={guided}
                        onDone={endGuided}
                        // Recap → placement, written with `replace` so the finished
                        // session is not a Back target. Pressing Back off the
                        // placement test would otherwise land on a bare `#/session`,
                        // which rebuilds the queue and drops the learner at card 1 of
                        // a session they just finished.
                        onPlacement={() => { location.replace('#/placement'); setView('placement'); }}
                        onPick={() => go('words')}
                        onGame={() => setGame(true)}
                        onProfile={() => go('profile')}
                      />
                    )}
                    {view === 'words' && <Words route={words} onNavigate={setWords} onStudy={study} onText={() => go('text')} />}
                    {/* The heatmap is a map *of the corpus*, so its drill-down lands in
                        the corpus rather than one level further into a stats page. An
                        empty group name means "the index" — the browse-everything row
                        at the foot of Progress. */}
                    {view === 'progress' && (
                      <Progress onStudy={study} onDrill={setDrill} onPlacement={() => go('placement')}
                        onOpenGroup={(g) => { setWords(g ? { level: 'group', group: g } : { level: 'index' }); setView('words'); }} />
                    )}
                    {view === 'text' && (
                      <Suspense fallback={<div className="grid place-items-center min-h-[240px] text-dim">Loading…</div>}>
                        <TextGaps onStudy={study} onExit={() => go('words')} />
                      </Suspense>
                    )}
                    {view === 'placement' && <Placement onDone={() => { if (guided) setView('interests'); else go('session'); }} />}
                    {view === 'interests' && <Interests onDone={endGuided} />}
                    {view === 'profile' && <Profile onSettings={() => go('settings')} />}
                    {view === 'settings' && (
                      <Suspense fallback={<div className="grid place-items-center min-h-[240px] text-dim">Loading…</div>}>
                        <Settings onExit={() => go('profile')} />
                      </Suspense>
                    )}
                  </>}
              </ErrorBoundary>
          </div>
        </main>

        {/* Where `components/Layer` mounts: inside the shell, so a word's entry
            or its drill slides in *under* the bars instead of covering them.
            Inert itself — `pointer-events-none` — so nothing here can swallow a
            tap meant for the tab bar when no layer is open. */}
        <div id="layer-root" className="absolute inset-0 z-40 pointer-events-none" />
        <BottomNav view={view} onGo={go} />
      </div>

      {searching && <SearchSheet onClose={() => setSearching(false)} />}
      <AnimatePresence>
        {showSaved && <SavedWords key="saved" onClose={() => setShowSaved(false)} onStudy={study} />}
      </AnimatePresence>
    </div>
  );
}
