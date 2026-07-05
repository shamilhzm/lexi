// Grammatik-Übungen — the 444 authored exercises on FSRS tracks. Renders the
// five widget kinds (choose, mc, type, order, error); wrong answers log a
// blind-spot tag (the grammar point's title). Reached from the Gym.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { cardOf, review, levels, logMiss } from '../store.ts';
import { useStore } from '../useStore.ts';
import { isDue, Rating } from '../srs.ts';
import { haptic } from '../lib/ui.ts';
import { loadGrammar, flatten, type GItem } from '../lib/grammar.ts';
import UmlautBar from '../components/UmlautBar.tsx';

const norm = (s: string) => s.trim().toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/\s+/g, ' ');
function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

export default function GrammarDrill({ onExit }: { onExit: () => void }) {
  useStore();
  const lvKey = [...levels()].sort().join('');
  const [all, setAll] = useState<GItem[] | null>(null);
  useEffect(() => { loadGrammar().then((g) => setAll(flatten(g, levels()))); }, [lvKey]);

  const queue = useMemo(() => {
    if (!all) return [];
    const now = Date.now();
    const due: GItem[] = [], fresh: GItem[] = [];
    for (const it of all) { const c = cardOf(it.id); if (!c) fresh.push(it); else if (isDue(c, now)) due.push(it); }
    return [...shuffle(due), ...shuffle(fresh)].slice(0, 25);
  }, [all]);

  const [i, setI] = useState(0);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const item = queue[i];

  const grade = useCallback((ok: boolean) => {
    if (!item) return;
    review(item.id, ok ? Rating.Good : Rating.Again);
    haptic();
    if (!ok) logMiss(item.point.title);
    setDone((d) => d + 1); setCorrect((c) => c + (ok ? 1 : 0)); setI((n) => n + 1);
  }, [item]);

  if (!all) return <Shell onExit={onExit}><div className="grid place-items-center min-h-[300px] text-dim"><Loader2 className="animate-spin" /></div></Shell>;
  if (queue.length === 0) return <Shell onExit={onExit}><Empty /></Shell>;
  if (!item) return <Shell onExit={onExit}><Summary done={done} correct={correct} /></Shell>;

  return (
    <Shell onExit={onExit} progress={`${done}/${queue.length}`} score={done ? Math.round((correct / done) * 100) : null}>
      <div className="text-center mb-3">
        <span className="text-[11px] text-amber uppercase tracking-[2px] font-semibold">{item.level} · {item.point.title}</span>
      </div>
      <Item key={item.id} item={item} onGrade={grade} />
    </Shell>
  );
}

function Item({ item, onGrade }: { item: GItem; onGrade: (ok: boolean) => void }) {
  return <GrammarExercise ex={item.ex} onGrade={onGrade} />;
}

/** Render one grammar exercise (any of the five widget kinds). Reused by the
 *  unified session so grammar points show up as drills, not rule explanations. */
export function GrammarExercise({ ex, onGrade }: { ex: GItem['ex']; onGrade: (ok: boolean) => void }) {
  if (ex.kind === 'choose' || ex.kind === 'mc') return <ChooseItem ex={ex} onGrade={onGrade} />;
  if (ex.kind === 'type') return <TypeItem ex={ex} onGrade={onGrade} />;
  if (ex.kind === 'order') return <OrderItem ex={ex} onGrade={onGrade} />;
  return <ErrorItem ex={ex} onGrade={onGrade} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-line rounded-[16px] p-6 sm:p-8">{children}</div>;
}
function Explain({ text, ok, answer }: { text?: string; ok: boolean; answer?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
      {ok ? <p className="text-green font-semibold flex items-center justify-center gap-1.5"><Check size={16} /> Correct</p>
          : <p className="text-[15px]"><X size={15} className="inline text-red -mt-0.5 mr-1" /> {answer && <>Answer: <span className="text-green font-bold">{answer}</span></>}</p>}
      {text && <p className="text-dim text-[13px] mt-1.5">{text}</p>}
    </motion.div>
  );
}
function NextBtn({ onClick }: { onClick: () => void }) {
  return <div className="mt-5 flex justify-center"><button onClick={onClick} className="bg-panel2 border border-line rounded-[10px] px-6 py-2.5 hover:border-amber font-semibold">Next →</button></div>;
}

