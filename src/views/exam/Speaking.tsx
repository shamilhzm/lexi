// The mündliche Prüfung — and the reason this feature exists.
//
// The oral is a quarter of the marks and the only part a learner cannot rehearse
// from a book, because a book prints one model answer and a model answer is the
// least useful thing you can give someone who is about to freeze. What helps is
// seeing the *same* answer at three strengths: the two-sentence version that
// still passes, the version that sounds like a solid B1, and the reach. On the
// day you step down that ladder rather than off it.
//
// Usable without a sitting, deliberately. Someone with the exam next week wants
// this surface at a bus stop, not behind a 90-minute reading paper.
import { useEffect, useRef, useState } from 'react';
import { Check, MessagesSquare, Play, Volume2 } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Chip from '../../components/ui/Chip.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import { speak } from '../../lib/tts.ts';
import { playTrack, stopTrack } from '../../lib/exam-audio.ts';
import { SPEAK_MAX, scoreSpeaking, type Band, type Model, type Redemittel, type SpeakingMarks, type SpeakingTopic } from '../../lib/exam.ts';
import type { CEFR } from '../../types.ts';
import { CriterionRow, speakingCriteria } from './SelfAssess.tsx';

const TEILE = [1, 2, 3] as const;
const TEIL_NAME: Record<1 | 2 | 3, string> = {
  1: 'Kontaktaufnahme',
  2: 'Gespräch über ein Thema',
  3: 'Gemeinsam eine Aufgabe lösen',
};

export default function Speaking({ topics, redemittel, marks, onMarks }: {
  topics: SpeakingTopic[];
  redemittel: Redemittel[];
  /** Present only inside a sitting — the lab on its own does not score. */
  marks?: Partial<Record<1 | 2 | 3, SpeakingMarks>>;
  onMarks?: (teil: 1 | 2 | 3, m: SpeakingMarks) => void;
}) {
  const [teil, setTeil] = useState<1 | 2 | 3>(1);
  const forTeil = topics.filter((t) => t.teil === teil);
  const [topicId, setTopicId] = useState<string>(forTeil[0]?.id ?? '');
  const topic = forTeil.find((t) => t.id === topicId) ?? forTeil[0];

  useEffect(() => { stopTrack(); }, [teil, topicId]);
  useEffect(() => () => stopTrack(), []);

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <MessagesSquare size={20} className="text-accent" />
          <h2 className="text-lg sm:text-xl font-bold">Mündliche Prüfung</h2>
        </div>
        <p className="text-dim text-xs leading-relaxed">
          Three parts, and the part of the exam a book cannot rehearse. Marked on four criteria,
          of which only one is grammar — the other three are vocabulary, task behaviour and sound.
        </p>
      </div>

      {/* Teil selector — the three parts are genuinely different tasks, so this
          is navigation rather than a filter. */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TEILE.map((t) => (
          <Card as="button" key={t} nested pad="none" accent={teil === t}
            onClick={() => { setTeil(t); setTopicId(topics.find((x) => x.teil === t)?.id ?? ''); }}
            aria-pressed={teil === t}
            className={`tap-44 px-2.5 py-2 text-left transition-colors ${teil === t ? '' : 'hover:border-accent'}`}>
            <span className={`block font-mono text-2xs ${teil === t ? 'text-accent' : 'text-dim'}`}>TEIL {t}</span>
            <span className="block text-xs font-semibold leading-tight mt-0.5">{TEIL_NAME[t]}</span>
            <span className="block font-mono text-2xs text-dim mt-0.5">{SPEAK_MAX[t]} Punkte</span>
          </Card>
        ))}
      </div>

      {forTeil.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {forTeil.map((t) => (
            <button key={t.id} onClick={() => setTopicId(t.id)} aria-pressed={t.id === topic?.id}
              className={`tap-44 rounded-md border px-3 py-2 text-xs font-semibold transition-colors
                ${t.id === topic?.id ? 'border-accent text-accent' : 'border-line text-dim hover:border-accent'}`}>
              {t.title}
            </button>
          ))}
        </div>
      )}

      {topic && <TopicView topic={topic} />}

      <Redemittelbank groups={redemittel} />

      {onMarks && (
        <SpeakingMarksPanel teil={teil} value={marks?.[teil]} onChange={(m) => onMarks(teil, m)} />
      )}
    </div>
  );
}

