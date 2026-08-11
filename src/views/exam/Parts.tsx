// The five item types, rendered as the paper prints them.
//
// One rule runs through all of them: the answer sheet is a *sheet*. Every item
// in a Teil is on one scrollable surface, numbered as telc numbers it (1–60
// continuously, not 1–5 five times), because a real candidate skips item 14,
// answers 15–20 and comes back — and a wizard that shows one question at a time
// makes that impossible while feeling more modern.
//
// `reveal` is the only mode switch. Before it, the sheet says nothing about
// whether an answer is right; after it, every item shows the key and the reason.
// Nothing in between — a paper that turns a chip green as you tap it is not a
// practice exam, it is a quiz.
import { useEffect, useRef, useState } from 'react';
import { Check, Ear, Pause, Play, Volume2, X } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import { clozeSegments, type AdsPart, type AudioBlock, type ClozePart, type MatchPart, type McPart, type Part, type Responses, type TfPart } from '../../lib/exam.ts';
import { audioAvailable, playTrack, stopTrack } from '../../lib/exam-audio.ts';
import Rich from './Rich.tsx';

export interface PartProps {
  part: Part;
  responses: Responses;
  onAnswer: (n: number, key: string) => void;
  /** Show the key and the explanation. */
  reveal: boolean;
  /** Time is up, or the part has been checked — the sheet is read-only. */
  locked: boolean;
}

export default function PartView(props: PartProps) {
  const { part } = props;
  return (
    <div className="w-full">
      <Rubric part={part} />
      {part.kind === 'match' && <MatchView {...props} part={part} />}
      {part.kind === 'mc' && <McView {...props} part={part} />}
      {part.kind === 'ads' && <AdsView {...props} part={part} />}
      {part.kind === 'cloze' && <ClozeView {...props} part={part} />}
      {part.kind === 'tf' && <TfView {...props} part={part} />}
    </div>
  );
}

function Rubric({ part }: { part: Part }) {
  const first = part.items[0]?.n;
  const last = part.items[part.items.length - 1]?.n;
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
        <h2 className="text-lg sm:text-xl font-bold">{part.label}</h2>
        <span className="font-mono text-2xs text-dim tracking-wider">
          {part.skill.toUpperCase()} · {first}–{last} · {fmtPts(part.items.length * part.pointsPerItem)} PUNKTE
        </span>
      </div>
      <Card tone="sunken" pad="sm" className="text-sm">
        <p className="leading-relaxed">{part.rubric}</p>
        <p className="text-dim text-xs mt-2 leading-relaxed"><Rich>{part.rubricEn}</Rich></p>
      </Card>
    </div>
  );
}

const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

// ---- the shared answer control ---------------------------------------------
// One grid of letters, used by three of the five item types. Squares rather than
// pills because a letter key is a *coordinate*, not a word, and because 44px
// squares survive a phone where thirteen labelled buttons in a row would not.

