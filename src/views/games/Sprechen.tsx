// Sprechen — say the word, and watch the print come into register.
//
// The logic is in `lib/pronounce.ts` (tested); the microphone in `lib/speech.ts`.
// This file is the gate, the plate and the round.
//
// ## Two things this screen must not do
//
// It must not pass the recogniser off as an examiner. The honesty line sits
// under every result, not in a help page.
//
// And it must not record before the learner knows where the audio goes. When
// the browser can only recognise in its cloud, the first thing on screen is a
// plain question, and nothing listens until it is answered yes.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Mic, RotateCcw, Volume2 } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import Chip from '../../components/ui/Chip.tsx';
import { WORDS } from '../../data/index.ts';
import { genderColor, speakDe } from '../../lib/ui.ts';
import { MAX_OFFSET, pickWords, registration, scoreAttempt, verdict, type Verdict } from '../../lib/pronounce.ts';
import { installLocal, listen, speechMode, stopListening, type SpeechMode } from '../../lib/speech.ts';
import type { CEFR } from '../../types.ts';

const ROUND = 8;

const LABEL: Record<Verdict, { text: string; tone: 'good' | 'accent' | 'bad' }> = {
  clear: { text: 'Klar', tone: 'good' },
  close: { text: 'Fast', tone: 'accent' },
  again: { text: 'Nochmal', tone: 'bad' },
};

export default function Sprechen({ level, onExit }: { level: CEFR; onExit: () => void }) {
  const [mode, setMode] = useState<SpeechMode | null>(null);
  const [consent, setConsent] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => { speechMode().then(setMode); return stopListening; }, []);

  const install = async () => {
    setInstalling(true);
    const ok = await installLocal();
    setInstalling(false);
    setMode(ok ? 'local' : await speechMode());
  };

  const ready = mode === 'local' || (mode === 'remote' && consent);

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <button onClick={onExit}
          className="tap-44 flex items-center gap-1.5 text-2xs font-mono uppercase tracking-widest text-dim hover:text-accent">
          <ArrowLeft size={13} /> Zurück
        </button>
        <span className="font-mono text-2xs uppercase tracking-widest text-dim">
          Sprechen · {level}{mode === 'local' ? ' · auf dem Gerät' : ''}
        </span>
      </div>

      {mode === null && <Card pad="md"><p className="text-sm text-dim">Mikrofon wird geprüft…</p></Card>}

      {mode === 'none' && (
        <Card pad="md">
          <p className="text-sm leading-relaxed">
            This browser has no German speech recognition. Sprechen works in Chrome, Edge and Safari.
          </p>
        </Card>
      )}

      {mode === 'downloadable' && (
        <Card pad="md">
          <p className="text-sm leading-relaxed mb-3">
            Your browser can recognise German <strong>on this device</strong> after a one-time download.
            Nothing you say would leave your computer.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={install} disabled={installing}><Download size={14} /> {installing ? 'Downloading…' : 'Download German'}</Button>
            <Button variant="quiet" onClick={() => setMode('remote')}>Use the browser’s online service instead</Button>
          </div>
        </Card>
      )}

      {mode === 'remote' && !consent && (
        <Card pad="md">
          <p className="text-sm leading-relaxed mb-3">
            In this browser, speech recognition runs on the browser maker’s servers (Google for Chrome,
            Apple for Safari). Your recording goes to them, not to Lexi — Lexi has no server and never
            sees it. Nothing is recorded until you say yes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setConsent(true)}><Mic size={14} /> Yes, use the microphone</Button>
            <Button variant="quiet" onClick={onExit}>No thanks</Button>
          </div>
        </Card>
      )}

      {ready && <Round level={level} local={mode === 'local'} />}
    </div>
  );
}

type Result = { score: number; heard: string; verdict: Verdict };

