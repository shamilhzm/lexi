// The rule, on demand, wherever a concept is being tested.
//
// Lexi’s drills used to state a verdict and stop: miss a Kasus item and you got
// `der Beruf · subject position → Nominativ → der` — a formula, with no route to
// the thing that would explain it. The teaching text existed the whole time in
// grammar.json; it just had nowhere to appear mid-drill.
//
// Two entry points, both non-blocking: a tappable concept label in the drill
// header ("what am I even practising?"), and a "Why?" link on a wrong answer
// ("I got that wrong, explain it"). Neither interrupts the session — the panel
// opens in place and the queue is untouched.
import { Fragment, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, HelpCircle, X } from 'lucide-react';
import { loadGrammar, findPoint, parsePointId, type GPoint, type RuleSection } from '../lib/grammar.ts';
import Card from './ui/Card.tsx';
import IconButton from './ui/IconButton.tsx';
import Kicker from './ui/Kicker.tsx';
import type { CEFR } from '../types.ts';

/** Resolve a point by `gram:<level>:<title>` id, or by level+title directly.
 *  Null while loading, and null for ids with no authored point behind them. */
export function usePoint(ref: { level: CEFR; title: string } | string | null) {
  const [found, setFound] = useState<{ point: GPoint; level: CEFR } | null>(null);
  const key = typeof ref === 'string' ? ref : ref ? `${ref.level}:${ref.title}` : '';
  useEffect(() => {
    if (!ref) { setFound(null); return; }
    const target = typeof ref === 'string' ? parsePointId(ref) : ref;
    if (!target) { setFound(null); return; }
    let live = true;
    loadGrammar().then((g) => {
      if (!live) return;
      const hit = findPoint(g, target.level, target.title);
      setFound(hit ? { point: hit.point, level: target.level } : null);
    });
    return () => { live = false; };
  }, [key]);
  return found;
}

/** One block of a sectioned rule: a mono kicker, prose, arrow-aligned pairs, and
 *  glossed examples — in that order, because that is the order they teach in.
 *
 *  The arrow column is a real grid column rather than an inline "→", so five plural
 *  patterns read as five scannable rows instead of a sentence you have to parse. */
