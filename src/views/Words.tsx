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
import { useMemo, useState } from 'react';
import { ArrowLeft, Search, X, ChevronRight, Volume2 } from 'lucide-react';
import { WORDS, GROUPS, GROUP_SECTORS, WORDS_BY_SECTOR } from '../data/index.ts';
import { groupStats, statusOf } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt, heatText, genderColor } from '../lib/ui.ts';
import { speak } from '../lib/tts.ts';
import { conceptForSector, conceptPaths } from '../lib/illustration.tsx';
import Decks from './Decks.tsx';
import Wortkarte from './Wortkarte.tsx';
import Card from '../components/ui/Card.tsx';
import Chip from '../components/ui/Chip.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import Button from '../components/ui/Button.tsx';
import type { WordsRoute } from '../route.ts';
import type { Target, Word } from '../types.ts';

/** How many hits to render. The list is a look-up aid, not a results page: past
 *  a couple of dozen rows nobody is reading, they are refining the query. */
const MAX_HITS = 40;

/** Fold the German for search: umlauts and ß are the two things a learner on an
 *  English keyboard cannot type, and a search that demands them is a search that
 *  fails on *Übung*, *schön* and *heiß* — which is most of the words anyone looks
 *  up in a hurry. Same folding the matcher uses, kept local because this is a
 *  presentation concern and does not want a dependency on the study path. */
