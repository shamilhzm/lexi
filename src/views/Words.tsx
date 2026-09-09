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
import IconButton from '../components/ui/IconButton.tsx';
import type { WordsRoute } from '../route.ts';
import type { Target } from '../types.ts';

export default function Words({ route, onNavigate, onStudy, onText, onGame }: {
  route: WordsRoute;
  onNavigate: (next: WordsRoute) => void;
  onStudy: (t: Target) => void;
  /** The other way to choose words: paste a text, study what’s in the way. */
  onText: () => void;
  /** Open `Sag es`, the pronunciation game. */
  onGame: () => void;
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
  onOpenGroup: (g: string) => void; onText: () => void; onGame: () => void;
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
      <Taxonomy onOpenGroup={onOpenGroup} />
      {/* The second way to choose words, and the one nobody would guess is here.
          A theme is Lexi's answer to "what should I learn next"; a text you
          actually want to read is the learner's, and it is the better one when
          they have it. Below the taxonomy and deliberately quiet: it needs
          something pasted in, so it is not where a cold visit should start. */}
      <button onClick={onText}
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
      <button onClick={onGame}
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
      </button>
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
    <section aria-labelledby="groups-heading">
      <h2 id="groups-heading" className="text-lg font-bold mb-1">Browse by theme</h2>
      <p className="text-dim text-xs mb-3">
        {rows.length} groups over {fmt(rows.reduce((n, r) => n + r.sectors, 0))} decks.
      </p>
      {/* **No boxes.** *2026-09-05.*
          Nine bordered cards inside a page that is itself a surface is a box in a
          box, and it is the single thing that made this screen read as a
          different app from the feed one tab away. The feed sets a word directly
          on the paper with nothing drawn around it; so does this now, and what
          separates one row from the next is a hairline — which is what a printed
          lexicon uses and what `RevealBlock` already used two files over.
          Full-bleed: the negative margin cancels the page gutter, so a row runs
          edge to edge and the tap target is the width of the phone. */}
      <ul className="-mx-3 sm:-mx-5 divide-y divide-line border-y border-line">
        {rows.map((r) => (
          <li key={r.name}>
            <button onClick={() => onOpenGroup(r.name)}
              className="w-full text-left px-3 sm:px-5 py-4 flex items-center gap-3.5
                hover:bg-panel2 active:bg-panel2 transition-colors">
              <GroupEmblem group={r.name} />
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold break-words leading-tight">{r.name}</span>
                <span className="block text-xs text-dim mt-1">
                  {fmt(r.count)} words · {r.sectors} deck{r.sectors === 1 ? '' : 's'}
                  {r.due > 0 && <> · <span className="text-accent">{fmt(r.due)} due</span></>}
                </span>
                {/* The bar rides under the label rather than across a card, so it
                    reads as a property of the row and not as its floor. */}
                <span className="mt-2 flex items-center gap-2">
                  <span className="flex-1 h-1 rounded-full bg-panel2 overflow-hidden">
                    <span className="block h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${Math.max(2, Math.round(r.coverage * 100))}%`, background: heatText(r.coverage) }} />
                  </span>
                  <span className="font-mono text-2xs tabular-nums flex-shrink-0"
                    style={{ color: heatText(r.coverage) }}>
                    {Math.round(r.coverage * 100)}%
                  </span>
                </span>
              </span>
              <ChevronRight size={18} className="text-dim flex-shrink-0" />
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
 *  The tile is what makes it read as an emblem rather than a stray icon: the
 *  accent at low opacity, `rounded-md` because it is not a surface you read, and
 *  the stroke in full accent on top. That is the reference's actual lesson —
 *  a topic is recognised by a coloured mark before its label is read — expressed
 *  in this app's own drawing language instead of borrowing someone else's
 *  isometric halftone, which would be the pastiche §1 warns about. */
function GroupEmblem({ group }: { group: string }) {
  const concept = conceptForSector(group);
  return (
    <span aria-hidden
      className="grid place-items-center w-[44px] h-[44px] rounded-md flex-shrink-0 text-accent"
      style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}>
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: conceptPaths(concept) }} />
    </span>
  );
}
