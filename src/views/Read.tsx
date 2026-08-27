// Lesen — the input half of the app, and now a destination.
//
// ## Why it is a tab
//
// Everything else in Lexi asks the learner a question. This is the one surface
// that just hands them German. It shipped in two halves that had never met:
// `ReadingList` (sentences from your own cards, picked by the matcher) lived
// inside a **collapsed accordion on Today**, and the comprehension meter — which
// BACKLOG calls the flagship — was a second card *inside that accordion*, opening
// a route with a back arrow. Two taps and a guess to reach the feature the
// roadmap leads with.
//
// They are one place now, in the order a learner meets them: sentences you can
// already almost read, then a text of your own to measure.
//
// ## The meter — BACKLOG Now #2 Phase 1, the surface half.
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
import { Sparkle, Bookmark, X } from 'lucide-react';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { coverageOf, unlocksToReach, ASSISTED, INDEPENDENT, type Coverage, type WordState } from '../lib/coverage.ts';
import { cardOf, savedTexts, saveText, removeText } from '../store.ts';
import { useStore } from '../useStore.ts';
import { State } from '../srs.ts';
import ReadingList from '../components/ReadingList.tsx';
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
// learner has not met as `text-accent underline decoration-dotted`, and this is the
// same idea on a longer text. Known words stay plain ink — the gaps are what the
// eye should catch, and a passage where every readable word is coloured is a
// passage nobody reads. There is no `--color-blue` in this theme; `--color-accent`
// *is* the Atlas blue.
const TINT: Record<string, string> = {
  known: 'text-txt',
  learning: 'text-accent font-semibold',
  new: 'text-accent underline decoration-dotted underline-offset-4',
  absent: 'text-dim line-through decoration-dim/50',
};

const BAND_COPY = {
  independent: { label: 'You can read this on your own', tone: 'text-green' },
  assisted: { label: 'Readable with a dictionary nearby', tone: 'text-accent' },
  frustrational: { label: 'Too many gaps to read comfortably yet', tone: 'text-dim' },
} as const;

export default function Read({ onStudy }: { onStudy: (t: Target) => void }) {
  const v = useStore();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [selected, setSelected] = useState<Word | null>(null);
  const [saved, setSaved] = useState(false);

  // The live meter. Recomputed against today's FSRS state on every store change —
  // that is the feature: the shelf moves while you study, without the learner
  // re-pasting anything. `v` is the store version, so a review re-runs this.
  const shelf = useMemo(
    () => savedTexts().map((t) => ({ text: t, cov: coverageOf(t.body, { stateOf }) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v],
  );

  const cov: Coverage | null = useMemo(
    () => (submitted.trim() ? coverageOf(submitted, { stateOf }) : null),
    [submitted],
  );
  const plan = useMemo(() => (cov ? unlocksToReach(cov, ASSISTED) : null), [cov]);

  const pct = cov ? Math.round(cov.ratio * 100) : 0;
  const band = cov ? BAND_COPY[cov.band] : null;

  return (
    <div className="mx-auto w-full max-w-[720px] flex flex-col gap-4">
      <div>
        {/* The nav says "Read"; the page said "Lesen". Four of the five primary
            surfaces are titled in German — which is right for an app whose subject is
            German, and which taught nothing while the label that got you here was a
            different word in a different language. The eyebrow is the pairing, using
            the kicker treatment already above every section on these pages. */}
        <Kicker className="block mb-0.5">Read</Kicker>
        <h1 lang="de" className="display text-3xl sm:text-4xl mb-1">Lesen</h1>
        <p className="text-dim text-xs">
          The half of the app that doesn’t test you. Sentences built from words you already have,
          and a meter for anything you bring.
        </p>
      </div>

      {/* Sentences first. They need nothing from the learner — no paste, no
          decision — and they are the honest answer to "can I read German yet?"
          on a day when the answer is *some of it*. The scan runs on mount; it
          used to be deferred behind an accordion, which is the only reason it
          was deferred at all.

          Two sections, two headings. The page has real structure now, so a
          screen reader can jump between the halves and an eye scrolling past
          four sentences meets a heading rather than a wall. */}
      <section aria-labelledby="lesen-sentences">
        <h2 id="lesen-sentences" className="text-lg font-bold mb-2">Sentences you can almost read</h2>
        <ReadingList onStudy={onStudy} limit={4} />
      </section>

      <h2 id="lesen-meter" className="text-lg font-bold -mb-1">Can I read this?</h2>
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
                     focus:border-accent focus:outline-none"
          placeholder="Die Bundesregierung hat heute ein neues Gesetz beschlossen …"
        />
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={() => { setSubmitted(text); setSelected(null); }} disabled={!text.trim()}>
            Measure it
          </Button>
          {submitted && (
            <Button variant="quiet" size="sm" onClick={() => { setText(''); setSubmitted(''); setSelected(null); setSaved(false); }}>
              Clear
            </Button>
          )}
          {submitted && (
            <Button variant="secondary" size="sm" disabled={saved}
              onClick={() => { saveText(snippet(submitted, 60), submitted); setSaved(true); }}>
              <Bookmark size={14} /> {saved ? 'Saved' : 'Save this text'}
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
                                 px-3 py-2 text-sm hover:border-accent transition-colors">
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
      {shelf.length > 0 && (
        <Card tone="panel" pad="md">
          <Kicker><Bookmark size={12} /> Your texts</Kicker>
          <p className="mt-1 text-xs text-dim">These move on their own as you study.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {shelf.map(({ text: t, cov: c }) => (
              <li key={t.id} className="flex items-center gap-3">
                <button
                  onClick={() => { setText(t.body); setSubmitted(t.body); setSelected(null); setSaved(true); }}
                  className="tap-44 flex-1 flex items-center gap-3 rounded-md border border-line bg-panel2
                             px-3 py-2 text-left hover:border-accent transition-colors">
                  <span className={`font-mono text-sm font-bold w-12 flex-shrink-0 ${BAND_COPY[c.band].tone}`}>
                    {Math.round(c.ratio * 100)}%
                  </span>
                  <span className="flex-1 min-w-0">
                    <span lang="de" className="block text-sm truncate">{t.title}</span>
                    {/* `learning` is shown here and not only in the detail view:
                        one grade moves a card to Learning, not Review, so without
                        this line a learner who just studied three of these words
                        would come back to a shelf that looks untouched. */}
                    <span className="block text-2xs text-dim">
                      {c.known} of {c.counted} words
                      {c.learning > 0 && <> · {c.learning} learning</>}
                      {c.ratio < ASSISTED && <> · {c.toAssisted} to go</>}
                    </span>
                  </span>
                </button>
                <button onClick={() => removeText(t.id)} aria-label={`Remove ${t.title}`}
                  className="tap-hit text-dim hover:text-red transition-colors flex-shrink-0">
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** A short label for the text, for the session's "because you want to read …". */
function snippet(text: string, max = 42): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + '…';
}
