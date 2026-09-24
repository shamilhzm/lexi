// A story, read with Lexi beside you — a layer over the feed.
//
// A layer rather than a route, so closing it returns the learner to the exact
// slot they left: a feed that forgets your place when you look at something is a
// feed you stop looking at things in. It slides in like the word entry does and
// closes the same way, by the back pill or the swipe.
//
// The loop, in the order it happens:
//
//   read     — the publisher's text; words Lexi can teach you marked, words it
//              cannot underlined faintly; every word tappable
//   look up  — a card, a compound, or a dictionary entry (see WordSheet)
//   keep     — save a card (Üben teaches it next and names this article), or note
//              a word Lexi does not carry, with the sentence you met it in
//   respond  — two to four sentences back, in German
//
// The number at the top is the same meter the text scanner uses, so "known"
// means one thing across the app. Names are looked up, not guessed, and leave it.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import { ExternalLink, Volume2, Square, Check, Loader2, Headphones, Bookmark } from 'lucide-react';
import Layer from '../Layer.tsx';
import WordSheet, { type Picked } from './WordSheet.tsx';
import Respond from './Respond.tsx';
import WordDetail from '../WordDetail.tsx';
import WordDrill from '../WordDrill.tsx';
import { coverageOf, type Coverage, type CoverageToken } from '../../lib/coverage.ts';
import { stateOf } from '../../lib/learnerState.ts';
import { loadBody, bodyText } from '../../lib/news/feed.ts';
import { SOURCE_LABEL } from '../../lib/news/sources.ts';
import { markRead, isRead, saveFromArticle } from '../../lib/news/library.ts';
import { namesIn } from '../../lib/news/names.ts';
import { sentenceAt, wordCount, ago } from '../../lib/news/text.ts';
import { readAloud } from '../../lib/news/voice.ts';
import { isSaved } from '../../store.ts';
import { useStore } from '../../useStore.ts';
import { fmt, haptic } from '../../lib/ui.ts';
import { WORDS } from '../../data/index.ts';
import type { Article, Para } from '../../lib/news/types.ts';
import type { Word } from '../../types.ts';

const TINT: Record<string, string> = {
  known: '',
  learning: 'text-accent font-semibold',
  new: 'text-accent underline decoration-dotted underline-offset-4',
  compound: 'underline decoration-dotted decoration-accent/50 underline-offset-4',
  absent: 'underline decoration-dotted decoration-dim/60 underline-offset-4',
};

