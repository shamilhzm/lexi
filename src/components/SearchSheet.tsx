// "What does this word mean?" — from anywhere in the app.
//
// This is the question people actually reach for a phone to answer, and until
// now Lexi could only answer it from inside one tab. That is a tap too many
// against Google Translate, which is one tap from everywhere, and losing that
// race means losing the moment the learner was *most* curious.
//
// A sheet rather than a route: you asked it from wherever you were, and closing
// it has to put you back exactly there — mid-scroll in the feed, mid-card in a
// session. A route would rebuild both.
//
// ## Two layers, and they must never look alike
//
// The results come from two places. **Cards** are what Lexi teaches — 6,520 of
// them, every one machine-verified by `authoring:new`, studiable and drillable.
// **Dictionary entries** are what Lexi can answer — ~93,000 headwords imported
// wholesale from Wiktionary, gated only on having a gloss.
//
// Cards come first and always. The dictionary section is separately headed, uses
// a different affordance, and offers no way to study anything: the corpus's
// entire value is that everything in it was verified, and the moment an
// unverified gloss can be drilled that is gone. See docs/DICTIONARY.md.
//
// ## The interesting case is the miss
//
// A learner who looks up a word and gets nothing — from *either* layer — has
// told us something no analytics package could: that word was worth interrupting
// themselves for, and neither the corpus nor Wiktionary has it. `noteWanted`
// records it, Profile lists it, and the export feeds `authoring:new` — which is
// machine-gated and will refuse anything it cannot verify against de.wiktionary.
// So the copy says the word was **noted**, never that it will be added: whether
// it becomes a card is decided by a lookup on a maintainer's machine, not by
// wanting it.
//
// A dictionary entry gets the same button, and that is the point of building the
// layer this way round: looking a word up is now how it becomes a candidate
// card, and the learner doing the looking is the one who found it.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Volume2, Check, Plus } from 'lucide-react';
import { search, MAX_HITS, MIN_QUERY } from '../lib/search.ts';
import { lookupLex, lexiconSize, primeLexicon, type LexEntry } from '../lib/lexicon.ts';
import { statusOf, isWanted, noteWanted } from '../store.ts';
import { useStore } from '../useStore.ts';
import { speak } from '../lib/tts.ts';
import { genderColor, haptic, fmt } from '../lib/ui.ts';
import { WORDS } from '../data/index.ts';
import WordDetail from './WordDetail.tsx';
import Chip from './ui/Chip.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Word } from '../types.ts';

