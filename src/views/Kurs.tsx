// Kurs — the course, A1 → C2. A path of units per level; each unit is a
// situation, its words, and a short film about one idea in German.
//
// It lives in Üben (`#/kurs/<level>`), the half beside the day's session
// (2026-11-27). It lived under Themen for its first week, on the argument that a unit
// is a theme with a direction. The argument that moved it is the learning cycle: the
// film explains, the unit's session practises, and the scheduler brings the words back
// as reviews. All three are study, and Üben is where study happens. Themen stays the
// place you browse. Fortschritt links here from the level path, so the page that
// measures you points at the page that teaches you, rather than doubling as it.
//
// Nothing is locked. The marked unit is a suggestion — the first one whose words
// are not yet mostly known — exactly the rule the old syllabus path kept.
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Check, ChevronRight, GraduationCap, Play } from 'lucide-react';
import { unitsFor, unitCards, nextUnit, PRELUDES, type Unit } from '../data/course.ts';
import { FILM_BY_ID } from '../films/films.ts';
import FilmPlayer from '../components/film/FilmPlayer.tsx';
import { statusOf, filmsSeen, studyLevel } from '../store.ts';
import { useStore } from '../useStore.ts';
import Kicker from '../components/ui/Kicker.tsx';
import UebenSwitch from '../components/UebenSwitch.tsx';
import { ALL_LEVELS, type CEFR, type Target } from '../types.ts';

/** What each level is, as a course book would title it. */
const LEVEL_NAME: Record<CEFR, string> = {
  A1: 'Erste Schritte', A2: 'Im Alltag', B1: 'Selbstständig', B2: 'Fließend', C1: 'Beruf und Hochschule', C2: 'Nuance',
};
const LEVEL_LINE: Record<CEFR, string> = {
  A1: 'The words of everyday life, and the first ideas that hold German together: articles, plurals, the verb in second place.',
  A2: 'Doctors, flats, jobs, travel, and the sentences that say why: weil, dass, the Perfekt.',
  B1: 'Work, the environment, the news, the offices. Word-building starts to pay: endings that tell you the article, long words made of short ones.',
  B2: 'The language of work, science, politics and opinion: nouns made from verbs, the passive, Konjunktiv II.',
  C1: 'Language schools split C1 into Beruf and Hochschule. Lexi teaches both in one line: a shared core, the meeting room and the seminar in turn, and bridge units that practise one skill in both settings.',
  C2: 'Idioms, register, word-building and specialist language.',
};
const STRAND_LABEL = { kern: 'Kern', beruf: 'Beruf', hochschule: 'Hochschule' } as const;

