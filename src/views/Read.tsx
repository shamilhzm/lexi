// The comprehension meter — BACKLOG Now #2 Phase 1, the surface half.
//
// Paste anything German and it answers one question: *can I read this yet?* The
// arithmetic lives in `lib/coverage.ts`; this file is about not lying with it.
//
// ## Why the count sits next to the percentage
//
// "87%" is a grade. "142 of 163 words — 13 more to reach 95%" is a plan. The
// backlog's phrasing is "honestly and with the count, not just a percentage", and
// the count is what turns the number into the unlock list underneath it.
//
// ## Why the ceiling is shown at all
//
// A text can be unreachable: if a tenth of it is words Lexi has never heard of, no
// amount of studying moves it past 90%. Saying so is the difference between an
// honest meter and one that offers a study set that cannot deliver what it implies.
import { useMemo, useState } from 'react';
import { BookOpen, ArrowLeft, Sparkle } from 'lucide-react';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { coverageOf, unlocksToReach, ASSISTED, INDEPENDENT, type Coverage, type WordState } from '../lib/coverage.ts';
import { cardOf } from '../store.ts';
import { State } from '../srs.ts';
import type { Target, Word } from '../types.ts';

/** FSRS state → the three buckets the meter reasons about.
 *
 *  `learning` deliberately does **not** count toward coverage: a word you are
 *  still getting wrong is not one you can read past. It is shown separately so the
 *  learner can see the number is about to move on its own. */
function stateOf(w: Word): WordState {
  const c = cardOf(w.id);
  if (!c || c.state === State.New) return 'new';
  return c.state === State.Review ? 'known' : 'learning';
}

// Matched to Lesen rather than invented: `ReadingList` already marks a word the
// learner has not met as `text-amber underline decoration-dotted`, and this is the
// same idea on a longer text. Known words stay plain ink — the gaps are what the
// eye should catch, and a passage where every readable word is coloured is a
// passage nobody reads. There is no `--color-blue` in this theme; `--color-amber`
// *is* the Atlas blue.
const TINT: Record<string, string> = {
  known: 'text-txt',
  learning: 'text-amber font-semibold',
  new: 'text-amber underline decoration-dotted underline-offset-4',
  absent: 'text-dim line-through decoration-dim/50',
};

const BAND_COPY = {
  independent: { label: 'You can read this on your own', tone: 'text-green' },
  assisted: { label: 'Readable with a dictionary nearby', tone: 'text-amber' },
  frustrational: { label: 'Too many gaps to read comfortably yet', tone: 'text-dim' },
} as const;

