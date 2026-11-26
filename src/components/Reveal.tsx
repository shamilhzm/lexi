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
import { useEffect, useState, type CSSProperties } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { widestRun } from '../lib/fit.ts';
import { genderColor, markColor } from '../lib/ui.ts';
import { shownTerm } from '../lib/focus.ts';
import { falseFriend } from '../lib/falseFriends.ts';
import { loadTransfer, transferFor, type TransferData } from '../lib/transfer.ts';
import { bare } from '../lib/slug.ts';
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

/** A German noun with its article inked by gender.
 *
 *  Colour-coding der/die/das is the most useful single mark on a German card, and
 *  it existed in exactly one place — the flip front — as a local map. Turning the
 *  card over lost it, and so did every drill that showed a noun. One component, so
 *  any surface with an article gets the same three colours.
 *
 *  Never the only signal: the article is always spelled out beside its colour, so
 *  the information survives for anyone who can't distinguish them. */
export function GenderTerm({ term, gender, className = '', as: Tag = 'span', id, fit = false, boxClassName = '', swash = false, marked = false, markIn = false, stack = false }: {
  term: string; gender?: string | null; className?: string;
  /** The article as a highlighter stroke in its gender's pen rather than as ink
   *  *(2026-11-26)* — for a display headword, where the article is a mark you can
   *  see from across the room. Text-size terms keep the ink. */
  swash?: boolean;
  /** The word itself highlighted in yellow: the learner saved it. */
  marked?: boolean;
  /** Draw that stroke now (the save that just happened), rather than show it. */
  markIn?: boolean;
  /** The article on its own line above the noun, at half size — the feed's poster
   *  setting. Inline, `text-wrap: balance` hyphenated *Über-raschung* to even the
   *  two lines against *die*; stacked, the noun is alone on its line and only
   *  breaks when it has to. */
  stack?: boolean;
  /** A display headword: set smaller until its longest word fits the measure, and
   *  hyphenated past that, instead of broken at whichever letter ran out of room
   *  (`.hw-fit`, lib/fit.ts). Renders a full-width block around the word — the
   *  measure — so it is for the one word a surface is about, not for a term in a
   *  line of text. Needs one of the `hw-*` size classes in `className`. */
  fit?: boolean;
  /** Classes for that block (its padding is taken out of the measure). */
  boxClassName?: string;
  /** The element to render as. A headword is a `span` on a study card, where it
   *  is the subject of a question — and an `h2` on the feed, where it is the
   *  title of the thing you are looking at and the only way a rotor can move by
   *  word rather than by control. Same ink either way. */
  as?: 'span' | 'h1' | 'h2' | 'h3';
  /** So a `section` can point `aria-labelledby` at it instead of repeating the
   *  term in a second attribute that can drift. */
  id?: string;
}) {
  const bare = shownTerm(term.replace(/^(der|die|das)\s+/i, ''));
  const word = (
    <Tag lang="de" id={id} className={fit ? `hw-fit ${className}` : className} style={fit ? fitStyle(bare) : undefined}>
      {gender && (swash
        ? <><span className={`swash${stack ? ' hw-article' : ''}`} style={{ '--swash': markColor(gender) } as CSSProperties}>{gender}</span>{' '}</>
        : <span style={{ color: genderColor(gender) }}>{gender} </span>)}
      {marked ? <span className={`swash${markIn ? ' swash-in' : ''}`}>{bare}</span> : bare}
    </Tag>
  );
  return fit ? <div className={`hw-box ${boxClassName}`}>{word}</div> : word;
}

/** A term with its article in gender ink and the rest in the text colour. A
 *  plural-only noun carries *die* with no gender, and is left uninked rather than
 *  dressed as feminine. */
export function InkedArticle({ term, gender }: { term: string; gender?: string | null }) {
  const art = /^(der|die|das)\s+/i.exec(term)?.[1];
  if (!art) return <>{shownTerm(term)}</>;
  return (
    <>
      <span style={gender ? { color: genderColor(gender) } : undefined}>{art} </span>
      {shownTerm(term.slice(art.length + 1))}
    </>
  );
}

/** The one number `.hw-fit` needs: the widest run a line cannot break inside. */
export function fitStyle(text: string): CSSProperties {
  return { '--hw-em': widestRun(text) } as CSSProperties;
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
 *  translation indented beneath. Silent since 2026-11-26 (VISION, *Lexi is
 *  silent*): the speaker that travelled with the last word went with the voices. */
export function ExampleList({ items, max = 2 }: { items: Example[]; max?: number }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.slice(0, max).map((e, k) => {
        return (
          <li key={k} className="text-sm leading-relaxed">
            <span lang="de" className="text-txt">{e.de}</span>
            {e.en && <span className="block text-dim italic pl-3.5 mt-0.5">{e.en}</span>}
          </li>
        );
      })}
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
          Looks like <span className="text-txt font-semibold">“{ff.looksLike}”</span>, but it means{' '}
          <span className="text-txt font-semibold">{ff.actually}</span>.
          <span className="block text-dim mt-0.5">
            For “{ff.looksLike}” say <span lang="de" className="text-txt">{ff.insteadSay}</span>.
          </span>
        </span>
      </p>
    </RevealBlock>
  );
}

/** What the word has to do with English (VISION, *The transfer line*).
 *
 *  An English speaker arrives owning part of German, and until 2026-11-21 nothing
 *  in Lexi said so: *Wasser* was taught as if *water* were a coincidence. One line,
 *  and a second when the spelling follows a pattern that holds across enough of the
 *  corpus to be worth learning (German z is often English t: Salz · salt, zehn · ten).
 *
 *  On the reveal, never the front, where it would answer the drill. Silent where a
 *  curated false-friend note already speaks about the English word, and silent
 *  until the file arrives: it is a detail, and a missing one says nothing. */
export function TransferNote({ term }: { term: string }) {
  const [data, setData] = useState<TransferData | null>(null);
  useEffect(() => {
    let live = true;
    void loadTransfer().then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, []);
  const t = transferFor(data, term, bare(term));
  if (!t || (t.kind !== 'b' && !t.en) || falseFriend(term)) return null;
  return (
    <RevealBlock label="English">
      <p className="text-sm leading-relaxed text-dim">
        {t.kind === 'b'
          ? <>Borrowed from English{t.en && <> <span className="text-txt font-semibold">{t.en}</span></>}.</>
          : <>Related to English <span className="text-txt font-semibold">{t.en}</span>.</>}
      </p>
      {t.rule && (
        <p className="text-sm leading-relaxed text-dim mt-0.5">
          German <span lang="de" className="text-txt font-semibold">{t.rule.de}</span> is often
          English <span className="text-txt font-semibold">{t.rule.en}</span>:{' '}
          {t.rule.ex.map(([d, e], i) => (
            <span key={d}>{i > 0 && ', '}<span lang="de" className="text-txt">{d}</span> · {e}</span>
          ))}.
        </p>
      )}
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
            <span className="text-dim"> · {band.note}.</span>
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

// `Derivation` and `Paradigm` lived here until 2026-09-05 — a formula for how a
// form is built, and the full six-person conjugation table shown on a miss. They
// were the reveal layer of the tense, Kasus and separable drills, all of which
// went with the grammar syllabus. Nothing left in the app has six persons to show.
// Git history holds them; they were good.
