// Der Tutor — AI speaking & writing coach. Respond (by typing or by voice) to a
// German prompt; get instant CEFR-rated feedback — corrections with reasons, a
// more natural phrasing, and a follow-up question that turns it into a
// conversation. Errors feed Blind Spots. Personalised via lib/tutor.
import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Volume2, Sparkles, Loader2, Check, Shuffle, MessagesSquare, KeyRound, ArrowRight } from 'lucide-react';
import { chat } from '../lib/ai.ts';
import { buildMessages, parseFeedback, tasksForLevel, learnerProfile, type Feedback } from '../lib/tutor.ts';
import { aiConfig, logMiss } from '../store.ts';
import { useStore } from '../useStore.ts';
import { speak } from '../lib/tts.ts';
import UmlautBar from '../components/UmlautBar.tsx';

const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export default function Tutor({ onOpenSettings }: { onOpenSettings: () => void }) {
  useStore();
  const { level } = learnerProfile();
  const tasks = useMemo(() => tasksForLevel(level), [level]);
  const [task, setTask] = useState(() => tasks[Math.floor(Math.random() * tasks.length)].de);
  const [answer, setAnswer] = useState('');
  const [mode, setMode] = useState<'write' | 'speak'>('write');
  const [loading, setLoading] = useState(false);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [err, setErr] = useState('');
  const [turns, setTurns] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const hasKey = !!aiConfig().key;

  // speech recognition
  const [listening, setListening] = useState(false);
  const recog = useRef<any>(null);
  useEffect(() => () => { try { recog.current?.stop(); } catch { /* */ } }, []);
  const toggleMic = () => {
    if (!SR) { setErr('Speech input isn’t supported in this browser. Try typing instead.'); return; }
    if (listening) { recog.current?.stop(); setListening(false); return; }
    const r = new SR(); recog.current = r;
    r.lang = 'de-DE'; r.interimResults = true; r.continuous = true;
    let base = answer ? answer + ' ' : '';
    r.onresult = (e: any) => {
      let txt = '';
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setAnswer(base + txt);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start(); setListening(true);
  };

  const newTask = () => {
    const next = tasks[Math.floor(Math.random() * tasks.length)].de;
    setTask(next); setAnswer(''); setFb(null); setErr('');
  };

  const submit = async () => {
    if (!answer.trim() || loading) return;
    if (!hasKey) { setErr('Add an API key in Settings to use the tutor.'); return; }
    if (listening) { recog.current?.stop(); setListening(false); }
    setLoading(true); setErr(''); setFb(null);
    try {
      const content = await chat(buildMessages(task, answer), aiConfig());
      const parsed = parseFeedback(content);
      parsed.corrections.forEach((c) => c.tag && logMiss(c.tag));
      setFb(parsed); setTurns((t) => t + 1);
    } catch (e: any) {
      setErr(e?.message || 'The tutor could not respond. Check your provider in Settings.');
    } finally { setLoading(false); }
  };

  const continueConversation = () => {
    if (!fb?.followup) return;
    setTask(fb.followup); setAnswer(''); setFb(null);
  };

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex items-center gap-2.5 mb-1">
        <MessagesSquare size={20} className="text-amber" />
        <h1 className="text-[20px] sm:text-[22px] font-bold">AI tutor</h1>
        <span className="text-[11px] text-dim border border-line rounded-full px-2 py-0.5">~{level}</span>
        {turns > 0 && <span className="text-[11px] text-dim ml-auto">{turns} exchange{turns === 1 ? '' : 's'} today</span>}
      </div>
      <p className="text-dim text-[13px] mb-4">Answer in German — by typing or speaking. Get instant, exam-style feedback.</p>

      {!hasKey && (
        <button onClick={onOpenSettings} className="w-full flex items-center gap-3 bg-panel border border-line rounded-[16px] px-4 py-3 mb-4 text-left hover:border-amber transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber flex-shrink-0"><KeyRound size={17} /></span>
          <span className="flex-1"><span className="block text-[15px] font-semibold">Connect an AI provider</span>
            <span className="block text-[13px] text-dim">The tutor needs an API key (free OpenRouter works). Set it in Settings.</span></span>
          <ArrowRight size={15} className="text-amber" />
        </button>
      )}

      {/* The prompt */}
      <div className="bg-card border border-line rounded-[16px] p-5 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-amber uppercase tracking-[2px] font-semibold">Your prompt</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => speak(task)} title="Hear it" className="grid place-items-center w-11 h-11 rounded-md text-dim hover:text-amber hover:bg-panel2"><Volume2 size={15} /></button>
            <button onClick={newTask} title="New prompt" className="grid place-items-center w-11 h-11 rounded-md text-dim hover:text-amber hover:bg-panel2"><Shuffle size={15} /></button>
          </div>
        </div>
        <p className="text-[20px] sm:text-[24px] font-semibold leading-snug">{task}</p>
      </div>

      {/* Input */}
      <div className="bg-panel border border-line rounded-[16px] p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex rounded-lg bg-panel2 border border-line p-0.5 text-[13px]">
            <button onClick={() => setMode('write')} className={`px-3 py-1 rounded-md ${mode === 'write' ? 'bg-amber text-bg font-semibold' : 'text-dim'}`}>Write</button>
            <button onClick={() => setMode('speak')} className={`px-3 py-1 rounded-md ${mode === 'speak' ? 'bg-amber text-bg font-semibold' : 'text-dim'}`}>Speak</button>
          </div>
          {mode === 'speak' && (
            <button onClick={toggleMic}
              className={`flex items-center gap-1.5 text-[13px] rounded-full px-3 py-1.5 border transition-colors ${listening ? 'border-red text-red-txt' : 'border-line text-dim hover:border-amber'}`}>
              {listening ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Record (de-DE)</>}
              {listening && <span className="live-dot ml-1" />}
            </button>
          )}
        </div>
        <textarea ref={taRef} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5}
          placeholder={mode === 'speak' ? 'Tap Record and speak — your words appear here…' : 'Type your answer in German…'}
          className="w-full bg-panel2 border border-line rounded-lg p-3 text-[15px] leading-relaxed outline-none focus:border-amber resize-y" />
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <UmlautBar targetRef={taRef} value={answer} onChange={setAnswer} />
          <button onClick={submit} disabled={!answer.trim() || loading}
            className="ml-auto flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 text-[15px] hover:brightness-105 disabled:opacity-40">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {loading ? 'Checking…' : 'Get feedback'}
          </button>
        </div>
        {err && <p className="text-red-txt text-[13px] mt-2">{err}</p>}
      </div>

      {/* Feedback */}
      {fb && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-line rounded-[16px] p-5 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono font-bold text-[15px] text-amber border border-line rounded-md px-2 py-0.5">{fb.cefr || '—'}</span>
            <span className="text-[13px] text-txt">{fb.feedback}</span>
          </div>

          {fb.corrections.length > 0 ? (
            <div className="space-y-2.5 mb-4">
              {fb.corrections.map((c, i) => (
                <div key={i} className="bg-panel2 border border-line rounded-lg p-3 text-[15px]">
                  <div><span className="text-red line-through">{c.original}</span> <ArrowRight size={12} className="inline text-dim mx-1" /> <span className="text-green font-semibold">{c.fixed}</span></div>
                  <div className="text-dim text-[13px] mt-1">{c.why}{c.tag && <span className="ml-1.5 text-[11px] border border-line rounded-full px-1.5 py-0.5">{c.tag}</span>}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-green text-[13px] mb-4 flex items-center gap-1.5"><Check size={15} /> No corrections — clean work.</p>}

          {fb.natural && (
            <div className="mb-4">
              <div className="text-[11px] text-dim uppercase tracking-[1px] mb-1">More natural</div>
              <p className="text-[15px] leading-relaxed italic">„{fb.natural}"
                <button onClick={() => speak(fb.natural)} className="ml-2 align-middle text-dim hover:text-amber"><Volume2 size={14} /></button>
              </p>
            </div>
          )}

          {fb.followup && (
            <div className="border-t border-line pt-3">
              <div className="text-[11px] text-dim uppercase tracking-[1px] mb-1">Follow-up</div>
              <div className="flex items-start gap-2">
                <p className="text-[15px] font-semibold flex-1">{fb.followup}
                  <button onClick={() => speak(fb.followup)} className="ml-2 align-middle text-dim hover:text-amber"><Volume2 size={14} /></button>
                </p>
              </div>
              <button onClick={continueConversation} className="mt-3 flex items-center gap-2 bg-panel2 border border-line rounded-[10px] px-4 py-2 text-[13px] hover:border-amber font-semibold">
                Answer this <ArrowRight size={14} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