function ChooseItem({ ex, onGrade }: { ex: GItem['ex']; onGrade: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = ex.answer ?? 0;
  const choose = (idx: number) => { if (picked !== null) return; setPicked(idx); };
  return (
    <Card>
      <p className="text-[20px] sm:text-[24px] font-bold text-center mb-5 leading-snug">{ex.prompt}</p>
      <div className="grid gap-2.5">
        {(ex.options ?? []).map((o, idx) => {
          const state = picked === null ? 'idle' : idx === correct ? 'right' : idx === picked ? 'wrong' : 'idle';
          return (
            <button key={idx} onClick={() => choose(idx)} disabled={picked !== null}
              className={`rounded-[10px] py-3.5 px-4 border text-[15px] text-left transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red'
                : 'bg-panel2 border-line hover:border-amber'}`}>{o}</button>
          );
        })}
      </div>
      {picked !== null && <Explain text={ex.explain} ok={picked === correct} answer={ex.options?.[correct]} />}
      {picked !== null && <NextBtn onClick={() => onGrade(picked === correct)} />}
    </Card>
  );
}

function TypeItem({ ex, onGrade }: { ex: GItem['ex']; onGrade: (ok: boolean) => void }) {
  const [val, setVal] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const accepts = useMemo(() => new Set((ex.accept ?? []).map(norm)), [ex]);
  const submit = () => { if (result === null) setResult(accepts.has(norm(val))); };
  return (
    <Card>
      <p className="text-[20px] sm:text-[24px] font-bold text-center mb-4 leading-snug">{ex.prompt}</p>
      <input ref={ref} value={val} disabled={result !== null} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { result === null ? submit() : onGrade(result); } }}
        placeholder="Type your answer…"
        className={`w-full bg-panel2 border rounded-[10px] px-4 py-3 text-[20px] outline-none text-center ${
          result === null ? 'border-line focus:border-amber' : result ? 'border-green text-green' : 'border-red'}`} />
      {result === null && <div className="mt-2 flex justify-center"><UmlautBar targetRef={ref} value={val} onChange={setVal} /></div>}
      {result !== null && <Explain text={ex.explain} ok={result} answer={ex.accept?.[0]} />}
      {result === null
        ? <div className="mt-5 flex justify-center"><button onClick={submit} disabled={!val.trim()} className="bg-amber text-bg font-bold rounded-[10px] px-6 py-2.5 disabled:opacity-40">Check</button></div>
        : <NextBtn onClick={() => onGrade(result)} />}
    </Card>
  );
}

function OrderItem({ ex, onGrade }: { ex: GItem['ex']; onGrade: (ok: boolean) => void }) {
  const target = ex.tiles ?? [];
  const [pool, setPool] = useState<number[]>(() => shuffle(target.map((_, i) => i)));
  const [built, setBuilt] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const add = (idx: number) => { if (result !== null) return; setBuilt([...built, idx]); setPool(pool.filter((p) => p !== idx)); };
  const removeAt = (pos: number) => { if (result !== null) return; const idx = built[pos]; setBuilt(built.filter((_, i) => i !== pos)); setPool([...pool, idx]); };
  const check = () => setResult(built.map((i) => target[i]).join(' ') === target.join(' '));
  return (
    <Card>
      <p className="text-[20px] sm:text-[24px] font-semibold text-center mb-4">{ex.prompt}</p>
      <div className="min-h-[52px] border border-dashed border-line rounded-[10px] p-2 flex flex-wrap gap-2 mb-3">
        {built.map((idx, pos) => (
          <button key={pos} onClick={() => removeAt(pos)} className="bg-panel border border-amber/50 rounded-md px-3 py-1.5 text-[15px]">{target[idx]}</button>
        ))}
        {built.length === 0 && <span className="text-dim text-[13px] self-center px-1">Tap tiles to build the sentence…</span>}
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {pool.map((idx) => (
          <button key={idx} onClick={() => add(idx)} className="bg-panel2 border border-line rounded-md px-3 py-1.5 text-[15px] hover:border-amber">{target[idx]}</button>
        ))}
      </div>
      {result !== null && <Explain text={ex.explain} ok={result} answer={target.join(' ')} />}
      {result === null
        ? <div className="mt-5 flex justify-center"><button onClick={check} disabled={built.length !== target.length} className="bg-amber text-bg font-bold rounded-[10px] px-6 py-2.5 disabled:opacity-40">Check</button></div>
        : <NextBtn onClick={() => onGrade(result)} />}
    </Card>
  );
}

function ErrorItem({ ex, onGrade }: { ex: GItem['ex']; onGrade: (ok: boolean) => void }) {
  const tokens = ex.prompt.split(/\s+/);
  const correct = ex.answer ?? 0;
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Card>
      <p className="text-[13px] text-dim text-center mb-3">Tap the wrong word.</p>
      <div className="flex flex-wrap gap-1.5 justify-center mb-2 text-[20px]">
        {tokens.map((t, idx) => {
          const state = picked === null ? 'idle' : idx === correct ? 'right' : idx === picked ? 'wrong' : 'idle';
          return (
            <button key={idx} onClick={() => picked === null && setPicked(idx)} disabled={picked !== null}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] text-green'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] text-red line-through'
                : 'hover:bg-panel2'}`}>{t}</button>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <p className="text-center text-[15px] mt-2">→ <span className="text-green font-semibold">{ex.fix}</span></p>
          <Explain text={ex.explain} ok={picked === correct} />
          <NextBtn onClick={() => onGrade(picked === correct)} />
        </>
      )}
    </Card>
  );
}

function Shell({ children, onExit, progress, score }: { children: React.ReactNode; onExit: () => void; progress?: string; score?: number | null }) {
  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center gap-2.5 mb-4">
        <button onClick={onExit} className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-amber" title="Back"><ArrowLeft size={18} /></button>
        {progress && <span className="text-[13px] text-dim font-mono">{progress}</span>}
        {score !== null && score !== undefined && <span className="ml-auto text-[13px] font-mono text-green">{score}% correct</span>}
      </div>
      {children}
    </div>
  );
}
function Empty() {
  return <div className="bg-panel border border-line rounded-2xl px-8 py-12 text-center"><h2 className="text-xl font-bold mb-1">Nothing due</h2><p className="text-dim">No grammar exercises are due for your selected levels.</p></div>;
}
function Summary({ done, correct }: { done: number; correct: number }) {
  return <div className="bg-panel border border-line rounded-2xl px-8 py-12 text-center">
    <div className="grid place-items-center w-14 h-14 rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}><Check className="text-green" /></div>
    <h2 className="text-2xl font-bold mb-1">Drill complete</h2><p className="text-dim">{correct}/{done} correct. Misses logged to Blind Spots.</p>
  </div>;
}
