// Einstufungstest — a quick adaptive placement test. Climbs the CEFR levels,
// showing a handful of words per level; you tap know / don’t know. It stops at
// the level where your recognition drops off, seeds the words you know into FSRS
// (so the market reflects reality), and focuses the level filter on your range.
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, GraduationCap, Play } from 'lucide-react';
import { WORDS } from '../data/index.ts';
import { review, setLevels, setPlacementLevel } from '../store.ts';
import { Rating } from '../srs.ts';
import {
  FOILS, PER_LEVEL, FOILS_PER_LEVEL, PASS,
  correctedRate, trustsSelfReport, selfReportNote,
} from '../lib/placement.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { ALL_LEVELS, type CEFR, type Word } from '../types.ts';

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '');

/** One prompt. A foil renders identically to a real word — that is the point —
 *  so the two are distinguished by this tag and never by anything on screen. */
type Probe =
  | { kind: 'real'; id: string; term: string; gender: 'der' | 'die' | 'das' | null }
  | { kind: 'foil'; id: string; term: string; gender: 'der' | 'die' | 'das' | null };

const PER_BATCH = PER_LEVEL + FOILS_PER_LEVEL;

/** A word whose German form gives its English meaning away — "das Meeting"
 *  glossed as "meeting", "das Hotel" as "hotel". They tell us nothing about
 *  recognition: an English speaker "knows" them without knowing any German, so
 *  they inflate the placement and waste one of only five probes per level.
 *  (Deliberately narrow: only an exact match after stripping the article, so
 *  genuine cognates like "Haus"/"house" still count.) */
export function isTransparent(term: string, en: string): boolean {
  const de = stripArticle(term).trim().toLowerCase();
  return en.split(/[,;/]/).some((g) => g.trim().toLowerCase() === de);
}

function shuffled<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

function sample(level: CEFR, n: number): Word[] {
  const all = WORDS.filter((w) => w.kind === 'word' && w.level === level && w.en);
  // Fall back to the unfiltered pool if a level is too thin to be choosy — a
  // shorter probe list would distort the test more than a loanword does.
  const probes = all.filter((w) => !isTransparent(w.term, w.en));
  const pool = probes.length >= n ? probes : all;
  return shuffled(pool).slice(0, n);
}

/** One level's batch: real words and invented ones, shuffled together so the
 *  foils are not in a guessable position. Foils are drawn without replacement
 *  across the whole test — meeting the same invented word twice would make the
 *  second sighting a memory probe rather than a vocabulary one. */
function buildBatches(): Probe[][] {
  const foilBag = shuffled(FOILS);
  return ALL_LEVELS.map((level, i) => {
    const real: Probe[] = sample(level, PER_LEVEL)
      .map((w) => ({ kind: 'real', id: w.id, term: w.term, gender: w.gender }));
    const foils: Probe[] = foilBag
      .slice(i * FOILS_PER_LEVEL, (i + 1) * FOILS_PER_LEVEL)
      .map((f) => ({ kind: 'foil', id: `foil:${f.term}`, term: f.term, gender: f.gender }));
    return shuffled([...real, ...foils]);
  });
}