function LetterGrid({ keys, value, answer, reveal, disabled, onPick, label }: {
  keys: string[];
  value?: string;
  answer: string;
  reveal: boolean;
  disabled: boolean;
  onPick: (k: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {keys.map((k) => {
        const picked = value === k;
        const isKey = reveal && k === answer;
        const isMiss = reveal && picked && k !== answer;
        return (
          <button
            key={k}
            role="radio"
            aria-checked={picked}
            aria-label={`${label}: ${k}`}
            disabled={disabled}
            onClick={() => onPick(k)}
            className={`tap-44-sq grid place-items-center w-9 h-9 rounded-md border font-mono text-sm font-bold
              transition-colors disabled:pointer-events-none
              ${isKey ? 'border-green bg-green-d text-green'
                : isMiss ? 'border-red bg-red-d text-red-txt'
                : picked ? 'border-amber bg-amber text-bg'
                : 'border-line bg-panel2 text-dim hover:border-amber hover:text-amber'}`}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

/** The verdict strip under an item once the keys are out. */
function Why({ n, given, answer, why, reveal }: {
  n: number; given?: string; answer: string; why?: string; reveal: boolean;
}) {
  if (!reveal) return null;
  const right = given === answer;
  return (
    <div className={`mt-2 flex items-start gap-2 rounded-md px-2.5 py-2 text-xs leading-relaxed
      ${right ? 'bg-green-d' : 'bg-red-d'}`}>
      <span className={`grid place-items-center w-4 h-4 rounded-full flex-shrink-0 mt-0.5
        ${right ? 'text-green' : 'text-red-txt'}`}>
        {right ? <Check size={14} /> : <X size={14} />}
      </span>
      <span className="min-w-0">
        <span className={`font-mono font-bold ${right ? 'text-green' : 'text-red-txt'}`}>
          {n}. {answer.toUpperCase()}
        </span>
        {!right && given && <span className="font-mono text-dim"> · you put {given.toUpperCase()}</span>}
        {!right && !given && <span className="font-mono text-dim"> · left blank</span>}
        {why && <span className="block text-txt mt-1"><Rich>{why}</Rich></span>}
      </span>
    </div>
  );
}

// ---- Leseverstehen Teil 1 · headings ---------------------------------------

function MatchView({ part, responses, onAnswer, reveal, locked }: PartProps & { part: MatchPart }) {
  const keys = part.options.map((o) => o.k);
  // Which headings are already spoken for, so the sheet shows what a candidate
  // tracks with a pencil. telc does not forbid reusing one here, but five texts
  // and five real headings means a repeat is always a mistake somewhere.
  const used = new Set(Object.values(responses).filter(Boolean));

  return (
    <>
      <Card pad="sm" className="mb-4">
        <Kicker tone="accent" className="block mb-2">Die Überschriften</Kicker>
        <ol className="space-y-1.5">
          {part.options.map((o) => (
            <li key={o.k} className="flex gap-2.5 text-sm">
              <span className={`font-mono font-bold flex-shrink-0 w-4 ${used.has(o.k) ? 'text-amber' : 'text-dim'}`}>{o.k}</span>
              <span className={used.has(o.k) ? 'text-dim' : ''}>{o.text}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="space-y-3">
        {part.texts.map((t) => {
          const item = part.items.find((i) => i.n === t.n)!;
          return (
            <Card key={t.n} pad="sm">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center w-8 h-8 rounded-md bg-panel2 font-mono font-bold text-sm flex-shrink-0">{t.n}</span>
                <p className="text-sm leading-relaxed flex-1 min-w-0">{t.body}</p>
              </div>
              <div className="mt-3 pl-11">
                <LetterGrid
                  label={`Text ${t.n}`} keys={keys} value={responses[t.n]} answer={item.answer}
                  reveal={reveal} disabled={locked} onPick={(k) => onAnswer(t.n, k)} />
                <Why n={t.n} given={responses[t.n]} answer={item.answer} why={item.why} reveal={reveal} />
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ---- Leseverstehen Teil 2 · the article ------------------------------------

function McView({ part, responses, onAnswer, reveal, locked }: PartProps & { part: McPart }) {
  return (
    <>
      {part.audio && <AudioBar audio={part.audio} reveal={reveal} />}
      {part.passage && (
        <Card pad="md" className="mb-4">
          <h3 className="text-xl font-bold mb-1">{part.passage.title}</h3>
          {part.passage.standfirst && (
            <p className="text-sm text-dim mb-3 leading-relaxed">{part.passage.standfirst}</p>
          )}
          <div className="space-y-3">
            {part.passage.paras.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed">{p}</p>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {part.questions.map((q) => {
          const item = part.items.find((i) => i.n === q.n)!;
          const given = responses[q.n];
          return (
            <Card key={q.n} pad="sm">
              <p className="text-sm font-semibold mb-2.5">
                <span className="font-mono text-dim mr-2">{q.n}.</span>{q.stem}
              </p>
              {q.stimulus && (
                <div className="grid sm:grid-cols-2 gap-2 mb-2.5">
                  {q.stimulus.map((st) => (
                    <Card key={st.label} tone="sunken" pad="sm">
                      <Kicker tone="accent" className="block mb-1">{st.label}</Kicker>
                      <p className="text-xs leading-relaxed whitespace-pre-line">{st.body}</p>
                    </Card>
                  ))}
                </div>
              )}
              <div className="space-y-1.5">
                {q.options.map((o) => (
                  <OptionRow key={o.k} opt={o} picked={given === o.k} isKey={reveal && o.k === item.answer}
                    isMiss={reveal && given === o.k && o.k !== item.answer}
                    disabled={locked} onPick={() => onAnswer(q.n, o.k)} />
                ))}
              </div>
              <Why n={q.n} given={given} answer={item.answer} why={item.why} reveal={reveal} />
            </Card>
          );
        })}
      </div>
    </>
  );
}

function OptionRow({ opt, picked, isKey, isMiss, disabled, onPick }: {
  opt: { k: string; text: string };
  picked: boolean; isKey: boolean; isMiss: boolean; disabled: boolean; onPick: () => void;
}) {
  return (
    <button
      role="radio" aria-checked={picked} disabled={disabled} onClick={onPick}
      className={`tap-44 w-full flex items-start gap-2.5 rounded-md border px-3 py-2 text-left text-sm
        transition-colors disabled:pointer-events-none
        ${isKey ? 'border-green bg-green-d'
          : isMiss ? 'border-red bg-red-d'
          : picked ? 'border-amber bg-panel2'
          : 'border-line bg-panel2 hover:border-amber'}`}
    >
      <span className={`font-mono font-bold flex-shrink-0 ${isKey ? 'text-green' : isMiss ? 'text-red-txt' : picked ? 'text-amber' : 'text-dim'}`}>
        {opt.k})
      </span>
      <span className="min-w-0">{opt.text}</span>
    </button>
  );
}

// ---- Leseverstehen Teil 3 · the adverts ------------------------------------

function AdsView({ part, responses, onAnswer, reveal, locked }: PartProps & { part: AdsPart }) {
  // `x` is a real answer here and is deliberately set apart from the letters:
  // it is the one key candidates forget exists, and it is worth 2.5 points.
  const keys = part.ads.map((a) => a.k);
  const used = new Set(Object.values(responses).filter((k) => k && k !== 'x'));

  return (
    <>
      <div className="space-y-2.5 mb-5">
        {part.situations.map((s) => {
          const item = part.items.find((i) => i.n === s.n)!;
          return (
            <Card key={s.n} pad="sm">
              <p className="text-sm leading-relaxed mb-2.5">
                <span className="font-mono text-dim mr-2">{s.n}.</span>{s.text}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <LetterGrid
                  label={`Situation ${s.n}`} keys={keys} value={responses[s.n]} answer={item.answer}
                  reveal={reveal} disabled={locked} onPick={(k) => onAnswer(s.n, k)} />
                <span className="w-px h-6 bg-line mx-0.5" aria-hidden />
                <LetterGrid
                  label={`Situation ${s.n}, nichts passt`} keys={['x']} value={responses[s.n]} answer={item.answer}
                  reveal={reveal} disabled={locked} onPick={() => onAnswer(s.n, 'x')} />
              </div>
              <Why n={s.n} given={responses[s.n]} answer={item.answer} why={item.why} reveal={reveal} />
            </Card>
          );
        })}
      </div>

      <Kicker tone="accent" className="block mb-2">Die Anzeigen</Kicker>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {part.ads.map((a) => (
          <Card key={a.k} tone="sunken" pad="sm" className={used.has(a.k) ? 'opacity-60' : ''}>
            <div className="flex items-start gap-2.5">
              <span className="grid place-items-center w-7 h-7 rounded-md bg-panel font-mono font-bold text-sm flex-shrink-0">{a.k}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug">{a.head}</p>
                <p className="text-xs text-dim leading-relaxed mt-1">{a.body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

// ---- Sprachbausteine · both cloze modes ------------------------------------

function ClozeView({ part, responses, onAnswer, reveal, locked }: PartProps & { part: ClozePart }) {
  const segs = clozeSegments(part.body);
  const bankUsed = new Set(Object.entries(responses)
    .filter(([n]) => part.items.some((i) => i.n === Number(n)))
    .map(([, k]) => k).filter(Boolean));
  const wordFor = (k?: string) => part.bank?.find((b) => b.k === k)?.text;

  return (
    <>
      {part.mode === 'bank' && part.bank && (
        <Card pad="sm" className="mb-4">
          <Kicker tone="accent" className="block mb-2">Der Kasten</Kicker>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {part.bank.map((b) => (
              <span key={b.k} className={`font-mono text-xs ${bankUsed.has(b.k) ? 'text-dim line-through' : ''}`}>
                <span className="text-dim">{b.k})</span> {b.text}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card pad="md" className="mb-4">
        <p className="text-sm leading-loose whitespace-pre-line">
          {segs.map((s, i) => (typeof s === 'string'
            ? <span key={i}>{s}</span>
            : <GapChip key={i} n={s} shown={part.mode === 'bank' ? wordFor(responses[s]) : responses[s]} />))}
        </p>
      </Card>

      <div className="space-y-2.5">
        {part.items.map((item) => (
          <Card key={item.n} pad="sm">
            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-8 h-8 rounded-md bg-panel2 font-mono font-bold text-sm flex-shrink-0">{item.n}</span>
              <div className="flex-1 min-w-0">
                {part.mode === 'mc' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(part.options?.[item.n] ?? []).map((o) => {
                      const picked = responses[item.n] === o.k;
                      const isKey = reveal && o.k === item.answer;
                      const isMiss = reveal && picked && o.k !== item.answer;
                      return (
                        <button key={o.k} role="radio" aria-checked={picked} disabled={locked}
                          onClick={() => onAnswer(item.n, o.k)}
                          className={`tap-44 rounded-md border px-3 py-2 text-sm transition-colors disabled:pointer-events-none
                            ${isKey ? 'border-green bg-green-d'
                              : isMiss ? 'border-red bg-red-d'
                              : picked ? 'border-amber bg-panel2' : 'border-line bg-panel2 hover:border-amber'}`}>
                          <span className={`font-mono mr-1.5 ${isKey ? 'text-green' : isMiss ? 'text-red-txt' : picked ? 'text-amber' : 'text-dim'}`}>{o.k})</span>
                          {o.text}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <LetterGrid
                    label={`Lücke ${item.n}`} keys={(part.bank ?? []).map((b) => b.k)}
                    value={responses[item.n]} answer={item.answer}
                    reveal={reveal} disabled={locked} onPick={(k) => onAnswer(item.n, k)} />
                )}
                <Why n={item.n} given={responses[item.n]} answer={item.answer} why={item.why} reveal={reveal} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function GapChip({ n, shown }: { n: number; shown?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1 mx-0.5 px-1.5 rounded border-b-2 align-baseline
      ${shown ? 'border-amber bg-panel2' : 'border-dim'}`}>
      <span className="font-mono text-2xs text-dim">{n}</span>
      <span className="font-semibold text-sm">{shown ?? '     '}</span>
    </span>
  );
}

// ---- true/false, heard or read ---------------------------------------------

/** The playback controls. Lifted out of the listening view when Goethe A1 landed
 *  a *multiple-choice* listening part: the transport is the same, the item shape
 *  is not, so it belongs to neither. */
function AudioBar({ audio, reveal }: { audio: AudioBlock; reveal: boolean }) {
  // The exam's playback count is a rule, not a suggestion: a part heard once in
  // the hall and twice here has quietly removed the hardest thing about it.
  const [played, setPlayed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; stopTrack(); }; }, []);

  const lines = [
    ...(audio.intro ? [{ text: audio.intro }] : []),
    ...audio.tracks.flatMap((t) => t.lines.map((l) => ({ text: l.text }))),
  ];
  const canPlay = audioAvailable() && (reveal || played < audio.plays) && !busy;
  const play = () => {
    setBusy(true);
    if (!reveal) setPlayed((p) => p + 1);
    playTrack(lines, slow ? 0.75 : 1, () => { if (live.current) setBusy(false); });
  };

  return (
    <Card pad="sm" className="mb-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><Ear size={18} /></span>
        <div className="flex-1 min-w-[10rem]">
          <p className="text-sm font-semibold">
            {audio.plays === 1 ? 'Sie hören diesen Teil nur einmal.' : 'Sie hören diesen Teil zweimal.'}
          </p>
          <p className="text-2xs text-dim font-mono">
            {reveal ? 'Replay as often as you like' : `${Math.max(audio.plays - played, 0)} of ${audio.plays} plays left`}
          </p>
        </div>
        {busy
          ? <Button variant="secondary" size="sm" onClick={() => { stopTrack(); setBusy(false); }}><Pause size={14} /> Stop</Button>
          : <Button size="sm" onClick={play} disabled={!canPlay}>
              <Play size={14} />{played === 0 ? 'Abspielen' : 'Noch einmal'}
            </Button>}
        <button onClick={() => setSlow((v) => !v)} aria-pressed={slow}
          className={`tap-44 rounded-md border px-3 py-2 text-xs font-semibold transition-colors
            ${slow ? 'border-amber text-amber' : 'border-line text-dim hover:border-amber'}`}>
          <Volume2 size={13} className="inline mr-1" />langsam
        </button>
      </div>
      {!audioAvailable() && (
        <p className="text-xs text-red-txt mt-2">
          This device has no speech synthesis. Read the script after checking — the items still work.
        </p>
      )}
      <p className="text-2xs text-dim mt-2 leading-relaxed">
        One synthetic voice reads every speaker. The real exam uses several voices, background noise
        and natural hesitation, so treat a comfortable score here as a floor rather than a forecast.
      </p>
    </Card>
  );
}

/** The script, revealed only once the keys are out — same reason the playback
 *  count is enforced. */
function Script({ audio }: { audio: AudioBlock }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <Button variant="quiet" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hörtext ausblenden' : 'Hörtext anzeigen'}
      </Button>
      {open && (
        <Card tone="sunken" pad="sm" className="mt-2.5 space-y-3">
          {audio.intro && <p className="text-xs text-dim italic">{audio.intro}</p>}
          {audio.tracks.map((t, ti) => (
            <div key={ti}>
              <Kicker tone="accent" className="block mb-1">{t.n ? `${t.n} · ${t.label}` : t.label}</Kicker>
              <div className="space-y-1.5">
                {t.lines.map((l, li) => (
                  <p key={li} className="text-sm leading-relaxed">
                    {l.who && <span className="font-mono text-2xs text-dim mr-2">{l.who}</span>}
                    {l.text}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function TfView({ part, responses, onAnswer, reveal, locked }: PartProps & { part: TfPart }) {
  return (
    <>
      {part.audio && <AudioBar audio={part.audio} reveal={reveal} />}
      {part.texts?.map((t, i) => (
        <Card key={i} pad="md" className="mb-3">
          {t.label && <Kicker tone="accent" className="block mb-1.5">{t.label}</Kicker>}
          <p className="text-sm leading-relaxed whitespace-pre-line">{t.body}</p>
        </Card>
      ))}

      <div className="space-y-2.5">
        {part.statements.map((s) => {
          const item = part.items.find((i) => i.n === s.n)!;
          const given = responses[s.n];
          return (
            <Card key={s.n} pad="sm">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center w-8 h-8 rounded-md bg-panel2 font-mono font-bold text-sm flex-shrink-0">{s.n}</span>
                <p className="text-sm leading-relaxed flex-1 min-w-0 pt-1.5">{s.text}</p>
              </div>
              <div className="mt-2.5 pl-11 flex gap-2">
                {(['r', 'f'] as const).map((k) => {
                  const picked = given === k;
                  const isKey = reveal && k === item.answer;
                  const isMiss = reveal && picked && k !== item.answer;
                  return (
                    <button key={k} role="radio" aria-checked={picked} disabled={locked}
                      onClick={() => onAnswer(s.n, k)}
                      className={`tap-44 flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors disabled:pointer-events-none
                        ${isKey ? 'border-green bg-green-d text-green'
                          : isMiss ? 'border-red bg-red-d text-red-txt'
                          : picked ? 'border-amber bg-amber text-bg' : 'border-line bg-panel2 hover:border-amber'}`}>
                      {k === 'r' ? '+ richtig' : '– falsch'}
                    </button>
                  );
                })}
              </div>
              <div className="pl-11">
                <Why n={s.n} given={given} answer={item.answer} why={item.why} reveal={reveal} />
              </div>
            </Card>
          );
        })}
      </div>

      {reveal && part.audio && <Script audio={part.audio} />}
    </>
  );
}
