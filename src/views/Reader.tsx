// Lesen — read the German you care about and watch your own vocabulary light up.
// Paste any text; every word is tinted by its FSRS status (known / learning /
// new), and tapping one shows its meaning + grammar. Words not in the lexicon
// yet can be added as your own cards (reuses the mining pipeline). The new words
// on the page can be studied as a set — so reading feeds the review loop.
import { useMemo, useState } from 'react';
import { BookOpen, Play, Sparkles, Loader2, Volume2, KeyRound, X } from 'lucide-react';
import { annotate, enrich, resetMiningIndex, isNeutralWord, type Segment } from '../lib/mining.ts';
import { statusOf, addUserWords, apiKey, aiConfig } from '../store.ts';
import { useStore } from '../useStore.ts';
import { speak } from '../lib/tts.ts';
import type { Target } from '../types.ts';

const SAMPLE = `Gestern bin ich mit dem Zug nach München gefahren. Die Landschaft war wunderschön, und unterwegs habe ich ein spannendes Buch über Nachhaltigkeit gelesen. Am Bahnhof wartete bereits meine Kollegin, die mir die neue Ausstellung empfahl.`;

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '');

/** Reading-surface tint for one word token by its FSRS status. */
function wordClass(seg: Segment, selected: boolean): string {
  const base = 'rounded px-0.5 -mx-0.5 cursor-pointer underline-offset-2';
  const sel = selected ? ' bg-amber/25 ' : ' ';
  if (!seg.word) return base + sel + 'text-dim underline decoration-dashed decoration-line hover:text-amber';
  const st = statusOf(seg.word.id);
  if (st === 'known') return base + sel + 'text-green hover:brightness-110';
  if (st === 'learning') return base + sel + 'text-amber hover:brightness-110';
  return base + sel + 'underline decoration-dotted decoration-dim/60 hover:text-amber'; // new, in lexicon
}