export default function Placement({ onDone }: { onDone: () => void }) {
  // Pre-sample a batch per level; we only consume as far as the learner climbs.
  const batches = useMemo(() => buildBatches(), []);
  const [li, setLi] = useState(0);          // current level index
  const [qi, setQi] = useState(0);          // index within the level batch
  const [levelKnown, setLevelKnown] = useState(0);   // real words claimed at this level
  const [known, setKnown] = useState<Set<string>>(new Set());
  // Cumulative across the whole test, not per level: a false-alarm rate wants
  // every foil the learner has seen, and two per level is too few to be a rate.
  const [foilsSeen, setFoilsSeen] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [result, setResult] = useState<CEFR | null>(null);
  const [seeded, setSeeded] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const batch = batches[li];
  const probe = batch?.[qi];
  const totalAsked = li * PER_BATCH + qi;

  const finish = (placement: CEFR, knownSet: Set<string>, fa: number, fs: number) => {
    // Seed only what the learner's own reporting can carry. Writing a schedule
    // from claims that the foils just showed to be unreliable would hand them a
    // queue of consolidated words they cannot actually read — and FSRS would
    // take months to find out.
    let n = 0;
    if (trustsSelfReport(fa, fs)) {
      for (const id of knownSet) { review(id, Rating.Easy); n++; }
    }
    const upto = ALL_LEVELS.slice(0, ALL_LEVELS.indexOf(placement) + 1);
    setLevels(new Set(upto));
    setPlacementLevel(placement);
    setSeeded(n);
    setNote(selfReportNote(fa, fs));
    setResult(placement);
  };

  const answer = (knows: boolean) => {
    if (!probe) return;

    const isFoil = probe.kind === 'foil';
    const nextFoils = foilsSeen + (isFoil ? 1 : 0);
    const nextFA = falseAlarms + (isFoil && knows ? 1 : 0);
    if (isFoil) { setFoilsSeen(nextFoils); setFalseAlarms(nextFA); }

    // Only real words are ever seeded, and only real words count as hits.
    const nextKnown = new Set(known);
    if (knows && !isFoil) nextKnown.add(probe.id);
    setKnown(nextKnown);
    const lk = levelKnown + (knows && !isFoil ? 1 : 0);

    if (qi + 1 < batch.length) { setQi(qi + 1); setLevelKnown(lk); return; }

    // Finished this level. The climb is decided on the *corrected* rate: raw
    // hits over real words, rescaled by how often this learner says yes to a
    // word that does not exist.
    const realCount = batch.filter((p) => p.kind === 'real').length || 1;
    const passed = correctedRate(lk / realCount, nextFoils ? nextFA / nextFoils : 0) >= PASS;
    const isLast = li + 1 >= ALL_LEVELS.length;
    if (passed && !isLast && batches[li + 1].length > 0) {
      setLi(li + 1); setQi(0); setLevelKnown(0);
    } else {
      // placement = current level if passed, else the level below (floor A1)
      const idx = passed ? li : Math.max(0, li - 1);
      finish(ALL_LEVELS[idx], nextKnown, nextFA, nextFoils);
    }
  };

  if (result) {
    // The reveal is the emotional peak of onboarding — the first moment the app
    // tells the learner something about themselves. It used to render flat while
    // the session recap had five separate entrances.
    return (
      <div className="w-full max-w-[520px] mx-auto">
        <Card pad="none" className="px-6 py-10 text-center">
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="grid place-items-center w-14 h-14 rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}>
            <GraduationCap className="text-green" />
          </motion.div>
          <Kicker tone="accent" className="block mb-1">Your level</Kicker>
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 480, damping: 16, delay: 0.08 }}
            className="font-mono font-bold text-6xl leading-none text-accent mb-3">{result}</motion.div>
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-dim text-base mb-6">
            {seeded > 0
              ? <>Seeded {seeded} word{seeded === 1 ? '' : 's'} you already know, and focused Lexi on {result === 'A1' ? 'A1' : <>A1–{result}</>}. You can change the level filter anytime.</>
              : <>Starting fresh at {result} — the best place to start. Every word from here on counts.</>}
          </motion.p>
          {/* Say what the invented words did. A learner who ticked some deserves
              to know it changed the result, and a learner who ticked enough that
              nothing was seeded would otherwise just find an empty queue. */}
          {note && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-dim text-2xs leading-relaxed mb-6 -mt-3 max-w-[34ch] mx-auto">
              {note}
            </motion.p>
          )}
          <Button size="lg" className="mx-auto" onClick={onDone}><Play size={15} /> Start learning</Button>
        </Card>
      </div>
    );
  }

  if (!probe) return null;
  const totalMax = ALL_LEVELS.length * PER_BATCH;

  return (
    <div className="w-full max-w-[520px] mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="display text-2xl sm:text-3xl">Placement test</h1>
        <button onClick={onDone} className="tap-hit text-xs text-dim hover:text-accent">skip</button>
      </div>
      <div className="h-1.5 bg-panel2 rounded-full overflow-hidden mb-1">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${(totalAsked / totalMax) * 100}%` }} />
      </div>
      {/* The bar alone reads as empty on the first word, which makes a test with
          no stated length feel open-ended. The count is the reassurance: the test
          stops early when recognition drops, so this is a ceiling, not a quota. */}
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <p className="text-2xs text-dim">Testing level {ALL_LEVELS[li]} · do you know this word?</p>
        <p className="text-2xs text-dim font-mono tabular-nums flex-shrink-0">
          {qi + 1}/{PER_BATCH} · {totalAsked + 1} of {totalMax} max
        </p>
      </div>

      {/* The word swaps in place, so a heading alone would never be re-announced —
          the live region is what makes each new prompt reach a screen reader. */}
      {/* The word is German — say so, or a screen reader reads it in English. */}
      <Card as={motion.div} pad="none" key={probe.id}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        role="status" aria-live="polite"
        className="px-6 py-12 text-center mb-4">
        <div lang="de" className="font-bold text-4xl sm:text-5xl leading-tight">{stripArticle(probe.term)}</div>
        {probe.gender && <div lang="de" className="text-dim text-base mt-1.5">{probe.gender}</div>}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => answer(false)}
          className="flex items-center justify-center gap-2 rounded-md py-3.5 bg-panel2 border border-line hover:border-red text-base font-semibold transition-colors active:scale-[0.98]">
          <X size={16} className="text-red" /> New to me
        </button>
        <button onClick={() => answer(true)}
          className="flex items-center justify-center gap-2 rounded-md py-3.5 bg-panel2 border border-line hover:border-green text-base font-semibold transition-colors active:scale-[0.98]">
          <Check size={16} className="text-green" /> I know it
        </button>
      </div>
      {/* Disclosed, not hidden. Yes/No vocabulary tests state this as a matter of
          course, and here it is also the app's own house rule: a learner who
          later worked out that some words were fake would be right to wonder
          what else was staged. Saying it up front costs nothing and makes the
          correction legible rather than a trick. */}
      <p className="text-center text-2xs text-dim mt-3 leading-relaxed max-w-[38ch] mx-auto">
        Answer honestly — this just calibrates where you start.
        <br />
        <span className="text-txt">A few of these words are invented.</span> Nobody knows them, and
        that is how the test knows what your answers are worth.
      </p>
    </div>
  );
}
