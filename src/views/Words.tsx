// Wortschatz — the lexicon, browsable.
//
// ## Why this is a destination
//
// Lexi has carried 6,622 cards across 274 sectors since it shipped, and until
// today there was **no way to look one up**. `Grammar.tsx` had a search box over
// 140 grammar points; the vocabulary — the thing the app actually is — had none.
// The only route into it was `#/progress/decks/<group>`, which is to say: to find
// out what *Essen* teaches, you went to the page that measures you.
//
// That was an IA fault with a simple tell. Every competitor's browse tab opens
// with a search field, because "what does this word mean" and "show me the food
// words" are the two questions a learner asks that are not "test me". Neither had
// an answer here.
//
// ## Three depths, all real routes
//
//   #/words              the index — search, then the nine theme groups
//   #/words/g/<group>    that group's decks
//   #/words/map/<sector> the sector's word map
//
// Depth is routing rather than useState, so Back works and a deck is a linkable
// thing — the same rule Progress won when it absorbed Explore's hand-rolled
// back-stack. Decks and Wortkarte are unchanged; they moved house, they were not
// rewritten.
import { useMemo } from 'react';
import { ArrowLeft, ChevronRight, FileText, Mic } from 'lucide-react';
import { WORDS, GROUPS, GROUP_SECTORS, WORDS_BY_SECTOR } from '../data/index.ts';
import { groupStats, levels } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt, heatText } from '../lib/ui.ts';
import { conceptForSector, conceptPaths } from '../lib/illustration.tsx';
import Decks from './Decks.tsx';
import Wortkarte from './Wortkarte.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import Tour, { type TourStep } from '../components/Tour.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import type { WordsRoute } from '../route.ts';
import type { Target } from '../types.ts';

export default function Words({ route, onNavigate, onStudy, onText, onGame }: {
  route: WordsRoute;
  onNavigate: (next: WordsRoute) => void;
  onStudy: (t: Target) => void;
  /** The other way to choose words: paste a text, study what’s in the way. */
  onText: () => void;
  /** Open `Sag es`, the pronunciation game. Absent while speaking is out of
   *  focus (lib/focus.ts). */
  onGame?: () => void;
}) {
  useStore();

  // ---- depth: a group's decks, or one sector's word map ---------------------
  if (route.level === 'group' || route.level === 'map') {
    const title = route.level === 'group' ? (route.group ?? 'All decks') : (route.sector ?? 'Word map');
    return (
      <div className="w-full max-w-[1100px] mx-auto">
        <div className="flex items-center gap-1.5 mb-3">
          <IconButton label="Back to Themen" pull
            onClick={() => onNavigate(route.level === 'map' && route.group
              ? { level: 'group', group: route.group }
              : { level: 'index' })}>
            <ArrowLeft size={18} />
          </IconButton>
          <nav aria-label="Breadcrumb" className="flex items-baseline gap-1.5 min-w-0 ml-1.5">
            <Kicker className="flex-shrink-0">{route.level === 'map' ? 'Decks /' : 'Themen /'}</Kicker>
            <span className="text-base font-semibold truncate">{title}</span>
          </nav>
        </div>

        {route.level === 'group' && (
          <Decks initialGroup={route.group ?? null} onStudy={onStudy}
            onMap={(sector) => onNavigate({ level: 'map', group: route.group, sector })} />
        )}
        {route.level === 'map' && (
          <Wortkarte initialSector={route.sector ?? null} onStudy={onStudy} />
        )}
      </div>
    );
  }

  return <Index onOpenGroup={(g) => onNavigate({ level: 'group', group: g })} onText={onText} onGame={onGame} />;
}

/** The index. Search first, because that is what the surface is for; the
 *  taxonomy underneath is for the learner who does not yet have a word in mind. */