function TopicView({ topic }: { topic: SpeakingTopic }) {
  return (
    <>
      <Card pad="md" className="mb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
          <h3 className="text-base font-bold">{topic.title}</h3>
          <Chip tone="dim">{topic.minutes}</Chip>
        </div>
        <p className="text-sm leading-relaxed">{topic.task}</p>
        <p className="text-xs text-dim leading-relaxed mt-2">{topic.taskEn}</p>

        {topic.notes && (
          <div className="mt-3 pt-3 border-t border-line">
            <Kicker tone="accent" className="block mb-1.5">
              {topic.teil === 3 ? 'Ihre Notizen' : 'Worauf es ankommt'}
            </Kicker>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {topic.notes.map((n, i) => (
                <li key={i} className="text-sm flex gap-2"><span className="text-accent">–</span><span>{n}</span></li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {topic.sheets && (
        <div className="grid sm:grid-cols-2 gap-2.5 mb-4">
          {topic.sheets.map((s) => (
            <Card key={s.label} tone="sunken" pad="sm">
              <Kicker tone="accent" className="block mb-1.5">{s.label}</Kicker>
              <p className="text-sm leading-relaxed">{s.text}</p>
              <ul className="mt-2 space-y-1">
                {s.facts.map((f, i) => (
                  <li key={i} className="text-xs text-dim flex gap-2"><span>·</span><span>{f}</span></li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {topic.prompts.map((p) => <PromptCard key={p.id} prompt={p} />)}
      </div>
    </>
  );
}

const BAND_TONE: Record<CEFR, string> = {
  A1: 'var(--color-a1)',
  A2: 'var(--color-green)',
  B1: 'var(--color-accent)',
  B2: 'var(--color-b2)',
  C1: 'var(--color-c1)',
  C2: 'var(--color-c2)',
};

function PromptCard({ prompt }: { prompt: SpeakingTopic['prompts'][number] }) {
  // B1 is the default because it is the target. Opening on A2 would teach the
  // safe version first, which is the right thing to *reach for* under pressure
  // and the wrong thing to practise.
  // The middle rung, whatever it is. A B1 paper ladders A2/B1/B2 and an A1 paper
  // A1/A2/B1, so hard-coding 'B1' showed an empty card on the A1 paper.
  const [band, setBand] = useState<Model['band']>(prompt.models[1]?.band ?? prompt.models[0].band);
  const model = prompt.models.find((m) => m.band === band) ?? prompt.models[0];
  const [showEn, setShowEn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);

  const playAll = () => {
    setPlaying(true);
    playTrack(model.lines.map((l) => ({ text: l.de })), 1, () => { if (live.current) setPlaying(false); });
  };

  return (
    <Card pad="md">
      <p className="text-base font-semibold leading-snug">{prompt.de}</p>
      <p className="text-xs text-dim mt-1">{prompt.en}</p>
      {prompt.cue && <Kicker className="block mt-2">{prompt.cue}</Kicker>}

      <div className="flex flex-wrap items-center gap-2 mt-3 mb-3">
        {prompt.models.map((m) => (
          <button key={m.band} onClick={() => setBand(m.band)} aria-pressed={m.band === band}
            className={`tap-44 rounded-md border px-3 py-2 text-xs font-semibold transition-colors
              ${m.band === band ? 'bg-panel2' : 'border-line text-dim hover:border-accent'}`}
            style={m.band === band ? { borderColor: BAND_TONE[m.band], color: BAND_TONE[m.band] } : undefined}>
            {m.label} <span className="font-mono opacity-70">{m.band}</span>
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={playing ? () => { stopTrack(); setPlaying(false); } : playAll}
          className="tap-44 rounded-md border border-line px-3 py-2 text-xs font-semibold text-dim hover:border-accent hover:text-accent transition-colors">
          <Play size={13} className="inline mr-1" />{playing ? 'Stopp' : 'Vorlesen'}
        </button>
      </div>

      <p className="text-xs text-dim leading-relaxed mb-3 italic">{model.note}</p>

      <div className="space-y-2">
        {model.lines.map((l, i) => (
          <div key={i} className="flex items-start gap-2.5">
            {l.who && (
              <span className="grid place-items-center w-6 h-6 rounded-md bg-panel2 font-mono text-2xs font-bold flex-shrink-0 mt-0.5">
                {l.who}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed">{l.de}</p>
              {showEn && <p className="text-xs text-dim leading-relaxed mt-0.5">{l.en}</p>}
            </div>
            <button onClick={() => speak(l.de)} aria-label="Diesen Satz hören"
              className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-accent flex-shrink-0">
              <Volume2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={() => setShowEn((s) => !s)}
        className="tap-44 mt-2 text-2xs font-mono uppercase tracking-widest text-dim hover:text-accent">
        {showEn ? 'Hide English' : 'Show English'}
      </button>
    </Card>
  );
}

function Redemittelbank({ groups }: { groups: Redemittel[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <Card as="button" pad="none" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:border-accent transition-colors">
        <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0"><MessagesSquare size={16} /></span>
        <span className="flex-1">
          <span className="block text-base font-semibold">Redemittel</span>
          <span className="block text-2xs text-dim">
            The phrases the oral is actually built from — {groups.reduce((n, g) => n + g.phrases.length, 0)} of them, grouped by what they do.
          </span>
        </span>
      </Card>
      {open && (
        <div className="grid sm:grid-cols-2 gap-2.5 mt-2.5">
          {groups.map((g) => (
            <Card key={g.group} tone="sunken" pad="sm">
              <Kicker tone="accent" className="block mb-2">{g.group}</Kicker>
              <ul className="space-y-2">
                {g.phrases.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm">{p.de}</span>
                      <span className="block text-2xs text-dim">{p.en}</span>
                    </span>
                    <button onClick={() => speak(p.de)} aria-label={`„${p.de}" hören`}
                      className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-accent flex-shrink-0">
                      <Volume2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SpeakingMarksPanel({ teil, value, onChange }: {
  teil: 1 | 2 | 3; value?: SpeakingMarks; onChange: (m: SpeakingMarks) => void;
}) {
  const criteria = speakingCriteria(teil);
  const set = (key: string, b: Band) => onChange({
    expression: 'B', task: 'B', accuracy: 'B', pronunciation: 'B', ...value, [key]: b,
  } as SpeakingMarks);
  const done = !!value;

  return (
    <div className="mt-6">
      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-base font-bold">Teil {teil} bewerten</h3>
        {done && (
          <Chip tone="good"><Check size={11} /> {scoreSpeaking(teil, value!)} / {SPEAK_MAX[teil]}</Chip>
        )}
      </div>
      <p className="text-xs text-dim leading-relaxed mb-3">
        Record yourself doing the task, then mark it against the examiners' four criteria. The app will
        not score this for you — nothing can, honestly — but the criteria are the syllabus, and applying
        them to your own recording is the exercise.
      </p>
      <div className="space-y-2.5">
        {criteria.map((c) => (
          <CriterionRow key={c.key} c={c}
            value={value?.[c.key as keyof SpeakingMarks] as Band | undefined}
            onPick={(b) => set(c.key, b)} />
        ))}
      </div>
    </div>
  );
}
