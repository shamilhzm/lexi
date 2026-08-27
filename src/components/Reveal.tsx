// The reveal — the shared vocabulary for "here is the answer".
//
// Lexi had two wildly different answers to the same moment. Flip a card and you
// got a translation, a definition, two bilingual examples, synonyms and antonyms.
// Answer a transformation drill and you got `✗ Answer: du wirst müssen` and a Next
// button. Same instant in the learning loop — the one where the encoding actually
// happens — and one surface did nine times the teaching of the other.
//
// These are the pieces both surfaces build from, so the *anatomy* is consistent
// even though the presentation isn't: a flip back is a card face you read, a drill
// reveal is a block that grows under an exercise. Making the drill literally
// flippable would have been the wrong fix — an exercise is already graded by the
// time it resolves, so there is nothing behind it to turn over, and a flip
// affordance would invite flipping *before* answering, which destroys the
// retrieval attempt the drill exists to create.
import { useEffect, useState } from 'react';
import { Info, TriangleAlert, Volume2 } from 'lucide-react';
import { speak } from '../lib/tts.ts';
import { genderColor } from '../lib/ui.ts';
import { falseFriend } from '../lib/falseFriends.ts';
import { loadProvenance, freqBand, exampleCitation, levelBasis, type Provenance } from '../lib/provenance.ts';
import Kicker from './ui/Kicker.tsx';
import type { Example } from '../types.ts';

/** Keyboard for a multiple-choice item: 1–n picks an option, Enter advances.
 *
 *  The flip card has had documented shortcuts (Space, ←, →) since the coach marks
 *  were written — and the seven drill types had none, so those marks advertised
 *  keys that worked on one of eight card kinds. Every option was reachable by Tab,
 *  but nothing let you answer without walking the list, and after answering the
 *  Next button had to be tabbed to as well.
 *
 *  Deliberately ignores keys while a control or text field has focus, matching the
 *  session player's own rule: Enter belongs to the focused button first. */
export function useChoiceKeys({ count, answered, onPick, onNext }: {
  count: number; answered: boolean; onPick: (i: number) => void; onNext: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Enter') {
        if (t && (t.tagName === 'BUTTON' || t.closest?.('button, a, select'))) return;
        if (answered) { e.preventDefault(); onNext(); }
        return;
      }
      if (answered) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= count) { e.preventDefault(); onPick(n - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, answered, onPick, onNext]);
}

/** Speak one German string. Small by design: these sit inline beside text rather
 *  than acting as a primary control, so they take the 24px WCAG 2.5.8 floor
 *  rather than the 44px one `IconButton` enforces for standalone targets. */
export function SpeakButton({ text, label }: { text: string; label?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(text); }}
      aria-label={label ?? `Hear “${text}” in German`}
      // `tap-hit` rather than a bigger box: the speaker sits inline beside a
      // sentence at 24px by design, and growing it for real would push the
      // reveal's typography around. The target reaches 44px, the ink does not
      // move. These never sit adjacent to another control, so the enlarged area
      // cannot overlap a neighbour's.
      // `inline-grid`, not `grid`: this sits *inside* the sentence paragraph in
      // Lesen, and a block-level grid box breaks to its own line — so every
      // near-miss sentence card carried an orphaned speaker icon on a line of its
      // own, and the `align-middle` two lines down had nothing to act on. The
      // comment above already said "inline"; only the class disagreed.
      className="tap-hit inline-grid place-items-center w-6 h-6 rounded-sm text-dim hover:text-accent
        active:scale-95 transition-colors flex-shrink-0 align-middle">
      <Volume2 size={14} />
    </button>
  );
}

/** A German noun with its article inked by gender.
 *
 *  Colour-coding der/die/das is the most useful single mark on a German card, and
 *  it existed in exactly one place — the flip front — as a local map. Turning the
 *  card over lost it, and so did every drill that showed a noun. One component, so
 *  any surface with an article gets the same three colours.
 *
 *  Never the only signal: the article is always spelled out beside its colour, so
 *  the information survives for anyone who can't distinguish them. */
export function GenderTerm({ term, gender, className = '' }: {
  term: string; gender?: string | null; className?: string;
}) {
  const bare = term.replace(/^(der|die|das)\s+/i, '');
  return (
    <span lang="de" className={className}>
      {gender && <span style={{ color: genderColor(gender) }}>{gender} </span>}
      {bare}
    </span>
  );
}

/** A labelled block, separated by a hairline rather than by whitespace alone.
 *
 *  The old back face stacked five different kinds of information — translation,
 *  definition, examples, synonyms, antonyms — as five centred spans with a uniform
 *  `gap-2.5` between them. Nothing said which was which, so the definition sat in
 *  the visual position of a subtitle and read as a *second translation*. */
export function RevealBlock({ label, children, className = '' }: {
  label?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`pt-3 mt-3 border-t border-line ${className}`}>
      {label && <Kicker className="block mb-1.5">{label}</Kicker>}
      {children}
    </div>
  );
}

/** Worked examples, as a dictionary sets them: the German on the line, its
 *  translation indented beneath. Each German string is speakable — the moment you
 *  learn what a word means is the moment you most want to hear it used, and the
 *  front's pronunciation button disappeared on flip. */
export function ExampleList({ items, max = 2 }: { items: Example[]; max?: number }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.slice(0, max).map((e, k) => (
        <li key={k} className="text-sm leading-relaxed">
          <span lang="de" className="text-txt">{e.de}</span>{' '}
          <SpeakButton text={e.de} label={`Hear the example “${e.de}”`} />
          {e.en && <span className="block text-dim italic pl-3.5 mt-0.5">{e.en}</span>}
        </li>
      ))}
    </ul>
  );
}