export default function Read({ onExit, onStudy }: { onExit: () => void; onStudy: (t: Target) => void }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [selected, setSelected] = useState<Word | null>(null);

  const cov: Coverage | null = useMemo(
    () => (submitted.trim() ? coverageOf(submitted, { stateOf }) : null),
    [submitted],
  );
  const plan = useMemo(() => (cov ? unlocksToReach(cov, ASSISTED) : null), [cov]);

  const pct = cov ? Math.round(cov.ratio * 100) : 0;
  const band = cov ? BAND_COPY[cov.band] : null;

  return (
    <div className="mx-auto w-full max-w-[720px] flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button onClick={onExit} className="tap-hit text-dim hover:text-amber transition-colors" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <Kicker><BookOpen size={12} /> Can I read this?</Kicker>
      </div>

      <Card tone="panel" pad="md">
        <label htmlFor="read-input" className="block text-sm text-dim mb-2">
          Paste any German text — an article, an email, a page of a book.
        </label>
        <textarea
          id="read-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          lang="de"
          className="w-full rounded-md bg-panel2 border border-line p-3 text-sm leading-relaxed
                     focus:border-amber focus:outline-none"
          placeholder="Die Bundesregierung hat heute ein neues Gesetz beschlossen …"
        />
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={() => { setSubmitted(text); setSelected(null); }} disabled={!text.trim()}>
            Measure it
          </Button>
          {submitted && (
            <Button variant="quiet" size="sm" onClick={() => { setText(''); setSubmitted(''); setSelected(null); }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {cov && cov.counted === 0 && (
        <Card tone="panel" pad="md">
          <p className="text-sm text-dim">No German content words found — check the text and try again.</p>
        </Card>
      )}

      {cov && cov.counted > 0 && band && (
        <>
          <Card tone="panel" pad="md">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-mono text-4xl font-bold">{pct}%</span>
              <span className={`text-sm font-semibold ${band.tone}`}>{band.label}</span>
            </div>
            {/* The count, next to the percentage, always. */}
            <p className="mt-2 text-sm text-dim">
              <b className="text-txt">{cov.known}</b> of {cov.counted} content words known
              {cov.learning > 0 && <> · {cov.learning} still learning</>}
              {cov.absent > 0 && <> · {cov.absent} Lexi doesn’t teach yet</>}
            </p>
            <p className="mt-1 text-sm text-dim">
              {cov.ratio >= INDEPENDENT
                ? 'Past 98% — this reads without help.'
                : cov.ratio >= ASSISTED
                  ? <>{cov.toIndependent} more {cov.toIndependent === 1 ? 'word' : 'words'} to read it without help.</>
                  : <>{cov.toAssisted} more {cov.toAssisted === 1 ? 'word' : 'words'} to reach the 95% mark.</>}
            </p>
            {/* Honesty about the cap, when there is one worth saying. */}
            {cov.ceiling < ASSISTED && (
              <p className="mt-2 text-xs text-dim border-t border-line pt-2">
                Even knowing every word Lexi teaches, this text tops out at{' '}
                <b className="text-txt">{Math.round(cov.ceiling * 100)}%</b> — the rest are words
                the corpus doesn’t carry.
              </p>
            )}
          </Card>

          {plan && plan.picks.length > 0 && (
            <Card tone="panel" pad="md">
              <Kicker><Sparkle size={12} /> The words that get you there</Kicker>
              <p className="mt-1 text-sm text-dim">
                {plan.reaches
                  ? <>Learn these {plan.picks.length} and this text crosses 95%.</>
                  : <>These {plan.picks.length} help most — but this text can’t reach 95% on the corpus as it stands.</>}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {plan.picks.map((u) => (
                  <li key={u.word.id}>
                    <button
                      onClick={() => setSelected(u.word)}
                      className="tap-44 flex items-center gap-2 rounded-md border border-line bg-panel2
                                 px-3 py-2 text-sm hover:border-amber transition-colors">
                      <span lang="de" className="font-semibold">{u.word.term}</span>
                      {u.occurrences > 1 && <span className="text-2xs text-dim">×{u.occurrences}</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <Button onClick={() => onStudy({
                  kind: 'custom',
                  name: 'Unlock this text',
                  ids: plan.picks.map((u) => u.word.id),
                  // The reason the scheduler will show: the learner's own text.
                  unlockText: snippet(submitted),
                } as Target)}>
                  Study these {plan.picks.length}
                </Button>
              </div>
            </Card>
          )}

          <Card tone="panel" pad="md">
            <Kicker>Your reading of it</Kicker>
            <p lang="de" className="mt-2 text-base leading-loose">
              {cov.tokens.map((t, i) =>
                t.isWord && t.counted
                  ? (
                    <button
                      key={i}
                      onClick={() => t.word && setSelected(t.word)}
                      disabled={!t.word}
                      className={`${TINT[t.state ?? 'absent']} ${t.word ? 'hover:bg-panel2 rounded-sm' : 'cursor-default'}`}>
                      {t.text}
                    </button>
                  )
                  : <span key={i} className={t.isWord ? 'text-dim' : ''}>{t.text}</span>,
              )}
            </p>
            {/* The key uses the same classes as the passage, so it cannot drift
                out of sync with what is actually on screen. */}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-dim border-t border-line pt-2">
              <span className={TINT.known}>known</span>
              <span className={TINT.learning}>learning</span>
              <span className={TINT.new}>new — Lexi teaches it</span>
              <span className={TINT.absent}>not in the corpus</span>
              <span>grammar words and names — not counted</span>
            </p>
          </Card>

          {selected && (
            <Card tone="card" pad="md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p lang="de" className="font-serif text-xl font-bold">{selected.term}</p>
                  <p className="text-sm text-dim">{selected.en}</p>
                  {selected.plural && (
                    <p className="mt-1 text-2xs text-dim">plural: <span lang="de">{selected.plural}</span></p>
                  )}
                </div>
                <Button variant="quiet" size="sm" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/** A short label for the text, for the session's "because you want to read …". */
function snippet(text: string, max = 42): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + '…';
}
