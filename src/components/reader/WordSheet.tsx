// The word you tapped, in the sentence you met it in.
//
// Three kinds of word reach here, and DICTIONARY.md's one unbendable rule decides
// what each may offer: *an entry is never silently upgraded into a card, and the
// two must never look alike.*
//
//   a **card** — its gloss and status, and the three things the feed already
//   offers a card: save it (Üben teaches it next, and will say which article it
//   came from), practise it now, or open the full entry;
//
//   a **compound** the matcher could only decompose — *Wahltag* resolving to
//   *der Tag* — which is not a card for *Tag* and must not wear its gloss; it is
//   looked up whole, like an entry, with its head named;
//
//   an **entry** — Wiktionary via the offline lexicon, visibly not a card, and
//   one action: *note this word*, which now keeps the sentence it was met in for
//   whoever authors it.
//
// The sentence can be heard, and — with a key set — explained.
import { useEffect, useState } from 'react';
import { X, Volume2, Bookmark, BookmarkCheck, GraduationCap, Info, Plus, Check, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { lookupLex, type LexEntry } from '../../lib/lexicon.ts';
import { saveFromArticle } from '../../lib/news/library.ts';
import { explainSentence, aiReady, AiError, type Explanation } from '../../lib/ai.ts';
import { statusOf, isSaved, toggleSaved, isWanted, noteWanted, studyLevel } from '../../store.ts';
import { speak } from '../../lib/tts.ts';
import { genderColor, haptic, tick } from '../../lib/ui.ts';
import { GenderTerm } from '../Reveal.tsx';
import type { Word } from '../../types.ts';

export interface Picked {
  surface: string;
  /** The card the token resolved to — for a compound, its head. */
  word: Word | null;
  /** True when `word` is only the head of a compound the token decomposed into. */
  compound: boolean;
  sentence: string;
  paragraph: string;
}

const pill = 'tap-44 inline-flex items-center gap-1.5 rounded-full px-3.5 h-10 text-sm font-semibold active:scale-95 transition';

export default function WordSheet({ picked, article, onPractise, onEntry, onClose }: {
  picked: Picked;
  article: { title: string; url: string };
  onPractise: (w: Word) => void;
  onEntry: (w: Word) => void;
  onClose: () => void;
}) {
  const { surface, word, compound, sentence, paragraph } = picked;
  const card = compound ? null : word;
  const [lex, setLex] = useState<{ entries: LexEntry[]; via?: string } | 'loading'>(card ? { entries: [] } : 'loading');
  const [explain, setExplain] = useState<Explanation | 'loading' | string | null>(null);
  const [, bump] = useState(0);

  // Only a word that is not a card is looked up. The sheet is keyed by the tapped
  // token, so each word is a fresh mount and starts clean.
  useEffect(() => {
    if (card) return;
    let live = true;
    lookupLex(surface).then((r) => { if (live) setLex(r); }).catch(() => { if (live) setLex({ entries: [] }); });
    return () => { live = false; };
  }, [surface, card]);

  const runExplain = async () => {
    setExplain('loading');
    try {
      setExplain(await explainSentence({ sentence, paragraph, title: article.title, level: studyLevel() }));
    } catch (e) {
      setExplain(e instanceof AiError ? e.message : 'Could not explain this one.');
    }
  };

  const saved = card ? isSaved(card.id) : false;
  const status = card ? statusOf(card.id) : null;
  const entries = lex === 'loading' ? [] : lex.entries;
  const lemma = entries[0]?.w ?? surface;
  const noted = isWanted(lemma);
  const at = sentence.indexOf(surface);

  return (
    <div role="dialog" aria-label={`About ${surface}`}
      className="glass rounded-xl px-4 py-4 sm:px-5 max-h-[62dvh] overflow-y-auto overscroll-contain">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {card ? (
            <>
              <span className="h-4 flex items-center">
                {status !== 'new' && (
                  <span className={`text-2xs font-mono uppercase tracking-widest ${status === 'known' ? 'text-green' : 'text-accent'}`}>
                    {status === 'known' ? 'known' : 'learning'}
                  </span>
                )}
              </span>
              <GenderTerm as="h3" term={card.term} gender={card.gender} className="headword text-2xl font-bold leading-tight" />
              <p className="text-base mt-1"><span className="text-dim">({card.pos})</span> {card.en}</p>
              {surface.toLowerCase() !== card.term.replace(/^(der|die|das)\s+/, '').toLowerCase() && (
                <p className="text-2xs text-dim mt-0.5">from <span lang="de">{surface}</span></p>
              )}
            </>
          ) : lex === 'loading' ? (
            <p className="flex items-center gap-2 text-sm text-dim h-10"><Loader2 size={14} className="animate-spin" /> Looking up <span lang="de" className="font-semibold text-txt">{surface}</span>…</p>
          ) : entries.length ? (
            <>
              <p className="font-mono text-2xs uppercase tracking-widest text-dim">
                {lex.via ? <>from the dictionary · {lex.via} is a form of</> : 'from the dictionary'}
              </p>
              <ul className="mt-1 flex flex-col gap-2">
                {entries.slice(0, 2).map((e, k) => (
                  <li key={`${e.w}-${e.p}-${k}`}>
                    <p className="flex items-baseline gap-1.5 flex-wrap">
                      <span lang="de" className="headword text-xl font-bold" style={{ color: genderColor(e.x) }}>
                        {e.x ? `${e.x} ${e.w}` : e.w}
                      </span>
                      <span className="text-2xs text-dim">{e.p}</span>
                      {e.i && <span className="font-mono text-2xs text-dim">/{e.i}/</span>}
                    </p>
                    <p className="text-sm text-dim">{e.g.slice(0, 3).join('; ')}</p>
                  </li>
                ))}
              </ul>
              {compound && word && (
                <p className="text-2xs text-dim mt-1.5">
                  A compound built on <span lang="de" className="text-txt">{word.term}</span> — its meaning is its own.
                </p>
              )}
            </>
          ) : (
            <>
              <p lang="de" className="headword text-xl font-bold">{surface}</p>
              <p className="text-sm text-dim mt-0.5">
                {compound && word
                  ? <>A compound built on <span lang="de" className="text-txt">{word.term}</span>, not in the dictionary.</>
                  : /^\p{Lu}/u.test(surface) ? 'Not in the dictionary — most likely a name.' : 'Not in the dictionary.'}
              </p>
            </>
          )}
        </div>
        <button onClick={onClose} aria-label="Close"
          className="grid place-items-center w-[40px] h-[40px] -mr-1 -mt-1 rounded-full text-dim hover:text-txt flex-shrink-0">
          <X size={18} />
        </button>
      </div>

      {/* Actions — a card's three, or an entry's one. Never both. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {card ? (
          <>
            <button onClick={() => {
              if (saved) { toggleSaved(card.id); haptic('wrong'); tick('wrong'); }
              else { saveFromArticle(card.id, article, sentence); haptic('grade'); tick('good'); }
              bump((n) => n + 1);
            }} aria-pressed={saved}
              className={`${pill} ${saved ? 'bg-accent text-bg' : 'glass text-accent'}`}>
              {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} {saved ? 'Saved' : 'Save'}
            </button>
            <button onClick={() => onPractise(card)} className={`${pill} glass`}>
              <GraduationCap size={15} className="text-accent" /> Practise
            </button>
            <button onClick={() => onEntry(card)} className={`${pill} glass`}>
              <Info size={15} className="text-accent" /> Entry
            </button>
          </>
        ) : lex !== 'loading' && (
          noted
            ? <span className="inline-flex items-center gap-1.5 text-sm text-green font-semibold h-10"><Check size={15} /> Noted — it’s on your list</span>
            : (
              <button onClick={() => { noteWanted(lemma, { ex: sentence, src: article.title }); haptic('grade'); bump((n) => n + 1); }}
                className={`${pill} border border-accent text-accent`}>
                <Plus size={15} /> Note this word
              </button>
            )
        )}
      </div>
      {!card && lex !== 'loading' && (
        <p className="text-2xs text-dim mt-2 leading-relaxed">
          {entries.length ? 'Wiktionary, not a Lexi card — nothing to study yet. ' : ''}
          A noted word keeps the sentence you met it in; whether it becomes a card is decided by a dictionary check, not by the note.
        </p>
      )}

      {/* The sentence it came from. */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-start gap-2">
          <p lang="de" className="flex-1 text-base leading-relaxed">
            {at >= 0
              ? <>{sentence.slice(0, at)}<mark className="bg-transparent text-accent font-semibold">{surface}</mark>{sentence.slice(at + surface.length)}</>
              : sentence}
          </p>
          <button onClick={() => speak(sentence)} aria-label="Hear the sentence"
            className="grid place-items-center w-[40px] h-[40px] rounded-full glass text-accent flex-shrink-0">
            <Volume2 size={16} />
          </button>
        </div>
        <div className="mt-2">
          {aiReady() ? (
            explain === null ? (
              <button onClick={runExplain} className={`${pill} glass text-sm`}>
                <Sparkles size={14} className="text-accent" /> Explain this sentence
              </button>
            ) : explain === 'loading' ? (
              <p className="flex items-center gap-2 text-xs text-dim h-10"><Loader2 size={12} className="animate-spin" /> Reading the sentence…</p>
            ) : typeof explain === 'string' ? (
              <p className="text-xs text-red-txt">{explain}</p>
            ) : (
              <div className="rounded-lg bg-panel2 px-3 py-2.5">
                <p className="text-sm">{explain.translation}</p>
                {explain.points.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {explain.points.map((p, i) => (
                      <li key={i} className="text-xs leading-relaxed">
                        <span lang="de" className="font-semibold">{p.de}</span> — <span className="text-dim">{p.note}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-2xs text-dim">AI explanation — usually right, not always. Nothing here changes your cards.</p>
              </div>
            )
          ) : (
            <a href={`https://www.deepl.com/translator#de/en/${encodeURIComponent(sentence)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-dim underline decoration-dotted hover:text-accent">
              Translate this sentence on DeepL <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