function Index({ onOpenGroup, onText, onGame }: {
  onOpenGroup: (g: string) => void; onText: () => void; onGame?: () => void;
}) {
  // `useStore()` at the top of `Words` re-renders this on a filter change, and
  // the filter is a Set the store mutates by replacement — so key the memo on a
  // stable string of it rather than on the Set identity.
  const lvKey = [...levels()].sort().join('');
  const inScope = useMemo(() => WORDS.filter((w) => levels().has(w.level)).length, [lvKey]);

  return (
    <div className="w-full max-w-[1000px] mx-auto">
      {/* The tab says *Themen* and this said *Wortschatz*, which is the exact
          defect this file's own header complains about one paragraph up — "the
          label that got you here was a different word in a different language".
          The tab won: *Wortschatz* is also too close to *Wörter* next door for
          two tabs to carry both. */}
      <Kicker className="block mb-0.5">Topics</Kicker>
      <h1 lang="de" className="display text-3xl sm:text-4xl mb-1">Themen</h1>
      <p className="text-dim text-xs mb-4">
        {/* The count has to agree with the tiles below it. It said 6,520 — the
            whole corpus — above nine groups that are level-filtered, so a
            learner scoped to B2–C1 read "6,520 cards" over tiles summing to
            about 1,500. Both numbers when they differ, one when they don't. */}
        {inScope < WORDS.length
          ? <>{fmt(inScope)} of Lexi’s {fmt(WORDS.length)} cards are in the levels you’re studying.</>
          : <>Every one of the {fmt(WORDS.length)} cards Lexi teaches.</>}
        {' '}Browse by theme — or tap the magnifier above to look one up.
      </p>

      {/* No search field here any more. There is a magnifier in the bar on every
          surface (components/SearchSheet), and two entry points to one search on
          one screen is the definition of the clutter this pass exists to remove.
          This page is what its tab says it is: themes. */}
      <Tour id="themen" steps={THEMEN_TOUR} />
      <Taxonomy onOpenGroup={onOpenGroup} />
      {/* The second way to choose words, and the one nobody would guess is here.
          A theme is Lexi's answer to "what should I learn next"; a text you
          actually want to read is the learner's, and it is the better one when
          they have it. Below the taxonomy and deliberately quiet: it needs
          something pasted in, so it is not where a cold visit should start. */}
      <button onClick={onText} data-tour="text"
        className="-mx-3 sm:-mx-5 w-[calc(100%+1.5rem)] sm:w-[calc(100%+2.5rem)] border-b border-line
          flex items-center gap-3.5 px-3 sm:px-5 py-4 text-left hover:bg-panel2 active:bg-panel2 transition-colors">
        <span className="grid place-items-center w-[44px] h-[44px] rounded-md flex-shrink-0 text-accent"
          style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}>
          <FileText size={20} />
        </span>
        <span className="flex-1 min-w-0">
          <span lang="de" className="block text-lg font-semibold leading-tight">Wörter aus einem Text</span>
          <span className="block text-xs text-dim mt-1">
            Paste German you want to read — Lexi marks what you know and builds a session from the rest.
          </span>
        </span>
        <ChevronRight size={18} className="text-dim flex-shrink-0" />
      </button>

      {/* The third way in, and the only one that is not studying.
          
          It was reachable from the session recap and nowhere else, which put the
          game behind finishing a session — the most expensive door in the app, and
          invisible to anyone who had not already worked for it. A thing you might
          want to *do* belongs on the surface that lists things you can do. */}
      {onGame && <button onClick={onGame}
        className="-mx-3 sm:-mx-5 w-[calc(100%+1.5rem)] sm:w-[calc(100%+2.5rem)] border-b border-line
          flex items-center gap-3.5 px-3 sm:px-5 py-4 text-left hover:bg-panel2 active:bg-panel2 transition-colors">
        <span className="grid place-items-center w-[44px] h-[44px] rounded-md flex-shrink-0 text-accent"
          style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}>
          <Mic size={20} />
        </span>
        <span className="flex-1 min-w-0">
          <span lang="de" className="block text-lg font-semibold leading-tight">Sag es</span>
          <span className="block text-xs text-dim mt-1">
            One minute, out loud. Say each word until the recogniser catches it — needs a microphone.
          </span>
        </span>
        <ChevronRight size={18} className="text-dim flex-shrink-0" />
      </button>}
    </div>
  );
}

/** The nine groups, with how far through each you are.
 *
 *  Coverage rides on the tile rather than sitting on a separate surface: the
 *  reason to look at a group list is to choose one, and "you know 12% of this"
 *  is the fact that decides it. The heatmap on Progress answers the same
 *  question spatially and for a different mood — there you are auditing, here
 *  you are shopping. */
const THEMEN_TOUR: TourStep[] = [
  {
    title: 'Themen: words by topic',
    body: <>Every word Lexi teaches, grouped by theme. Each group shows how much of it you already know. Open one to browse its decks or study it.</>,
    target: '[data-tour="themes"] button',
  },
  {
    title: 'Or bring your own German',
    body: <>Paste a text you want to read. Lexi marks the words you know and builds a session from the rest.</>,
    target: '[data-tour="text"]',
  },
];