/** The false-friend warning.
 *
 *  Placed on the reveal rather than the front, because the front is the moment the
 *  learner is *guessing* — and the guess this catches is the one their English
 *  makes for them. Naming it a beat later, next to the real meaning, is what
 *  attaches the correction to the word.
 *
 *  Three lines, and the third is the one that matters: a warning without a
 *  replacement leaves a hole where the learner wanted a word. */
export function FalseFriendNote({ term }: { term: string }) {
  const ff = falseFriend(term);
  if (!ff) return null;
  return (
    <RevealBlock label="False friend">
      <p className="text-sm leading-relaxed flex gap-2">
        <TriangleAlert size={14} className="text-accent flex-shrink-0 mt-0.5" aria-hidden />
        <span>
          Looks like <span className="text-txt font-semibold">“{ff.looksLike}”</span> — it means{' '}
          <span className="text-txt font-semibold">{ff.actually}</span>.
          <span className="block text-dim mt-0.5">
            For “{ff.looksLike}” say <span lang="de" className="text-txt">{ff.insteadSay}</span>.
          </span>
        </span>
      </p>
    </RevealBlock>
  );
}

/** Where this card came from — collapsed, and silent when there is nothing to say.
 *
 *  Two questions this answers, from opposite ends of the app's audience: a C1
 *  learner's "is this word actually used?", and a teacher's "where did this
 *  sentence come from and what does B1 mean here?". Both were answerable from
 *  `provenance.json`, which has shipped since the pipeline was written and was
 *  never loaded.
 *
 *  Behind a disclosure because it is a detail, not part of the loop — and because
 *  that keeps the 609 KB unfetched for everyone who never asks. Renders nothing at
 *  all for the 73% of cards with no provenance recorded, rather than showing an
 *  empty section: a card that cannot answer the question should not raise it. */
export function CardSource({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [prov, setProv] = useState<Provenance | null | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let live = true;
    loadProvenance().then((m) => { if (live) setProv(m.get(id) ?? null); });
    return () => { live = false; };
  }, [open, id]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="tap-hit mt-3 self-start inline-flex items-center gap-1 text-2xs text-dim hover:text-accent transition-colors">
        <Info size={12} /> Where this came from
      </button>
    );
  }
  if (prov === undefined) return <RevealBlock label="Source"><p className="text-xs text-dim">Loading…</p></RevealBlock>;
  if (prov === null) {
    return (
      <RevealBlock label="Source">
        <p className="text-xs text-dim">No source recorded for this card.</p>
      </RevealBlock>
    );
  }

  const band = freqBand(prov.freqRank);
  const cite = exampleCitation(prov.exampleSource);
  return (
    <RevealBlock label="Source">
      <div className="space-y-1.5 text-xs">
        {band && (
          <p>
            <span className="text-txt font-semibold">{band.label}</span>
            <span className="text-dim"> — {band.note}.</span>
          </p>
        )}
        <p className="text-dim">{prov.level} · {levelBasis(prov.levelSource)}.</p>
        {cite && (
          <p className="text-dim">
            Example from{' '}
            {cite.url
              ? <a href={cite.url} target="_blank" rel="noopener noreferrer"
                  className="text-accent hover:underline">{cite.label}</a>
              : cite.label}.
          </p>
        )}
      </div>
    </RevealBlock>
  );
}

/** Related German terms behind a mono label (SYN / OPP).
 *
 *  Prose labels ("Synonyms:", "Opposite:") were the only sentence-case labels on a
 *  surface whose every other label is a mono kicker. */
export function TermList({ label, terms, tone = 'txt' }: {
  label: string; terms: string[]; tone?: 'txt' | 'red';
}) {
  if (!terms.length) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
      <Kicker className="flex-shrink-0">{label}</Kicker>
      <span lang="de" className={tone === 'red' ? 'text-red-txt' : 'text-txt'}>{terms.join(', ')}</span>
    </p>
  );
}

/** How the answer is built, as a formula: `wirst + müssen`.
 *
 *  This is the beat that was missing everywhere. A drill would state a verdict —
 *  "Answer: du wirst müssen" — which tells a learner *what* without ever telling
 *  them *why*, on the one screen where they are already paying full attention. */
export function Derivation({ parts, note }: { parts: string[]; note?: string }) {
  return (
    <div>
      <p lang="de" className="font-mono text-sm text-txt flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-dim">+</span>}
            <span>{p}</span>
          </span>
        ))}
      </p>
      {note && <p className="text-dim text-xs mt-1">{note}</p>}
    </div>
  );
}

/** The full six-person paradigm, laid out the way a German table is —
 *  singular in the left column, plural in the right.
 *
 *  `conjugate()` has computed all six forms all along and the drills used exactly
 *  one of them, then threw the rest away. Showing them at the moment of a miss is
 *  the difference between being corrected and being taught. */
export function Paradigm({ rows }: { rows: [string, string][] }) {
  const order = [0, 3, 1, 4, 2, 5]; // ich·wir / du·ihr / er·sie
  return (
    <div lang="de" className="grid grid-cols-2 gap-x-5 gap-y-1 font-mono text-xs">
      {order.map((i) => {
        const r = rows[i];
        if (!r) return null;
        return (
          <p key={i} className="flex gap-1.5 min-w-0">
            <span className="text-dim flex-shrink-0 w-8">{r[0]}</span>
            <span className="text-txt truncate">{r[1]}</span>
          </p>
        );
      })}
    </div>
  );
}
