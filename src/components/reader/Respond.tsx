// Write back.
//
// The feed and Üben are both about single words; this is the one place in the app
// where the learner produces German of their own, attached to the one moment they
// have something to say: an article they just read about a subject they chose.
//
// Two to four sentences, with up to three words from the article to try — pushed
// output with words met minutes ago is retrieval in context, which is the
// strongest form of practice the evidence describes.
//
// Feedback needs an AI key and never marks anything: no score, no FSRS grade, no
// effect on any number in the app. What is kept is the writing itself, in the
// learner's journal, because having written is the point.
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Sparkles, Loader2, Check } from 'lucide-react';
import UmlautBar from '../UmlautBar.tsx';
import { aiReady, correctWriting, AiError } from '../../lib/ai.ts';
import { addJournal, updateJournal, type Correction } from '../../lib/news/library.ts';
import { correctionDiff } from '../../lib/news/diff.ts';
import { createListener, support, type Listener } from '../../lib/asr.ts';
import { studyLevel } from '../../store.ts';

const KIND_LABEL: Record<string, string> = {
  gender: 'gender', case: 'case', verb: 'verb form', 'word-order': 'word order', spelling: 'spelling',
  'word-choice': 'word choice', preposition: 'preposition', other: 'other',
};
const pill = 'tap-44 inline-flex items-center gap-1.5 rounded-full px-4 h-11 text-sm font-semibold active:scale-95 transition disabled:opacity-40';

export default function Respond({ articleId, title, targets, onSettings }: {
  articleId: string;
  title: string;
  /** Words from this article worth trying to use — headwords, article stripped. */
  targets: string[];
  onSettings: () => void;
}) {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'saved'>('idle');
  const [result, setResult] = useState<Correction | null>(null);
  /** The text the correction was made against — the learner may keep editing. */
  const [checked, setChecked] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [asked, setAsked] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const listener = useRef<Listener | null>(null);
  const mic = support();

  useEffect(() => () => listener.current?.stop(), []);

  const words = targets.slice(0, 3);
  // A stem test, not a word test: *Konzept* is used in *Konzepte*. Plain string
  // search — the word is learner-facing data, never a pattern (LESSONS, Class 12).
  const used = (w: string) => text.toLowerCase().includes(w.toLowerCase().slice(0, Math.max(4, w.length - 2)));

  const dictate = () => {
    if (listening) { listener.current?.stop(); setListening(false); return; }
    // Every browser recogniser sends audio to its maker; say so before the first
    // recording, once, and never record without the tap that follows.
    if (!asked) { setAsked(true); return; }
    listener.current ??= createListener({
      onHeard: (h) => {
        if (!h.final || !h.text.trim()) return;
        setText((t) => (t.trim() ? `${t.trim()} ${h.text.trim()}` : h.text.trim()));
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    listener.current.listen();
    setListening(true);
  };

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    const entry = entryId
      ? (updateJournal(entryId, { text: body, correction: null }), entryId)
      : addJournal({ articleId, title, text: body, correction: null }).id;
    setEntryId(entry);
    if (!aiReady()) { setState('saved'); return; }
    setState('checking');
    try {
      const c = await correctWriting({ text: body, title, level: studyLevel(), targets: words });
      setResult(c);
      setChecked(body);
      updateJournal(entry, { correction: c });
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Could not get feedback this time.');
    }
    setState('saved');
  };

  return (
    <section aria-labelledby="respond-h" className="mt-10 border-t border-line pt-6">
      <p className="font-mono text-2xs uppercase tracking-widest text-accent">Your turn</p>
      <h2 id="respond-h" lang="de" className="headword text-2xl font-bold mt-1">Was denkst du?</h2>
      <p className="text-sm text-dim mt-1">
        Two to four sentences, in German, about what you just read — your opinion, a question, what it means for you.
      </p>
      {words.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-dim">
          Try to use
          {words.map((w) => (
            <span key={w} lang="de"
              className={`rounded-full px-2.5 py-1 ${used(w) ? 'bg-green-d text-green' : 'glass text-txt'}`}>
              {used(w) && <Check size={10} className="inline -mt-0.5 mr-0.5" />}{w}
            </span>
          ))}
        </p>
      )}

      <textarea
        ref={box}
        value={text}
        onChange={(e) => { setText(e.target.value); if (state === 'saved') setState('idle'); }}
        rows={4}
        lang="de"
        spellCheck={false}
        aria-label="Your response in German"
        placeholder="Ich finde, dass …"
        className="mt-3 w-full rounded-xl bg-panel2 border border-line p-3.5 text-base leading-relaxed focus:border-accent focus:outline-none"
      />
      <div className="mt-2"><UmlautBar targetRef={box} value={text} onChange={setText} /></div>

      {asked && !listening && mic.available && (
        <p className="mt-2 text-xs text-dim">
          Your browser recognises speech in its maker’s cloud, so the recording goes there — never to Lexi. Tap
          {' '}<b className="text-txt">Say it</b> again to record.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={submit} disabled={!text.trim() || state === 'checking'}
          className={`${pill} bg-accent text-bg`}>
          {state === 'checking'
            ? <><Loader2 size={14} className="animate-spin" /> Reading your German…</>
            : aiReady() ? <><Sparkles size={14} /> Check my German</> : <>Save to my journal</>}
        </button>
        {mic.available && (
          <button onClick={dictate} aria-pressed={listening} className={`${pill} glass`}>
            {listening ? <><MicOff size={14} /> Stop</> : <><Mic size={14} className="text-accent" /> Say it</>}
          </button>
        )}
        {state === 'saved' && !result && !error && (
          <span className="text-xs text-dim">
            Saved to your journal.{!aiReady() && (
              <> <button className="underline decoration-dotted hover:text-accent" onClick={onSettings}>Add an AI key</button> for corrections.</>
            )}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-txt">{error} Your text is saved.</p>}

      {result && (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-sm">{result.verdict}</p>
          {result.issues.length > 0 ? (
            <>
              <p lang="de" className="text-lg leading-relaxed">
                {correctionDiff(checked, result.corrected).map((p, i) =>
                  p.changed
                    ? <mark key={i} className="bg-transparent text-accent font-semibold underline decoration-2 underline-offset-4">{p.text}</mark>
                    : <span key={i}>{p.text}</span>)}
              </p>
              <ul className="flex flex-col gap-2">
                {result.issues.map((x, i) => (
                  <li key={i} className="rounded-lg bg-panel2 px-3 py-2 text-sm">
                    <span lang="de" className="line-through text-dim">{x.original}</span>{' → '}
                    <span lang="de" className="font-semibold">{x.fix}</span>
                    <span className="ml-2 font-mono text-2xs uppercase tracking-wider text-dim">{KIND_LABEL[x.kind] ?? x.kind}</span>
                    <p className="text-xs text-dim mt-0.5">{x.why}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-green flex items-center gap-1.5"><Check size={14} /> No errors found.</p>
          )}
          {result.natural && result.natural.trim() !== result.corrected.trim() && (
            <div>
              <p className="font-mono text-2xs uppercase tracking-widest text-dim">How a native speaker might put it</p>
              <p lang="de" className="text-base mt-1 leading-relaxed">{result.natural}</p>
            </div>
          )}
          {result.tip && <p className="text-sm"><b>Next:</b> {result.tip}</p>}
          <p className="text-2xs text-dim">
            AI feedback can be wrong, especially about style. It never changes your cards, your schedule or any number in Lexi.
          </p>
        </div>
      )}
    </section>
  );
}