function Round({ level, local }: { level: CEFR; local: boolean }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const words = useMemo(() => pickWords(WORDS, level, seed, ROUND), [level, seed]);
  const [i, setI] = useState(0);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState<Verdict[]>([]);

  const word = words[i];

  const attempt = useCallback(async () => {
    if (!word || listening) return;
    setError(null);
    setListening(true);
    try {
      const heard = await listen(local);
      const { score, best } = scoreAttempt(word.term, heard);
      setResult({ score, heard: best || heard[0]?.transcript || '', verdict: verdict(score) });
    } catch (e) {
      const code = (e as Error).message;
      setError(code === 'not-allowed' || code === 'service-not-allowed'
        ? 'Microphone access was refused. Allow it in the browser’s site settings and try again.'
        : 'The recogniser stopped before it heard anything. Try again.');
    } finally {
      setListening(false);
    }
  }, [word, listening, local]);

  const next = () => {
    if (result) setTally((t) => [...t, result.verdict]);
    setResult(null);
    setError(null);
    setI((n) => n + 1);
  };

  const again = () => { setSeed(Math.floor(Math.random() * 1e9)); setI(0); setTally([]); setResult(null); };

  if (!words.length) return <Card pad="md"><p className="text-sm text-dim">No words at {level} to say yet.</p></Card>;

  if (!word) {
    const clear = tally.filter((v) => v === 'clear').length;
    return (
      <Card accent pad="md">
        <Kicker tone="accent" className="block mb-1">Fertig</Kicker>
        <p className="text-3xl font-bold tabular-nums mb-1">{clear}<span className="text-dim text-lg font-normal"> / {words.length} klar</span></p>
        <Honesty />
        <Button className="mt-3" onClick={again}><RotateCcw size={14} /> Noch einmal</Button>
      </Card>
    );
  }

  const offset = result ? registration(result.score) : MAX_OFFSET;

  return (
    <>
      <Card tone="card" pad="lg" className="mb-3 text-center">
        <Kicker className="block mb-4">{i + 1} / {words.length}</Kicker>
        <Plate text={word.term} offset={offset} boil={listening} ink={genderColor(word.gender)} />
        <p className="text-sm text-dim mt-4">{word.en}</p>
        {word.ipa && <p className="font-mono text-xs text-dim mt-1">/{word.ipa}/</p>}
        <div className="flex justify-center gap-2 mt-5">
          <Button variant="secondary" onClick={() => speakDe(word.term)} aria-label="Anhören"><Volume2 size={15} /> Anhören</Button>
          <Button onClick={attempt} disabled={listening}><Mic size={15} /> {listening ? 'Ich höre…' : result ? 'Nochmal sprechen' : 'Sprechen'}</Button>
        </div>
      </Card>

      {error && <p role="alert" className="text-sm text-red-txt mb-3">{error}</p>}

      {result && (
        <Card pad="md" className="mb-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Chip tone={LABEL[result.verdict].tone}>{LABEL[result.verdict].text}</Chip>
            <span className="text-sm text-dim">
              Gehört: <span lang="de" className="text-txt font-semibold">{result.heard || '—'}</span>
            </span>
          </div>
          <Honesty />
          <Button className="mt-3" onClick={next}>Weiter</Button>
        </Card>
      )}
    </>
  );
}

/** The word printed in three passes. The key plate is the real text; the pink
 *  and blue passes are decoration that drifts `offset` px out of register. */
function Plate({ text, offset, boil, ink }: { text: string; offset: number; boil: boolean; ink?: string }) {
  const pass = (color: string, dx: number, dy: number) => (
    <span aria-hidden className={`riso-plate absolute inset-0 ${boil ? 'riso-boil' : ''}`}
      style={{
        color,
        transform: `translate(${dx}px, ${dy}px)`,
        transition: 'transform .36s steps(4, end)',
        ['--bx' as string]: `${dx}px`, ['--by' as string]: `${dy}px`,
      }}>
      {text}
    </span>
  );
  return (
    <p lang="de" className="headword relative inline-block text-5xl font-semibold leading-tight">
      {pass('var(--color-riso-pink)', offset, -offset * 0.4)}
      {pass('var(--color-riso-blue)', -offset, offset * 0.6)}
      {/* Not blended: in register, the key plate covers both passes exactly, so a
          clear word reads in its own gender ink rather than a multiplied black. */}
      <span className="relative" style={{ color: ink ?? 'var(--color-txt)' }}>{text}</span>
    </p>
  );
}

function Honesty() {
  return (
    <p className="text-2xs text-dim leading-relaxed">
      This compares the word with what your browser’s speech recogniser wrote down. Recognisers
      mishear accents a person would understand, so “Fast” or “Nochmal” means listen and try
      again — not that your German is wrong. Nothing here is saved.
    </p>
  );
}