export default function ArticleLayer({ article, onClose, onSettings }: {
  article: Article;
  onClose: () => void;
  onSettings: () => void;
}) {
  const v = useStore();
  const [body, setBody] = useState<{ paras: Para[]; complete: boolean } | 'loading' | 'failed'>('loading');
  const [names, setNames] = useState<ReadonlySet<string>>(new Set());
  const [picked, setPicked] = useState<(Picked & { key: string }) | null>(null);
  const [entry, setEntry] = useState<Word | null>(null);
  const [drill, setDrill] = useState<Word | null>(null);
  const [speaking, setSpeaking] = useState(-1);
  const stopRef = useRef<(() => void) | null>(null);
  const [done, setDone] = useState(() => isRead(article.id));

  useEffect(() => {
    let live = true;
    loadBody(article).then((b) => { if (live) setBody(b ?? 'failed'); }).catch(() => { if (live) setBody('failed'); });
    return () => { live = false; stopRef.current?.(); };
  }, [article]);

  const paras = useMemo(() => (body !== 'loading' && body !== 'failed' ? body.paras : []), [body]);
  const text = useMemo(() => bodyText(paras), [paras]);

  useEffect(() => {
    if (!paras.length) return;
    let live = true;
    namesIn(paras.map((p) => p.text), stateOf).then((n) => { if (live) setNames(n); }).catch(() => { /* offline — count them */ });
    return () => { live = false; };
  }, [paras]);

  const cov: Coverage | null = useMemo(
    () => (text ? coverageOf(text, { stateOf, names }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, names, v, WORDS.length],
  );
  const paraCovs = useMemo(
    () => paras.map((p) => coverageOf(p.text, { stateOf, names })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paras, names, v, WORDS.length],
  );

  const from = { title: article.title, url: article.url };
  const pct = cov && cov.counted ? Math.round((cov.known / cov.counted) * 100) : 0;
  const lookUp = cov ? new Set(cov.tokens.filter((t) => t.state === 'absent').map((t) => t.text.toLowerCase())).size : 0;
  const worth = cov ? cov.unlocks.slice(0, 8) : [];
  // Words to try in the write-back: content words past the commonest few hundred.
  // Suggesting *sein* and *haben* is suggesting nothing.
  const targets = (cov ? cov.unlocks : [])
    .filter((u) => ['noun', 'verb', 'adjective', 'adverb'].includes(u.word.pos) && (u.rank ?? Infinity) > 300)
    .slice(0, 3)
    .map((u) => u.word.term.replace(/^(der|die|das)\s+/, ''));

  const pickEl = (el: HTMLElement) => {
    const pi = Number(el.dataset.p), ti = Number(el.dataset.t);
    const tok = paraCovs[pi]?.tokens[ti];
    if (!tok) return;
    setPicked({
      key: `${pi}:${ti}`,
      surface: tok.text,
      word: tok.word,
      compound: tok.state === 'compound',
      sentence: sentenceAt(paras[pi].text, Number(el.dataset.o)),
      paragraph: paras[pi].text,
    });
  };
  const onWord = (e: MouseEvent<HTMLElement>) => {
    const el = (e.target as HTMLElement).closest('[data-t]') as HTMLElement | null;
    if (el) pickEl(el);
  };
  // The words are one tab stop, not six hundred: Tab reaches the text, the arrow
  // keys walk it word by word, Enter looks the focused word up — a roving tabindex,
  // so a keyboard can do everything a finger can.
  const onKeys = (e: KeyboardEvent<HTMLElement>) => {
    const el = (e.target as HTMLElement).closest('[data-t]') as HTMLElement | null;
    if (!el) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickEl(el); return; }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const all = [...(e.currentTarget.querySelectorAll('[data-t]') as NodeListOf<HTMLElement>)];
    const next = all[all.indexOf(el) + (e.key === 'ArrowRight' ? 1 : -1)];
    if (next) { el.tabIndex = -1; next.tabIndex = 0; next.focus(); }
  };

  const toggleAloud = () => {
    if (speaking >= 0) { stopRef.current?.(); stopRef.current = null; return; }
    stopRef.current = readAloud(paras.map((p) => p.text), setSpeaking);
  };

  return (
    <>
      <Layer side="right" label={article.title} back="Wörter" onClose={onClose}>
        <article className="pb-6">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-dim">
            <span className="font-mono uppercase tracking-widest text-accent">{SOURCE_LABEL[article.source]}</span>
            {article.published > 0 && <span>{ago(article.published)}</span>}
            <a href={article.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline decoration-dotted hover:text-accent">
              Original <ExternalLink size={10} />
            </a>
          </p>
          {article.topline && <p lang="de" className="mt-2 text-sm font-semibold text-dim">{article.topline}</p>}
          <h2 lang="de" className="display text-3xl sm:text-4xl leading-tight mt-1">{article.title}</h2>

          {article.image && (
            <figure className="mt-4 -mx-5 sm:mx-0">
              <img src={article.image.src} alt={article.image.alt ?? ''} className="w-full aspect-video object-cover sm:rounded-xl" />
              {article.image.credit && <figcaption className="px-5 sm:px-0 mt-1 text-2xs text-dim">Photo: {article.image.credit}</figcaption>}
            </figure>
          )}

          {/* The meter, as a line rather than a box — a Band, not a Card. */}
          {cov && cov.counted > 0 && (
            <div className="mt-5 border-y border-line py-3">
              <p className="flex items-baseline gap-2 flex-wrap">
                <span className="font-mono text-2xl font-bold tabular-nums">{pct}%</span>
                <span className="text-sm">of these words you know in Lexi</span>
              </p>
              <p className="mt-0.5 text-2xs text-dim">
                {fmt(cov.known)} of {fmt(cov.counted)}
                {cov.learning > 0 && <> · {cov.learning} still learning</>}
                {cov.fresh > 0 && <> · <span className="text-accent">{cov.fresh} Lexi can teach you</span></>}
                {lookUp > 0 && <> · {lookUp} to look up</>}
                {cov.excluded.entity > 0 && <> · names not counted</>}
              </p>
            </div>
          )}

          {paras.length > 0 && (
            article.audio ? (
              <div className="mt-4">
                <p className="text-xs text-dim flex items-center gap-1.5 mb-1.5"><Headphones size={13} /> Read slowly by DW — listen while you read</p>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the captions are the page: DW's audio is a reading of exactly the text below. */}
                <audio controls preload="none" src={article.audio} className="w-full" />
              </div>
            ) : (
              <button onClick={toggleAloud}
                className="tap-44 mt-4 inline-flex items-center gap-2 rounded-full glass px-4 h-10 text-sm font-semibold active:scale-95 transition">
                {speaking >= 0 ? <><Square size={12} /> Stop reading</> : <><Volume2 size={15} className="text-accent" /> Read it to me</>}
              </button>
            )
          )}

          {body === 'loading' && <p className="mt-6 flex items-center gap-2 text-sm text-dim"><Loader2 size={14} className="animate-spin" /> Fetching the article…</p>}
          {body === 'failed' && (
            <p className="mt-6 text-sm text-dim">
              Couldn’t load the text — you may be offline, or this hour’s allowance of Tagesschau requests is spent.{' '}
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-accent">Read it on the publisher’s site</a>.
            </p>
          )}

          {paras.length > 0 && (
            // A delegation target: the interactive elements are the word spans inside
            // (role="button", roving tabindex), and both events are handled here.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <div lang="de" role="group" aria-label="Article text" onClick={onWord} onKeyDown={onKeys}
              className="mt-6 flex flex-col gap-5 text-lg leading-[1.8]">
              {paras.map((p, pi) => (p.kind === 'h'
                ? <h3 key={pi} className="headword text-xl font-bold mt-2 leading-snug">{renderTokens(paraCovs[pi], pi, picked?.key)}</h3>
                : (
                  <p key={pi} className={`transition-colors ${speaking === pi ? 'border-l-2 border-accent pl-3 -ml-3.5' : ''}`}>
                    {renderTokens(paraCovs[pi], pi, picked?.key)}
                  </p>
                )))}
            </div>
          )}
          {body !== 'loading' && body !== 'failed' && !body.complete && (
            <p className="mt-4 text-sm text-dim">
              {article.source === 'heise' ? 'heise shares only this summary with other apps. ' : 'Only the summary could be loaded. '}
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-accent inline-flex items-center gap-0.5">
                Read the rest <ExternalLink size={11} />
              </a>
            </p>
          )}
          {paras.length > 0 && (
            <p className="mt-5 text-2xs text-dim">
              Text © {SOURCE_LABEL[article.source]}, loaded by your browser from the publisher for your own reading. Lexi keeps it only on this device.
            </p>
          )}

          {/* The word you tapped — pinned above the tab bar. */}
          {picked && (
            <div className="sticky z-10 mt-4" style={{ bottom: '0.5rem' }}>
              <WordSheet key={picked.key} picked={picked} article={from}
                onPractise={setDrill} onEntry={setEntry} onClose={() => setPicked(null)} />
            </div>
          )}

          {/* The words worth taking: they recur here, or are common everywhere. */}
          {worth.length > 0 && (
            <section aria-labelledby="worth-h" className="mt-10">
              <h3 id="worth-h" className="text-base font-bold">Worth learning from this</h3>
              <p className="text-xs text-dim mt-0.5">Save them and Üben teaches them next, with this article as the reason.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {worth.map((u) => {
                  const on = isSaved(u.word.id);
                  return (
                    <li key={u.word.id}>
                      <button onClick={() => { if (!on) { saveFromArticle(u.word.id, from, ''); haptic('grade'); } }}
                        aria-pressed={on}
                        className={`tap-44 inline-flex items-center gap-1.5 rounded-full px-3.5 h-10 text-sm transition active:scale-95
                          ${on ? 'bg-accent text-bg font-semibold' : 'glass'}`}>
                        {on ? <Check size={13} /> : <Bookmark size={13} className="text-accent" />}
                        <span lang="de">{u.word.term}</span>
                        {u.occurrences > 1 && <span className="text-2xs opacity-70">×{u.occurrences}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {paras.length > 0 && (
            <Respond articleId={article.id} title={article.title} targets={targets} onSettings={onSettings} />
          )}

          {paras.length > 0 && (
            <div className="mt-8 flex items-center gap-3">
              <button disabled={done}
                onClick={() => { markRead({ id: article.id, title: article.title, source: article.source, url: article.url, words: wordCount(text) }); setDone(true); haptic('grade'); }}
                className="tap-44 inline-flex items-center gap-2 rounded-full glass px-4 h-11 text-sm font-semibold active:scale-95 transition disabled:opacity-70">
                {done ? <><Check size={14} className="text-green" /> Read · {fmt(wordCount(text))} words</> : <>Done reading</>}
              </button>
            </div>
          )}
        </article>
      </Layer>
      <AnimatePresence>
        {entry && <WordDetail key="entry" word={entry} onClose={() => setEntry(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {drill && <WordDrill key="drill" word={drill} onClose={() => setDrill(null)} />}
      </AnimatePresence>
    </>
  );
}

/** Index of the first tappable token — the roving tabindex's resting stop. */
function firstTappable(c: Coverage): number {
  return c.tokens.findIndex((t) => t.isWord && (t.text.length >= 3 || !!t.word));
}

/** A paragraph's tokens as spans. One click handler reads the data attributes — a
 *  button per word would put hundreds of tab stops in a keyboard user's way, and
 *  the text reads as plain prose to a screen reader. */
function renderTokens(c: Coverage | undefined, pi: number, pickedKey: string | undefined) {
  if (!c) return null;
  const first = pi === 0 ? firstTappable(c) : -1;
  let offset = 0;
  return c.tokens.map((t: CoverageToken, ti) => {
    const o = offset;
    offset += t.text.length;
    if (!t.isWord) return <span key={ti}>{t.text}</span>;
    const tappable = t.text.length >= 3 || !!t.word;
    const isPicked = pickedKey === `${pi}:${ti}`;
    const tint = t.counted && t.state ? TINT[t.state] ?? '' : '';
    return (
      <span key={ti}
        data-p={tappable ? pi : undefined} data-t={tappable ? ti : undefined} data-o={tappable ? o : undefined}
        role={tappable ? 'button' : undefined}
        tabIndex={tappable ? (ti === first ? 0 : -1) : undefined}
        className={`${tint} ${tappable ? 'cursor-pointer rounded-sm hover:bg-panel2' : ''}
          ${isPicked ? 'bg-panel2 outline outline-1 outline-accent' : ''} focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}>
        {t.text}
      </span>
    );
  });
}