function Taxonomy({ onOpenGroup }: { onOpenGroup: (g: string) => void }) {
  const rows = useMemo(() => {
    const stats = groupStats();
    const byName = new Map(stats.map((s) => [s.name, s]));
    return GROUPS.map((g) => {
      const s = byName.get(g);
      const sectors = GROUP_SECTORS.get(g) ?? [];
      const count = s?.count ?? sectors.reduce((n, sec) => n + (WORDS_BY_SECTOR.get(sec)?.length ?? 0), 0);
      return { name: g, count, sectors: sectors.length, coverage: s?.coverage ?? 0, due: s?.due ?? 0 };
    }).sort((a, b) => b.count - a.count);
  }, []);

  return (
    <section aria-labelledby="groups-heading" data-tour="themes">
      <h2 id="groups-heading" className="text-lg font-bold mb-1">Browse by theme</h2>
      <p className="text-dim text-xs mb-3">
        {rows.length} groups over {fmt(rows.reduce((n, r) => n + r.sectors, 0))} decks.
      </p>
      {/* **Keys, not rows** *(2026-10-11)*. This was a hairline list — the right
          answer to nine bordered *cards*, which were boxes in a box. A tile you
          press is not a card: it is a key (`.key` — hard edge, lip, goes down
          under the thumb), and a grid of keys is what lets nine topics be
          *scanned* by their emblem before a label is read. Two columns, because a
          German group name at `text-base` fits half a 402pt phone without
          breaking. */}
      <ul className="grid grid-cols-2 gap-3 pb-1">
        {rows.map((r) => (
          <li key={r.name} className="min-w-0">
            <button onClick={() => onOpenGroup(r.name)}
              className="key w-full h-full min-h-[9.5rem] rounded-lg bg-card text-left p-3.5 flex flex-col">
              <span className="flex justify-end -mr-1 -mt-1"><GroupEmblem group={r.name} /></span>
              <span className="mt-auto pt-2 block text-base font-semibold leading-tight break-words">{r.name}</span>
              <span className="block text-2xs text-dim mt-1">
                {fmt(r.count)} words
                {r.due > 0 && <> · <span className="text-accent font-semibold">{fmt(r.due)} due</span></>}
              </span>
              {/* Coverage rides the foot of the key: the fact that decides which
                  one to press, at the size of a fact rather than a headline. */}
              <span className="mt-2 flex items-center gap-2" aria-label={`${Math.round(r.coverage * 100)}% known`}>
                <span className="flex-1 h-1 rounded-full bg-panel2 overflow-hidden">
                  <span className="block h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.max(3, Math.round(r.coverage * 100))}%`, background: heatText(r.coverage) }} />
                </span>
                <span className="font-mono text-2xs tabular-nums flex-shrink-0" style={{ color: heatText(r.coverage) }}>
                  {Math.round(r.coverage * 100)}%
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The group's emblem, on a tinted tile.
 *
 *  ## Why this draws the SVG itself instead of using <Illustration>
 *
 *  `SHOW_ILLUSTRATIONS` is `false` and stays false. That switch is off because
 *  the line-art was judged "a first pass" against a reference style, and it
 *  governs the *word card*, the market and the word map — three surfaces where
 *  an emblem is decoration on something that already has a subject.
 *
 *  A browse index is the one place where it is not decoration. Nine cards of
 *  identical grey text is a list you read; nine cards with a picture each is a
 *  grid you *scan*, and scanning is the entire job of this surface. So this
 *  opts in deliberately, on one surface, through the export the module provides
 *  for exactly this ("for callers drawing inside an existing <svg>") — rather
 *  than flipping a global flag whose other three surfaces nobody has looked at.
 *
 *  It used to sit on an accent tint at 12% and argued that halftone was the
 *  reference's *costume*. The owner asked for the reference's look on 2026-10-11,
 *  and what was taken is a mark system rather than a style: two flat tabs (teal
 *  disc, coral halftone pad) under the line art this module already draws. No
 *  isometric scenes, no borrowed drawings — see DESIGN §1, *The card box*. */
function GroupEmblem({ group }: { group: string }) {
  const concept = conceptForSector(group);
  // **Two tabs, one mark** *(2026-10-11)*. The teal disc carries the emblem in
  // charcoal line; the coral halftone pad under it, offset down and right, is
  // what sets it on the page — the reference's lesson (a topic is a coloured
  // mark before it is a label) drawn in this app's own line language.
  return (
    <span aria-hidden className="relative block w-[60px] h-[60px] flex-shrink-0">
      <span className="pad absolute left-[10px] top-[16px] w-[50px] h-[44px] rounded-full" />
      <span className="absolute left-0 top-0 grid place-items-center w-[52px] h-[52px] rounded-full bg-key text-key-ink border-[1.5px] border-lip">
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: conceptPaths(concept) }} />
      </span>
    </span>
  );
}