function fold(s: string): string {
  return s.toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** `term` carries the article for nouns ("das Haus"), which is right on a card
 *  and wrong for matching: without stripping it, *nothing a learner types for a
 *  noun is ever an exact or a prefix hit*. Measured — searching "haus" put
 *  `das Haus` fourth, behind *Autohaus*, *Gasthaus* and *Gehäuse*, because the
 *  only rung it could reach was "contains". Both forms are matched, so typing
 *  the article still works. */
const ARTICLE = /^(?:der|die|das)\s+/i;

/** A gloss is often several senses — "restaurant, inn, guesthouse". Ranked as a
 *  whole string, only the first sense can ever be a prefix hit. */
function senses(en: string): string[] {
  return en.split(/[,;]/).map((p) => fold(p)).filter(Boolean);
}

/** Rank: exact, then prefix, then anywhere — German side before English, because
 *  someone typing "Haus" wants *das Haus* and not the four English glosses that
 *  happen to contain the letters. Ties break on the shorter headword, so the
 *  base word beats its compounds. */
function search(q: string): Word[] {
  const f = fold(q.trim());
  if (f.length < 2) return [];
  const out: { w: Word; score: number }[] = [];
  for (const w of WORDS) {
    const full = fold(w.term);
    const bare = fold(w.term.replace(ARTICLE, ''));
    const en = senses(w.en ?? '');
    let score = -1;
    if (full === f || bare === f) score = 0;
    else if (bare.startsWith(f) || full.startsWith(f)) score = 1;
    else if (en.some((e) => e === f)) score = 2;
    else if (en.some((e) => e.startsWith(f))) score = 3;
    else if (bare.includes(f)) score = 4;
    else if (en.some((e) => e.includes(f))) score = 5;
    if (score >= 0) out.push({ w, score });
  }
  out.sort((a, b) => a.score - b.score
    || a.w.term.length - b.w.term.length
    || a.w.term.localeCompare(b.w.term, 'de'));
  return out.slice(0, MAX_HITS).map((h) => h.w);
}

export default function Words({ route, onNavigate, onStudy }: {
  route: WordsRoute;
  onNavigate: (next: WordsRoute) => void;
  onStudy: (t: Target) => void;
}) {
  useStore();

  // ---- depth: a group's decks, or one sector's word map ---------------------
  if (route.level === 'group' || route.level === 'map') {
    const title = route.level === 'group' ? (route.group ?? 'All decks') : (route.sector ?? 'Word map');
    return (
      <div className="w-full max-w-[1100px] mx-auto">
        <div className="flex items-center gap-1.5 mb-3">
          <IconButton label="Back to Words" pull
            onClick={() => onNavigate(route.level === 'map' && route.group
              ? { level: 'group', group: route.group }
              : { level: 'index' })}>
            <ArrowLeft size={18} />
          </IconButton>
          <nav aria-label="Breadcrumb" className="flex items-baseline gap-1.5 min-w-0 ml-1.5">
            <Kicker className="flex-shrink-0">{route.level === 'map' ? 'Decks /' : 'Words /'}</Kicker>
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

  return <Index onOpenGroup={(g) => onNavigate({ level: 'group', group: g })} onStudy={onStudy} />;
}

/** The index. Search first, because that is what the surface is for; the
 *  taxonomy underneath is for the learner who does not yet have a word in mind. */
function Index({ onOpenGroup, onStudy }: { onOpenGroup: (g: string) => void; onStudy: (t: Target) => void }) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => search(q), [q]);
  const searching = q.trim().length >= 2;

  return (
    <div className="w-full max-w-[1000px] mx-auto">
      <h1 lang="de" className="display text-3xl sm:text-4xl mb-1">Wortschatz</h1>
      <p className="text-dim text-xs mb-4">
        Every one of the {fmt(WORDS.length)} cards Lexi teaches, by theme — and a search box, which
        this app went a year without.
      </p>

      <div className="relative mb-4">
        <label className="sr-only" htmlFor="word-search">Search the lexicon</label>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
        <input
          id="word-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search"
          placeholder="Look up a word — German or English, umlauts optional"
          className="w-full tap-44 rounded-md bg-panel2 border border-line pl-9 pr-11 py-2.5 text-sm
                     outline-none focus:border-accent" />
        {q && (
          <button onClick={() => setQ('')} aria-label="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2 tap-44 grid place-items-center text-dim hover:text-txt">
            <X size={16} />
          </button>
        )}
      </div>

      {searching
        ? <Results hits={hits} q={q} onStudy={onStudy} />
        : (
          <>
            <Taxonomy onOpenGroup={onOpenGroup} />
          </>
        )}
    </div>
  );
}

/** Search results — a dictionary listing, not a study queue.
 *
 *  Every row is a card you can start on its own, because the commonest reason to
 *  look a word up is that you just met it somewhere and want it. */
function Results({ hits, q, onStudy }: { hits: Word[]; q: string; onStudy: (t: Target) => void }) {
  if (hits.length === 0) {
    return (
      <Card pad="md">
        <p className="text-sm text-dim">
          Nothing for “{q.trim()}”. The corpus is {fmt(WORDS.length)} cards, not a dictionary — try the
          base form (<span lang="de">gehen</span>, not <span lang="de">ging</span>), or search the English.
        </p>
      </Card>
    );
  }

  return (
    <section aria-label="Search results">
      <Kicker className="block mb-2">
        {hits.length === MAX_HITS ? `first ${MAX_HITS} matches` : `${hits.length} match${hits.length === 1 ? '' : 'es'}`}
      </Kicker>
      <Card pad="none" className="divide-y divide-line overflow-hidden">
        {hits.map((w) => (
          <div key={w.id} className="flex items-center gap-3 px-3.5 py-2.5">
            <IconButton label={`Hear ${w.term}`} onClick={() => speak(w.term)} className="w-9 h-9">
              <Volume2 size={15} />
            </IconButton>
            <span className="flex-1 min-w-0">
              <span className="flex items-baseline gap-1.5 flex-wrap">
                {/* `term` already carries the article for nouns ("der Tisch"), so
                    the gender is ink on the headword rather than a second word
                    beside it. `genderColor` returns undefined for everything
                    that has no gender, which inherits the normal ink. */}
                <span lang="de" className="headword text-base font-semibold break-words"
                  style={{ color: genderColor(w.gender) }}>{w.term}</span>
                <span className="font-mono text-2xs text-dim">{w.level}</span>
              </span>
              <span className="block text-xs text-dim truncate">{w.en}</span>
            </span>
            <StatusChip id={w.id} />
            <Button size="sm" variant="quiet"
              onClick={() => onStudy({ kind: 'custom', name: w.term, ids: [w.id] })}>
              Study
            </Button>
          </div>
        ))}
      </Card>
    </section>
  );
}

/** Where a card stands, so a search result says something the learner did not
 *  already know. Silent on New — an "unseen" badge on every row is wallpaper. */
function StatusChip({ id }: { id: string }) {
  const s = statusOf(id);
  if (s === 'known') return <Chip tone="good">known</Chip>;
  if (s === 'learning') return <Chip>learning</Chip>;
  return null;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {rows.map((r) => (
          <Card key={r.name} as="button" pad="none" onClick={() => onOpenGroup(r.name)}
            className="text-left px-4 py-3.5 hover:border-accent transition-colors">
            <span className="flex items-start gap-3">
              <GroupEmblem group={r.name} />
              <span className="flex-1 min-w-0">
                <span className="block text-base font-semibold break-words">{r.name}</span>
                <span className="block text-xs text-dim mt-0.5">
                  {fmt(r.count)} words · {r.sectors} deck{r.sectors === 1 ? '' : 's'}
                  {r.due > 0 && <> · <span className="text-accent">{fmt(r.due)} due</span></>}
                </span>
              </span>
              <ChevronRight size={16} className="text-dim flex-shrink-0 mt-1" />
            </span>
            {/* The bar is the whole reason this is a card and not a link. */}
            <span className="block mt-2.5 h-1 rounded-full bg-panel2 overflow-hidden">
              <span className="block h-full rounded-full transition-[width] duration-500"
                style={{ width: `${Math.max(2, Math.round(r.coverage * 100))}%`, background: heatText(r.coverage) }} />
            </span>
            <span className="mt-1.5 block font-mono text-2xs tabular-nums"
              style={{ color: heatText(r.coverage) }}>
              {Math.round(r.coverage * 100)}% known
            </span>
          </Card>
        ))}
      </div>
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
      className="grid place-items-center w-11 h-11 rounded-md flex-shrink-0 text-accent"
      style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}>
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: conceptPaths(concept) }} />
    </span>
  );
}