export default function SearchSheet({ onClose }: { onClose: () => void }) {
  const v = useStore();
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<Word | null>(null);
  const [noted, setNoted] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => search(q), [q]);
  const asking = q.trim().length >= MIN_QUERY;

  // The dictionary is a fetch, so it lags the card list by a moment and has to
  // be allowed to. Debounced because a shard per keystroke is a shard per
  // keystroke, and guarded by the query it was asked for so a slow answer to
  // "Hau" can never render under "Haus".
  const [lex, setLex] = useState<{ q: string; entries: LexEntry[]; via?: string }>({ q: '', entries: [] });
  useEffect(() => {
    if (!asking) { setLex({ q: '', entries: [] }); return; }
    const term = q.trim();
    const t = setTimeout(() => {
      void lookupLex(term).then((r) => setLex({ q: term, ...r }));
    }, 180);
    return () => clearTimeout(t);
  }, [q, asking]);
  const lexEntries = lex.q === q.trim() ? lex.entries : [];

  // **When the dictionary resolves an inflection, ask the corpus again.**
  // `search()` ranks strings and knows nothing about German morphology, so
  // typing `Häuser` finds no card — and the sheet then said "not a Lexi card"
  // under an entry for *das Haus*, which is card A1 and one of the first words
  // the app teaches. The dictionary has just worked out the lemma; handing it
  // back to the card search costs one more string match and stops the two layers
  // contradicting each other.
  const lemma = lex.via && lexEntries[0] ? lexEntries[0].w : null;
  const lemmaHits = useMemo(
    () => (lemma && hits.length === 0 ? search(lemma) : []), [lemma, hits.length]);
  const cardHits = hits.length ? hits : lemmaHits;
  const taught = useMemo(
    () => new Set(cardHits.map((w) => w.term.replace(/^(der|die|das)\s+/i, '').toLowerCase())),
    [cardHits]);

  const nothing = asking && cardHits.length === 0 && lexEntries.length === 0;

  useEffect(() => {
    // One small request now so the first real lookup is a single round-trip
    // rather than two. The shards themselves stay untouched until asked for.
    primeLexicon();
    // Focus without scrolling the page behind the portal.
    input.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !detail) onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, detail]);

  // A new query is a new question; the "noted" acknowledgement belongs to the
  // old one.
  useEffect(() => { setNoted(false); }, [q]);

  const already = isWanted(q) || noted;

  return createPortal(
    <div className="fixed inset-0 z-[190] bg-bg flex flex-col sheet-in" role="dialog" aria-modal="true"
      aria-label="Look up a German word">

      {/* The field is the header. Nothing above it, because the only reason this
          sheet exists is to be typed into. */}
      <div className="flex-shrink-0 safe-top px-3 pt-2 pb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
          <input
            ref={input} id="global-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search"
            aria-label="Look up a German or English word"
            placeholder="German or English — umlauts optional"
            className="w-full tap-44 rounded-full bg-panel2 border border-line pl-9 pr-9 py-2.5 text-base
                       outline-none focus:border-accent" />
          {q && (
            <button onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Clear"
              className="absolute right-1 top-1/2 -translate-y-1/2 tap-44 grid place-items-center w-9 text-dim hover:text-txt">
              <X size={16} />
            </button>
          )}
        </div>
        <button onClick={onClose}
          className="tap-44 px-2 text-sm text-accent font-semibold flex-shrink-0">Done</button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-10">
        {!asking && (
          <p className="text-dim text-sm text-center px-8 mt-16 leading-relaxed max-w-[34ch] mx-auto">
            Type a German word to see what it means, or an English one to find the German.
            {lexiconSize() > 0 && <> Lexi teaches {fmt(WORDS.length)} words and can look up {fmt(lexiconSize())}.</>}
          </p>
        )}

        {asking && cardHits.length > 0 && (
          <>
            <Kicker className="block mb-2 mt-1">
              {hits.length === 0
                ? <>Lexi teaches · {q.trim()} is a form of</>
                : hits.length === MAX_HITS ? `first ${MAX_HITS} taught` : `${hits.length} Lexi teaches`}
            </Kicker>
            <ul className="divide-y divide-line rounded-lg border border-line overflow-hidden bg-panel">
              {cardHits.map((w) => (
                <li key={w.id}>
                  <button onClick={() => setDetail(w)}
                    className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-panel2 transition-colors">
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline gap-1.5 flex-wrap">
                        <span lang="de" className="headword text-base font-semibold break-words"
                          style={{ color: genderColor(w.gender) }}>{w.term}</span>
                        <span className="font-mono text-2xs text-dim">{w.level}</span>
                      </span>
                      <span className="block text-xs text-dim truncate">{w.en}</span>
                    </span>
                    <StatusChip id={w.id} version={v} />
                    <span onClick={(e) => { e.stopPropagation(); speak(w.term); }}
                      role="button" tabIndex={-1} aria-hidden
                      className="grid place-items-center w-9 h-9 rounded-full text-dim hover:text-accent flex-shrink-0">
                      <Volume2 size={15} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* The dictionary. Below the cards, always, and built so it cannot be
            mistaken for them: its own heading that says where it came from, a
            quieter surface, and no way in to studying anything. */}
        {asking && lexEntries.length > 0 && (
          <section className="mt-5">
            <Kicker className="block mb-2">
              {lex.via ? <>from the dictionary · {lex.via} is a form of</> : 'from the dictionary'}
            </Kicker>
            <ul className="divide-y divide-line rounded-lg border border-line overflow-hidden bg-panel2">
              {lexEntries.map((e, k) => (
                <li key={`${e.w}-${e.p}-${k}`} className="px-3.5 py-3">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span lang="de" className="headword text-base font-semibold break-words"
                      style={{ color: genderColor(e.x) }}>
                      {e.x ? `${e.x} ${e.w}` : e.w}
                    </span>
                    <span className="text-2xs text-dim">{e.p}</span>
                    {e.i && <span className="font-mono text-2xs text-dim">/{e.i}/</span>}
                    <span onClick={() => speak(e.w)} role="button" tabIndex={-1} aria-hidden
                      className="ml-auto grid place-items-center w-8 h-8 rounded-full text-dim hover:text-accent">
                      <Volume2 size={15} />
                    </span>
                  </div>
                  <ol className="mt-1 text-sm text-dim list-decimal list-inside marker:text-2xs">
                    {e.g.map((g, n) => <li key={n}>{g}</li>)}
                  </ol>
                  {e.f && e.f.length > 0 && (
                    <p lang="de" className="mt-1.5 text-2xs text-dim font-mono">{e.f.join(' · ')}</p>
                  )}
                </li>
              ))}
            </ul>
            {/* The line that keeps the two layers apart in words as well as in
                pixels. Without it a learner reasonably assumes everything the
                search box returns is something the app will teach them. */}
            <p className="text-dim text-2xs mt-2 leading-relaxed">
              {/* Only claim it is untaught when it actually is. The card list
                  above may already hold this exact headword — reached directly,
                  or through the lemma this section just resolved. */}
              {lexEntries.every((e) => taught.has(e.w.toLowerCase()))
                ? <>Wiktionary’s fuller entry for a word Lexi already teaches.</>
                : <>Wiktionary, not a Lexi card — no level, no example, and nothing to study.</>}
              {!already && !lexEntries.every((e) => taught.has(e.w.toLowerCase()))
                && <> If you want it taught, note it.</>}
            </p>
            {lexEntries.every((e) => taught.has(e.w.toLowerCase())) ? null : already ? (
              <p className="mt-2 inline-flex items-center gap-2 text-green text-sm font-semibold">
                <Check size={16} /> Noted — it’s on your list
              </p>
            ) : (
              <button
                onClick={() => { noteWanted(q); setNoted(true); haptic('grade'); }}
                className="tap-44 mt-2 inline-flex items-center gap-2 rounded-full border border-accent
                  text-accent font-semibold text-sm px-4 py-2 hover:bg-panel active:scale-95 transition">
                <Plus size={15} /> Note this word
              </button>
            )}
          </section>
        )}

        {/* The miss. Not an error state — a contribution one. */}
        {nothing && (
          <div className="mt-10 text-center px-6">
            <p className="text-base mb-1.5">
              Nothing for <span lang="de" className="font-semibold">“{q.trim()}”</span>.
            </p>
            <p className="text-dim text-xs mb-6 max-w-[38ch] mx-auto leading-relaxed">
              {/* Both numbers read from the data, never typed: a figure in copy
                  that has to be remembered when the corpus grows is a figure that
                  will be wrong. */}
              Not among the {fmt(WORDS.length)} words Lexi teaches
              {lexiconSize() > 0 && <>, and not in the {fmt(lexiconSize())} it can look up</>}.
              Try the base form, or search the English.
            </p>

            {already ? (
              <p className="inline-flex items-center gap-2 text-green text-sm font-semibold">
                <Check size={16} /> Noted — it’s on your list
              </p>
            ) : (
              <button
                onClick={() => { noteWanted(q); setNoted(true); haptic('grade'); }}
                className="tap-44 inline-flex items-center gap-2 rounded-full bg-accent text-bg
                  font-bold text-sm px-5 py-2.5 hover:brightness-105 active:scale-95 transition">
                <Plus size={15} /> Note this word
              </button>
            )}
            <p className="text-dim text-2xs mt-4 max-w-[36ch] mx-auto leading-relaxed">
              Noted words are kept on this device and listed in your profile. Whether one becomes a
              card is decided by a dictionary check, not by the note.
            </p>
          </div>
        )}
      </div>

      {detail && <WordDetail word={detail} onClose={() => setDetail(null)} />}
    </div>,
    document.body,
  );
}

/** Where a card stands, so a result says something the learner did not already
 *  know. Silent on New — an "unseen" badge on every row is wallpaper. */
function StatusChip({ id, version }: { id: string; version: number }) {
  const s = useMemo(() => statusOf(id), [id, version]);
  if (s === 'known') return <Chip tone="good">known</Chip>;
  if (s === 'learning') return <Chip>learning</Chip>;
  return null;
}