export default function Reader({ onStudy }: { onStudy: (t: Target) => void }) {
  const v = useStore();
  const [text, setText] = useState('');
  const [segs, setSegs] = useState<Segment[] | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [err, setErr] = useState('');

  const stats = useMemo(() => {
    const known = new Set<string>(), learning = new Set<string>(), fresh = new Set<string>();
    const unknown = new Map<string, string>(); // lowercased -> display form
    for (const s of segs ?? []) {
      if (!s.isWord) continue;
      if (s.word) {
        const st = statusOf(s.word.id);
        (st === 'known' ? known : st === 'learning' ? learning : fresh).add(s.word.id);
      } else if (!isNeutralWord(s.text)) unknown.set(s.text.toLowerCase(), s.text);
    }
    const total = known.size + learning.size + fresh.size + unknown.size;
    return { known: known.size, learning: learning.size, fresh: fresh.size, unknown: unknown.size,
      unknownList: [...unknown.values()], freshIds: [...fresh],
      pct: total ? Math.round(((known.size + learning.size) / total) * 100) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segs, v]);

  const read = () => { setSegs(annotate(text)); setSel(null); setErr(''); };
  const selected = sel !== null ? segs?.[sel] ?? null : null;

  const enrichTokens = async (tokens: string[], noneMsg: string) => {
    setEnriching(true); setErr('');
    try {
      const added = addUserWords(await enrich(tokens, aiConfig()));
      resetMiningIndex();
      setSegs(annotate(text)); // the tokens now match their new cards
      if (!added.length) setErr(noneMsg);
    } catch (e: any) {
      setErr(e?.message || 'Enrichment failed. Check your API key in Settings.');
    } finally { setEnriching(false); }
  };
  const addWord = (token: string) => enrichTokens([token], 'Could not add that word — try another.');
  const addAll = () => enrichTokens(stats.unknownList.slice(0, 40), 'Nothing could be added.');

  // ---- input screen -------------------------------------------------------
  if (!segs) return (
    <div className="max-w-[820px] mx-auto">
      <Header />
      <div className="bg-panel border border-line rounded-[16px] p-4 sm:p-5">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9}
          placeholder="Paste a German article, story, song lyric, email — anything you want to read…"
          className="w-full bg-panel2 border border-line rounded-lg p-3.5 text-[15px] leading-relaxed text-txt outline-none focus:border-amber resize-y" />
        <div className="flex items-center gap-2.5 mt-3 flex-wrap">
          <button onClick={read} disabled={text.trim().length < 3}
            className="flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 text-[15px] hover:brightness-105 disabled:opacity-40">
            <BookOpen size={15} /> Read
          </button>
          <button onClick={() => setText(SAMPLE)} className="text-[13px] text-dim hover:text-amber">Try a sample</button>
        </div>
      </div>
    </div>
  );

  // ---- reading screen -----------------------------------------------------
  return (
    <div className="max-w-[820px] mx-auto">
      <Header />

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Chip n={stats.known} label="known" cls="text-green" />
        <Chip n={stats.learning} label="learning" cls="text-amber" />
        <Chip n={stats.fresh} label="new" cls="text-txt" />
        <Chip n={stats.unknown} label="new to you" cls="text-dim" />
        <span className="ml-auto text-[13px] text-dim">You know <span className="text-green font-semibold">{stats.pct}%</span> of the words here</span>
      </div>

      <div className="bg-card border border-line rounded-[16px] p-5 sm:p-7 mb-3">
        <p className="whitespace-pre-wrap leading-[2.05] text-[17px]">
          {segs.map((s, i) => {
            if (!s.isWord) return <span key={i}>{s.text}</span>;
            if (!s.word && isNeutralWord(s.text)) return <span key={i}>{s.text}</span>; // function word / ordinal: plain
            return <span key={i} role="button" tabIndex={0} onClick={() => setSel(i)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSel(i); }}
              className={wordClass(s, i === sel)}>{s.text}</span>;
          })}
        </p>
      </div>

      {selected && <WordPanel seg={selected} onClose={() => setSel(null)} onStudy={onStudy}
        onAdd={addWord} enriching={enriching} hasKey={!!apiKey()} err={err} />}

      {stats.unknownList.length > 0 && (
        <div className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mt-3">
          <h2 className="text-[15px] font-semibold">Not in the lexicon yet ({stats.unknownList.length})</h2>
          <p className="text-dim text-[13px] mt-1 mb-3">Words Lexi doesn’t carry — proper nouns, or vocab you can add as your own cards.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {stats.unknownList.slice(0, 60).map((tok) => (
              <span key={tok} className="text-[13px] rounded-full px-3 py-1 border border-line text-dim">{tok}</span>
            ))}
          </div>
          {apiKey() ? (
            <button onClick={addAll} disabled={enriching}
              className="flex items-center gap-2 bg-panel2 border border-line rounded-[10px] px-5 py-2.5 text-[13px] hover:border-amber disabled:opacity-50">
              {enriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber" />}
              {enriching ? 'Adding…' : `Add ${Math.min(stats.unknownList.length, 40)} to my lexicon`}
            </button>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] text-dim"><KeyRound size={13} /> Add an API key in Settings to save your own words.</p>
          )}
          {err && !selected && <p className="text-red-txt text-[13px] mt-2">{err}</p>}
        </div>
      )}

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button onClick={() => { setSegs(null); setSel(null); }} className="text-[13px] text-dim hover:text-amber">← Read another text</button>
        {stats.freshIds.length > 0 && (
          <button onClick={() => onStudy({ kind: 'custom', name: 'From your reading', ids: stats.freshIds })}
            className="ml-auto flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 text-[15px] hover:brightness-105">
            <Play size={15} /> Study {stats.freshIds.length} new word{stats.freshIds.length === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </div>
  );
}

function WordPanel({ seg, onClose, onStudy, onAdd, enriching, hasKey, err }:
  { seg: Segment; onClose: () => void; onStudy: (t: Target) => void; onAdd: (token: string) => void; enriching: boolean; hasKey: boolean; err: string }) {
  const w = seg.word;
  return (
    <div className="bg-panel border border-line rounded-[16px] p-4 sm:p-5">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {w ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="headword text-[20px] font-bold">{w.term}</span>
                <span className="text-[11px] text-amber border border-line rounded-full px-1.5 py-0.5">{w.level}</span>
                <StatusChip id={w.id} />
                <button onClick={() => speak(stripArticle(w.term))} title="Hear it"
                  className="grid place-items-center w-11 h-11 -m-2 text-amber hover:text-amber2"><Volume2 size={16} /></button>
              </div>
              <p className="text-[15px] mt-1.5">{w.en}</p>
              {(w.plural || w.ipa) && (
                <p className="text-[13px] text-dim mt-1 font-mono">
                  {w.plural && <>pl. {w.plural}</>}{w.plural && w.ipa && ' · '}{w.ipa && <>/{w.ipa}/</>}
                </p>
              )}
              {w.ex[0] && <p className="text-dim italic text-[13px] mt-2">„{w.ex[0].de}“{w.ex[0].en && <span className="not-italic"> — {w.ex[0].en}</span>}</p>}
              <button onClick={() => onStudy({ kind: 'custom', name: stripArticle(w.term), ids: [w.id] })}
                className="mt-3 flex items-center gap-1.5 text-[13px] text-amber hover:underline"><Play size={13} /> Study this word</button>
            </>
          ) : (
            <>
              <span className="headword text-[20px] font-bold">{seg.text}</span>
              <p className="text-[13px] text-dim mt-1.5">Not in the lexicon yet.</p>
              {hasKey ? (
                <button onClick={() => onAdd(seg.text)} disabled={enriching}
                  className="mt-3 flex items-center gap-2 bg-panel2 border border-line rounded-[10px] px-4 py-2 text-[13px] hover:border-amber disabled:opacity-50">
                  {enriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber" />}
                  {enriching ? 'Adding…' : 'Add to my lexicon'}
                </button>
              ) : (
                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-dim"><KeyRound size={13} /> Add an API key in Settings to save your own words.</p>
              )}
              {err && <p className="text-red-txt text-[13px] mt-2">{err}</p>}
            </>
          )}
        </div>
        <button onClick={onClose} className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-amber" title="Close"><X size={16} /></button>
      </div>
    </div>
  );
}

function StatusChip({ id }: { id: string }) {
  const st = statusOf(id);
  const map = { known: ['text-green', 'Known'], learning: ['text-amber', 'Learning'], new: ['text-dim', 'New'] } as const;
  const [cls, label] = map[st];
  return <span className={`text-[11px] border border-line rounded-full px-1.5 py-0.5 ${cls}`}>{label}</span>;
}

function Header() {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <BookOpen size={20} className="text-amber" />
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-bold leading-none">Lesen</h1>
        <p className="text-dim text-[13px] mt-1">Read real German — your words light up as you go.</p>
      </div>
    </div>
  );
}

function Chip({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <span className="flex items-center gap-1.5 bg-panel border border-line rounded-full px-2.5 py-1 text-[13px]">
      <span className={`font-mono font-bold tabular-nums ${cls}`}>{n}</span>
      <span className="text-dim">{label}</span>
    </span>
  );
}
