// Wörter ernten — sentence mining. Paste any German text; Lexi finds the words
// you haven't learned yet and drops them into a focused review session. Words not
// in the lexicon can be auto-enriched into your own cards via an optional API key.
import { useState, useRef } from 'react';
import { Sparkles, Play, KeyRound, Loader2, Check, ScanText } from 'lucide-react';
import { analyze, enrich, resetMiningIndex, type Analysis } from '../lib/mining.ts';
import { statusOf, addUserWords, apiKey, setApiKey } from '../store.ts';
import { useStore } from '../useStore.ts';
import UmlautBar from '../components/UmlautBar.tsx';
import type { Target, Word } from '../types.ts';

const SAMPLE = `Gestern bin ich mit dem Zug nach München gefahren. Die Landschaft war wunderschön, und unterwegs habe ich ein spannendes Buch über Nachhaltigkeit gelesen. Am Bahnhof wartete bereits meine Kollegin, die mir die neue Ausstellung empfahl.`;

export default function Mining({ onStudy }: { onStudy: (t: Target) => void }) {
  useStore();
  const [text, setText] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [a, setA] = useState<Analysis | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showKey, setShowKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState(apiKey());
  const [enriching, setEnriching] = useState(false);
  const [err, setErr] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  const run = () => {
    const res = analyze(text);
    setA(res);
    // pre-select every lexicon word you haven't learned yet
    const fresh = res.inLexicon.filter(({ word }) => statusOf(word.id) === 'new').map(({ word }) => word.id);
    setPicked(new Set(fresh));
    setErr(''); setAddedCount(0);
  };

  if (!a) return (
    <div className="max-w-[820px] mx-auto">
      <Header />
      <div className="bg-panel border border-line rounded-[12px] p-4 sm:p-5">
        <textarea ref={textRef} value={text} onChange={(e) => setText(e.target.value)} rows={9}
          placeholder="Paste a German article, song lyric, subtitle, email — anything you want to learn from…"
          className="w-full bg-panel2 border border-line rounded-lg p-3.5 text-[14px] leading-relaxed text-txt outline-none focus:border-amber resize-y" />
        <div className="mt-2"><UmlautBar targetRef={textRef} value={text} onChange={setText} /></div>
        <div className="flex items-center gap-2.5 mt-3 flex-wrap">
          <button onClick={run} disabled={text.trim().length < 3}
            className="flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 text-[14px] hover:brightness-105 disabled:opacity-40">
            <Sparkles size={15} /> Mine words
          </button>
          <button onClick={() => setText(SAMPLE)} className="text-[13px] text-dim hover:text-amber">Try a sample</button>
        </div>
      </div>
    </div>
  );

  const known = a.inLexicon.filter(({ word }) => statusOf(word.id) !== 'new');
  const fresh = a.inLexicon.filter(({ word }) => statusOf(word.id) === 'new');
  const totalTokens = a.inLexicon.length + a.unknown.length;

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const studyPicked = () => {
    if (picked.size === 0) return;
    onStudy({ kind: 'custom', name: 'Mined words', ids: [...picked] });
  };

  const doEnrich = async () => {
    setEnriching(true); setErr('');
    try {
      const words: Word[] = await enrich(a.unknown.slice(0, 40), apiKey());
      const added = addUserWords(words);
      resetMiningIndex();
      setAddedCount(added.length);
      // re-analyze so newly added words move into the lexicon bucket & get selected
      const res = analyze(text);
      setA(res);
      setPicked((s) => { const n = new Set(s); for (const w of added) n.add(w.id); return n; });
    } catch (e: any) {
      setErr(e?.message || 'Enrichment failed. Check your API key.');
    } finally { setEnriching(false); }
  };

  return (
    <div className="max-w-[820px] mx-auto">
      <Header />
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <Stat n={totalTokens} label="unique words" />
        <Stat n={fresh.length} label="new to learn" tone="text-amber" />
        <Stat n={a.unknown.length} label="not in lexicon" tone="text-dim" />
      </div>

      {/* New, in-lexicon words */}
      <Section title={`New words in your text (${fresh.length})`}
        sub={fresh.length ? 'Tap to include/exclude, then study them as a set.' : 'Every word in your text is already in your deck. 🎉'}>
        {fresh.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {fresh.map(({ token, word }) => {
                const on = picked.has(word.id);
                return (
                  <button key={word.id} onClick={() => toggle(word.id)}
                    className={`text-[13px] rounded-full px-3 py-1.5 border transition-colors ${on ? 'bg-amber text-bg border-amber font-semibold' : 'border-line text-dim hover:border-amber'}`}
                    title={word.en}>
                    {on && <Check size={12} className="inline mr-1 -mt-0.5" />}{token}
                    <span className={`ml-1.5 text-[10px] ${on ? 'text-bg/70' : 'text-dim'}`}>{word.level}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={studyPicked} disabled={picked.size === 0}
              className="flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 text-[14px] hover:brightness-105 disabled:opacity-40">
              <Play size={15} /> Study {picked.size} word{picked.size === 1 ? '' : 's'}
            </button>
          </>
        )}
      </Section>

      {/* Out-of-lexicon words */}
      {a.unknown.length > 0 && (
        <Section title={`Not in the lexicon yet (${a.unknown.length})`}
          sub="These aren't in Lexi's deck. With an API key, Lexi can look them up and add them as your own cards.">
          <div className="flex flex-wrap gap-2 mb-3">
            {a.unknown.slice(0, 60).map((tok) => (
              <span key={tok} className="text-[13px] rounded-full px-3 py-1.5 border border-line text-dim">{tok}</span>
            ))}
          </div>
          {addedCount > 0 && <p className="text-green text-[13px] mb-3"><Check size={13} className="inline -mt-0.5" /> Added {addedCount} card{addedCount === 1 ? '' : 's'} to your lexicon.</p>}
          {apiKey() ? (
            <button onClick={doEnrich} disabled={enriching}
              className="flex items-center gap-2 bg-panel2 border border-line rounded-[10px] px-5 py-2.5 text-[14px] hover:border-amber disabled:opacity-50">
              {enriching ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-amber" />}
              {enriching ? 'Enriching…' : `Enrich & add ${Math.min(a.unknown.length, 40)}`}
            </button>
          ) : (
            <button onClick={() => setShowKey((s) => !s)} className="flex items-center gap-2 text-[13px] text-dim hover:text-amber">
              <KeyRound size={14} /> Add an API key to enable auto-enrichment
            </button>
          )}
          {err && <p className="text-red text-[12.5px] mt-2">{err}</p>}

          {showKey && (
            <div className="mt-3 bg-panel2 border border-line rounded-lg p-3">
              <label className="text-[12px] text-dim block mb-1.5">OpenAI API key — stored only on this device, used only for enrichment.</label>
              <div className="flex items-center gap-2">
                <input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="sk-…"
                  className="flex-1 bg-panel border border-line rounded-md px-2.5 py-1.5 text-[13px] font-mono outline-none focus:border-amber" />
                <button onClick={() => { setApiKey(keyDraft.trim()); setShowKey(false); }}
                  className="bg-amber text-bg font-semibold rounded-md px-3 py-1.5 text-[13px]">Save</button>
              </div>
            </div>
          )}
        </Section>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={() => { setA(null); setText(''); }} className="text-[13px] text-dim hover:text-amber">← Mine another text</button>
        {known.length > 0 && <span className="text-[13px] text-dim">{known.length} already in progress / learned</span>}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <ScanText size={20} className="text-amber" />
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-bold leading-none">Sentence mining</h1>
        <p className="text-dim text-[12.5px] mt-1">Build your lexicon from the German you actually read.</p>
      </div>
    </div>
  );
}
function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-line rounded-[12px] p-4 sm:p-5 mb-4">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {sub && <p className="text-dim text-[12.5px] mt-1 mb-3">{sub}</p>}
      {children}
    </div>
  );
}
function Stat({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <div className="bg-panel border border-line rounded-[10px] px-3 py-3 text-center">
      <div className={`font-mono font-bold text-[24px] leading-none tabular-nums ${tone ?? 'text-txt'}`}>{n}</div>
      <div className="text-[11px] text-dim mt-1">{label}</div>
    </div>
  );
}
