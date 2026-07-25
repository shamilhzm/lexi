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
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, HelpCircle, X } from 'lucide-react';
import { loadGrammar, findPoint, parsePointId, type GPoint } from '../lib/grammar.ts';
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

/** The rule card itself. `level` heads it so the learner can see whether this is
 *  something they’re meant to know yet. */
export function RuleCard({ point, level, onClose }: { point: GPoint; level: CEFR; onClose?: () => void }) {
  return (
    <Card as={motion.div} tone="sunken" nested pad="none"
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      className="p-4 text-left">
      <div className="flex items-start gap-2 mb-1.5">
        <BookOpen size={15} className="text-amber flex-shrink-0 mt-0.5" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold">{point.title}</span>
          <Kicker tone="accent" className="block">{level}</Kicker>
        </span>
        {onClose && (
          <IconButton label="Close rule" pull onClick={onClose}><X size={15} /></IconButton>
        )}
      </div>
      <p className="text-xs text-dim mb-2">{point.summary}</p>
      {/* whitespace-pre-line: several rules are multi-line conjugation tables. */}
      <p className="text-sm text-txt whitespace-pre-line leading-relaxed">{point.rule}</p>
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