export default function Kurs({ level, onLevel, onToday, onStudy }: {
  level: CEFR;
  onLevel: (l: CEFR) => void;
  /** The other half of Üben: the day's session. */
  onToday: () => void;
  onStudy: (t: Target) => void;
}) {
  useStore();
  const main = unitsFor(level);
  const seen = filmsSeen();
  // A unit's film, or the level's prelude, which has a film and no words.
  const [playing, setPlaying] = useState<{ film: string; title: string; unit?: Unit } | null>(null);
  const prelude = PRELUDES[level];

  // `unitCards` is computed once for the whole course and cached.
  const known = (x: Unit) => {
    const ws = unitCards(x);
    return ws.length ? ws.filter((w) => statusOf(w.id) === 'known').length / ws.length : 0;
  };
  const suggested = nextUnit(main, known);

  const study = (x: Unit) => {
    const ws = unitCards(x);
    onStudy({ kind: 'custom', name: `Kurs · ${x.title}`, ids: ws.map((w) => w.id), course: x.id });
  };

  const film = playing ? FILM_BY_ID.get(playing.film) : undefined;

  return (
    <div className="w-full max-w-[760px] mx-auto">
      {/* No back arrow: the course is a half of a door, not a depth under one. */}
      <UebenSwitch at="kurs" onGo={(h) => { if (h === 'heute') onToday(); }} className="mt-[9px] mb-4" />

      <Kicker className="block mb-0.5">Kurs · {level}</Kicker>
      <h1 lang="de" translate="no" className="display text-3xl sm:text-4xl mb-1">{LEVEL_NAME[level]}</h1>
      <p className="text-dim text-sm mb-4 max-w-[60ch] text-balance">{LEVEL_LINE[level]}</p>

      {/* Levels as chips — taps, never a swipe: one horizontal axis per app. */}
      <div role="tablist" aria-label="Level" className="flex gap-1.5 mb-5">
        {ALL_LEVELS.map((l) => (
          <button key={l} role="tab" aria-selected={l === level} onClick={() => onLevel(l)}
            className={`tap-44 flex-1 rounded-full h-10 font-mono text-sm font-bold transition-colors
              ${l === level ? 'bg-key text-key-ink' : 'glass text-dim hover:text-txt'}`}>
            {l}
          </button>
        ))}
      </div>

      {prelude && (
        <PreludeRow title={prelude.title} en={prelude.en} seen={seen.has(prelude.film)}
          onFilm={() => setPlaying({ film: prelude.film, title: prelude.title })} />
      )}
      <ol className={`-mx-3 sm:-mx-5 border-line divide-y divide-line ${prelude ? 'border-b' : 'border-y'}`}>
        {main.map((x, k) => (
          <UnitRow key={x.id} n={k + 1} unit={x} known={known(x)} count={unitCards(x).length}
            seen={!!x.film && seen.has(x.film)} next={x === suggested}
            onFilm={() => x.film && setPlaying({ film: x.film, title: x.title, unit: x })} onStudy={() => study(x)} />
        ))}
      </ol>

      <p className="text-2xs text-dim mt-5 max-w-[60ch]">
        Every unit is open. Films explain and never grade. Only Üben grades, and only the words you choose to learn.
      </p>

      <AnimatePresence>
        {playing && film && (
          <FilmPlayer key={film.id} film={film} unitTitle={playing.title}
            wordCount={playing.unit ? unitCards(playing.unit).length : 0}
            onStudy={() => { const x = playing.unit; setPlaying(null); if (x) study(x); }}
            onClose={() => setPlaying(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Before unit 1: a film with no words of its own, so no ring, no count and no
 *  session. It explains how to read every unit after it (course.ts, PRELUDES). */
function PreludeRow({ title, en, seen, onFilm }: { title: string; en: string; seen: boolean; onFilm: () => void }) {
  return (
    <div className="-mx-3 sm:-mx-5 border-t border-line px-3 sm:px-5 py-4 flex gap-3.5">
      <span className="grid place-items-center w-[44px] h-[44px] flex-shrink-0 rounded-full border-[3px] border-line" aria-hidden>
        <Play size={15} className="text-accent translate-x-[1px]" />
      </span>
      <div className="flex-1 min-w-0">
        <Kicker className="block">Before you start</Kicker>
        <h2 lang="de" translate="no" className="headword text-xl font-bold leading-tight">{title}</h2>
        <p className="text-sm text-dim">{en}</p>
        <button onClick={onFilm}
          className="tap-44 mt-3 inline-flex items-center gap-1.5 rounded-full key bg-key text-key-ink font-semibold text-sm px-4 h-10 active:scale-95 transition">
          <Play size={14} /> {seen ? 'Watch again' : 'Film'}
        </button>
      </div>
    </div>
  );
}

function UnitRow({ n, unit, known, count, seen, next, onFilm, onStudy }: {
  n: number; unit: Unit; known: number; count: number; seen: boolean; next: boolean;
  onFilm: () => void; onStudy: () => void;
}) {
  const pct = Math.round(known * 100);
  const done = known >= 0.8;
  return (
    <li className={`px-3 sm:px-5 py-4 ${next ? 'bg-[color-mix(in_srgb,var(--color-accent)_7%,transparent)]' : ''}`}>
      <div className="flex gap-3.5">
        {/* The unit number in a ring that fills as its words become known. */}
        <span className="relative grid place-items-center w-[44px] h-[44px] flex-shrink-0" aria-hidden>
          <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
            <circle cx="22" cy="22" r="19" fill="none" stroke="var(--color-line)" strokeWidth="3" />
            <circle cx="22" cy="22" r="19" fill="none" stroke="var(--color-green)" strokeWidth="3"
              strokeDasharray={`${(2 * Math.PI * 19 * known).toFixed(1)} 200`} strokeLinecap="round" />
          </svg>
          {done ? <Check size={16} className="text-green" /> : <span className="font-mono text-sm font-bold">{n}</span>}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 lang="de" translate="no" className="headword text-xl font-bold leading-tight">{unit.title}</h2>
            {unit.strand && (
              <span className={`text-2xs font-semibold uppercase tracking-widest ${unit.bridge ? 'text-accent' : 'text-dim'}`}>
                {unit.bridge ? 'Brücke' : STRAND_LABEL[unit.strand]}
              </span>
            )}
            {next && <span className="text-2xs font-semibold uppercase tracking-widest text-accent">Next</span>}
          </div>
          <p className="text-sm text-dim">{unit.en}</p>
          <p className="text-xs mt-1">
            <span lang="de" translate="no" className="text-txt">{unit.focus}</span>
            <span className="text-dim"> · {count} words · {pct}% known</span>
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {unit.film && (
              <button onClick={onFilm}
                className="tap-44 inline-flex items-center gap-1.5 rounded-full key bg-key text-key-ink font-semibold text-sm px-4 h-10 active:scale-95 transition">
                <Play size={14} /> {seen ? 'Watch again' : 'Film'}
              </button>
            )}
            <button onClick={onStudy}
              className="tap-44 inline-flex items-center gap-1.5 rounded-full glass font-semibold text-sm px-4 h-10 active:scale-95 transition">
              <GraduationCap size={15} className="text-accent" /> Learn the words
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Where you are in your level's course, one tap from it. Üben shows it when the
 *  day's session is over or empty, which is the moment a learner has time and asks
 *  what next (2026-11-27). Lazy, like the course: it rides in the course's chunk, so
 *  the course opens at once after the band has shown.
 *
 *  `bleed` runs it edge to edge as a row of the page; without it, it sits between
 *  hairlines inside a centred column, as the recap's placement offer does. */
export function KursBand({ onOpen, bleed = true }: { onOpen: (l: CEFR) => void; bleed?: boolean }) {
  useStore();
  const level = studyLevel();
  const main = unitsFor(level);
  const known = (x: Unit) => {
    const ws = unitCards(x);
    return ws.length ? ws.filter((w) => statusOf(w.id) === 'known').length / ws.length : 0;
  };
  const next = nextUnit(main, known);
  if (!next) return null;
  const n = main.indexOf(next) + 1;
  // The film first while it is unwatched; after that the unit is its words.
  const film = !!next.film && !filmsSeen().has(next.film);
  return (
    <button onClick={() => onOpen(level)} data-tour="kurs"
      className={`${bleed ? '-mx-3 sm:-mx-5 w-[calc(100%+1.5rem)] sm:w-[calc(100%+2.5rem)] px-3 sm:px-5' : 'w-full px-1'}
        border-y border-line mb-5 flex items-center gap-3.5 py-4 text-left hover:bg-panel2 active:bg-panel2 transition-colors`}>
      <span className="grid place-items-center w-[44px] h-[44px] rounded-full flex-shrink-0 bg-key text-key-ink border-[1.5px] border-lip">
        {film ? <Play size={18} className="translate-x-[1px]" /> : <GraduationCap size={19} />}
      </span>
      <span className="flex-1 min-w-0">
        <Kicker className="block">Next in your course · {level}</Kicker>
        <span lang="de" translate="no" className="block text-lg font-semibold leading-tight mt-0.5">{next.title}</span>
        <span className="block text-xs text-dim mt-0.5">
          Unit {n} of {main.length} · {film ? 'a film, then ' : ''}{unitCards(next).length} words · <span lang="de" translate="no">{next.focus}</span>
        </span>
        {/* One segment a unit: the path at a glance, the way a course book's
            contents page shows where the bookmark is. */}
        <span className="flex gap-1 mt-2" aria-hidden>
          {main.map((x) => (
            <span key={x.id} className={`h-1 flex-1 rounded-full ${known(x) >= 0.8 ? 'bg-green' : x === next ? 'bg-accent' : 'bg-panel2'}`} />
          ))}
        </span>
      </span>
      <ChevronRight size={18} className="text-dim flex-shrink-0" />
    </button>
  );
}