function Section({ s }: { s: RuleSection }) {
  return (
    <div className="pt-2.5 mt-2.5 border-t border-line first:border-0 first:pt-0 first:mt-0">
      {s.label && <Kicker tone="accent" className="block mb-1">{s.label}</Kicker>}
      {s.body && <p className="text-sm text-txt leading-relaxed">{s.body}</p>}
      {s.pairs && s.pairs.length > 0 && (
        <div lang="de" className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-sm ${s.body ? 'mt-1.5' : ''}`}>
          {s.pairs.map((p, i) => (
            <Fragment key={i}>
              <span className="text-dim text-right">{p.from}</span>
              <span aria-hidden className="text-amber">→</span>
              <span className="text-txt">{p.to}</span>
            </Fragment>
          ))}
        </div>
      )}
      {s.examples && s.examples.length > 0 && (
        <ul className={`space-y-1 ${s.body || s.pairs ? 'mt-1.5' : ''}`}>
          {s.examples.map((e, i) => (
            <li key={i} className="text-sm leading-relaxed">
              <span lang="de" className="text-txt">{e.de}</span>
              {e.en && <span className="block text-dim italic text-xs">{e.en}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The rule card itself. `level` heads it so the learner can see whether this is
 *  something they’re meant to know yet. */
export function RuleCard({ point, level, onClose }: { point: GPoint; level: CEFR; onClose?: () => void }) {
  return (
    <Card as={motion.div} tone="sunken" nested pad="none"
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      className="p-4 text-left">
      <div className="flex items-start gap-2 mb-2">
        <BookOpen size={15} className="text-amber flex-shrink-0 mt-0.5" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold">{point.title}</span>
          <Kicker tone="accent" className="block">{level}</Kicker>
        </span>
        {onClose && (
          <IconButton label="Close rule" pull onClick={onClose}><X size={15} /></IconButton>
        )}
      </div>
      {/* The summary is the one-line version of the whole rule, so it leads rather
          than sitting under the title as a caption in the smallest available size. */}
      <p className="text-sm text-txt leading-relaxed mb-2.5">{point.summary}</p>
      {point.sections?.length
        ? <div>{point.sections.map((s, i) => <Section key={i} s={s} />)}</div>
        // whitespace-pre-line: a few rules are multi-line conjugation tables.
        : <p className="text-sm text-dim whitespace-pre-line leading-relaxed border-t border-line pt-2.5">{point.rule}</p>}
    </Card>
  );
}

/** A concept label that opens its own rule. Used as the drill header, so the
 *  thing naming what you’re practising is also the way to go read about it. */
export function RuleToggle({ pointRef, label }: {
  pointRef: { level: CEFR; title: string } | string | null; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const found = usePoint(pointRef);
  if (!found) return label ? <Kicker tone="accent">{label}</Kicker> : null;

  return (
    <div className="w-full">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-2xs text-amber font-mono uppercase tracking-widest font-semibold hover:underline">
        {label ?? `${found.level} · ${found.point.title}`}
        <HelpCircle size={12} className="flex-shrink-0" />
      </button>
      <AnimatePresence initial={false}>
        {open && <div className="mt-2.5"><RuleCard point={found.point} level={found.level} onClose={() => setOpen(false)} /></div>}
      </AnimatePresence>
    </div>
  );
}

/** Plain English for the German grammar terms the drills use as headers.
 *
 *  A drill can arrive mid-session titled „Konjunktiv II“ or „Akkusativ“ for a
 *  learner three weeks in who has never been told what a case *is*. The app names
 *  the concept in German — correct, and what their teacher says — but a name you
 *  cannot decode is not information, and the rule behind it is one tap away that
 *  nobody takes because the label reads as noise.
 *
 *  An apposition, not a replacement: the German stays the headline, because that is
 *  the word they need in class. Only terms a beginner meets cold are listed —
 *  glossing everything would turn the header back into noise from the other side. */
const TERM_GLOSS: Record<string, string> = {
  'Nominativ': 'the subject case',
  'Akkusativ': 'the direct-object case',
  'Dativ': 'the indirect-object case',
  'Genitiv': 'the possessive case',
  'Präsens': 'present tense',
  'Präteritum': 'simple past',
  'Perfekt': 'spoken past',
  'Plusquamperfekt': 'past perfect',
  'Futur I': 'future tense',
  'Futur II': 'future perfect',
  'Konjunktiv I': 'reported speech',
  'Konjunktiv II': 'would / hypothetical',
  'Partizip II': 'past participle',
  'Imperativ': 'commands',
  'Passiv': 'the passive',
  'Kasus': 'the four cases',
};

/** The gloss for a label, if it needs one. Exported for tests. */
export function termGloss(label: string): string | undefined {
  return TERM_GLOSS[label.trim()];
}

/** What an exercise is testing, and the way into its rule.
 *
 *  Rendered by the item rather than by whatever is hosting it, because only the
 *  item knows its *target*. The mixed session and the standalone drill both used
 *  to render this themselves from the drill *mode* alone, which is how a card
 *  asking for Futur I ended up offering the Perfekt rule: two call sites making
 *  the same guess, wrong on three of the seven modes. See `TENSE_POINT`.
 *
 *  Lives here rather than beside the drills because both drill files need it and
 *  they already import from each other in one direction. */
export function DrillHeader({ pointRef, label }: {
  pointRef: { level: CEFR; title: string } | string | null; label: string;
}) {
  const gloss = termGloss(label);
  return (
    <div className="text-center mb-2.5">
      <RuleToggle pointRef={pointRef} label={label} />
      {/* Lowercase and unemphasised on purpose: the German is the thing being
          learned, and this only has to stop the label reading as noise. */}
      {gloss && <span className="block text-2xs text-dim mt-0.5 normal-case">{gloss}</span>}
    </div>
  );
}

/** The "Why?" affordance shown beside a wrong answer’s explanation. Collapsed by
 *  default: a learner who already knows why shouldn’t have to scroll past it. */
export default function WhyLink({ pointRef }: { pointRef: { level: CEFR; title: string } | string | null }) {
  const [open, setOpen] = useState(false);
  const found = usePoint(pointRef);
  if (!found) return null;

  return (
    <div className="mt-2">
      {!open && (
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-amber hover:underline">
          <HelpCircle size={13} /> Why? Read the rule
        </button>
      )}
      <AnimatePresence initial={false}>
        {open && <RuleCard point={found.point} level={found.level} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
