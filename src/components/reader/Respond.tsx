// Write back.
//
// PEDAGOGY.md's standing headline is that Lexi measures the receptive half of what
// it has built the machinery for. This is the productive half, attached to the one
// place a learner has something to say: an article they just read about a subject
// they chose.
//
// The prompt asks for two to four sentences and offers up to three words from the
// article to try — pushed output with words met minutes ago is retrieval in
// context, which is the strongest form of practice the evidence describes.
//
// Feedback is optional (it needs an AI key) and never marks anything: no score, no
// FSRS grade, no effect on any number in the app. What is kept is the writing
// itself, in the learner's journal, because having written is the point.
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Sparkles, Loader2, NotebookPen, Check } from 'lucide-react';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import Kicker from '../ui/Kicker.tsx';
import UmlautBar from '../UmlautBar.tsx';
import { aiReady, correctWriting, AiError } from '../../lib/ai.ts';
import { addJournal, updateJournal, type Correction } from '../../lib/news/library.ts';
import { correctionDiff } from '../../lib/news/diff.ts';
import { listen, speechMode, stopListening, type SpeechMode } from '../../lib/speech.ts';
import { studyLevel } from '../../store.ts';
import type { Word } from '../../types.ts';

const KIND_LABEL: Record<string, string> = {
  gender: 'gender', case: 'case', verb: 'verb form', 'word-order': 'word order', spelling: 'spelling',
  'word-choice': 'word choice', preposition: 'preposition', other: 'other',
};

export default function Respond({ articleId, title, targets, onSettings }: {
  articleId: string;
  title: string;
  /** Words from this article worth trying to use. */
  targets: Word[];
  onSettings?: () => void;
}) {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'saved'>('idle');
  const [result, setResult] = useState<Correction | null>(null);
  /** The text the correction was made against — the learner may keep editing. */
  const [checked, setChecked] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mic, setMic] = useState<SpeechMode | null>(null);
  const [listening, setListening] = useState(false);
  const [consent, setConsent] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { speechMode().then(setMic).catch(() => setMic('none')); }, []);

  const words = targets.slice(0, 3).map((w) => w.term.replace(/^(der|die|das)\s+/, ''));
  // A stem test, not a word test: *Konzept* is used in *Konzepte*, *lauten* in
  // *lautet*. Plain string search — the word is learner-facing data, not a pattern.
  const used = (w: string) => text.toLowerCase().includes(w.toLowerCase().slice(0, Math.max(4, w.length - 2)));

  const dictate = async () => {
    if (!mic || mic === 'none') return;
    if (mic === 'remote' && !consent) { setConsent(true); return; }
    setListening(true);
    try {
      const heard = await listen(mic === 'local');
      const best = heard[0]?.transcript?.trim();
      if (best) setText((t) => (t.trim() ? `${t.trim()} ${best}` : best));
    } catch { /* denied or no speech — the text box still works */ }
    setListening(false);
  };

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    // Keep the writing first, feedback or not.
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
      setState('saved');
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Could not get feedback this time.');
      setState('saved');
    }
  };

  return (
    <Card tone="panel" pad="md">
      <Kicker className="flex items-center gap-1.5"><NotebookPen size={12} /> Your turn</Kicker>
      <h2 lang="de" className="headword text-xl font-semibold mt-1">Was denkst du?</h2>
      <p className="text-sm text-dim mt-1">
        Two to four sentences, in German, about what you just read. Your opinion, a question, what it means for you.
      </p>
      {words.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-dim">
          Try to use:
          {words.map((w) => (
            <span key={w} lang="de"
              className={`rounded-full border px-2 py-0.5 ${used(w) ? 'border-green/50 text-green' : 'border-line text-txt'}`}>
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
        className="mt-3 w-full rounded-md bg-panel2 border border-line p-3 text-base leading-relaxed focus:border-accent focus:outline-none"
      />
      <div className="mt-2"><UmlautBar targetRef={box} value={text} onChange={setText} /></div>

      {consent && mic === 'remote' && !listening && (
        <p className="mt-2 text-xs text-dim">
          This browser recognises speech in its maker’s cloud, so your recording would go there (never to Lexi).{' '}
          <button className="underline decoration-dotted hover:text-accent" onClick={() => { void dictate(); }}>Record anyway</button>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={submit} disabled={!text.trim() || state === 'checking'}>
          {state === 'checking'
            ? <><Loader2 size={14} className="animate-spin" /> Reading your German…</>
            : aiReady() ? <><Sparkles size={14} /> Check my German</> : <>Save to my journal</>}
        </Button>
        {mic && mic !== 'none' && (
          <Button variant="secondary" size="md" onClick={() => (listening ? (stopListening(), setListening(false)) : void dictate())}
            aria-pressed={listening}>
            {listening ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Say it</>}
          </Button>
        )}
        {state === 'saved' && !result && !error && (
          <span className="text-xs text-dim">
            Saved to your journal.{!aiReady() && onSettings && (
              <> <button className="underline decoration-dotted hover:text-accent" onClick={onSettings}>Add an AI key</button> for corrections.</>
            )}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-txt">{error} Your text is saved.</p>}

      {result && (
        <div className="mt-4 border-t border-line pt-3 flex flex-col gap-3">
          <p className="text-sm">{result.verdict}</p>
          {result.issues.length > 0 ? (
            <>
              <p lang="de" className="text-base leading-relaxed">
                {correctionDiff(checked, result.corrected).map((p, i) =>
                  p.changed ? <mark key={i} className="bg-transparent text-accent font-semibold underline decoration-2 underline-offset-4">{p.text}</mark> : <span key={i}>{p.text}</span>)}
              </p>
              <ul className="flex flex-col gap-2">
                {result.issues.map((x, i) => (
                  <li key={i} className="rounded-md bg-panel2 border border-line px-3 py-2 text-sm">
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
              <Kicker>How a native speaker might put it</Kicker>
              <p lang="de" className="text-sm mt-1 leading-relaxed">{result.natural}</p>
            </div>
          )}
          {result.tip && <p className="text-sm"><b>Next:</b> {result.tip}</p>}
          <p className="text-2xs text-dim">
            AI feedback can be wrong, especially about style. It never changes your cards, your schedule or any number in Lexi.
          </p>
        </div>
      )}
    </Card>
  );
}
