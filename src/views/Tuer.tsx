// Der Türsteher, phase 0: the door, and the guide to setting it up.
// The logic and the reasons live in lib/tuer.ts; this is only the screen.
//
// It renders instead of the app, not inside it (main.tsx): the door is one job,
// reached from a Shortcuts automation, and a tab bar under it would be four
// other ways to stay out of Reddit that are not the three words.
import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { buildBriefing, levels, review, statusOf, logAttempt, logMiss } from '../store.ts';
import { buildMixedSession, type SessionItem } from '../session.ts';
import { loadDetailFor } from '../data/detail.ts';
import { inflections } from '../lib/inflections.ts';
import { haptic } from '../lib/ui.ts';
import { Rating, type Grade } from '../srs.ts';
import { ModeItem, MODE_TAG } from './drills.tsx';
import { GenderTerm, SpeakButton } from '../components/Reveal.tsx';
import Button from '../components/ui/Button.tsx';
import Card from '../components/ui/Card.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import {
  parseGateHash, pickGateItems, passUrl, gateUrl, recordGate, todayAtDoor,
  GATE_APPS, PASS_MINUTES, PASS_SHORTCUT, GATE_SHORTCUT, type GateApp, type GateDay,
} from '../lib/tuer.ts';

const store = typeof localStorage === 'undefined'
  ? { getItem: () => null, setItem: () => {} }
  : localStorage;

function leaveToLexi() {
  location.hash = '#/feed';
  location.reload();
}

export default function Tuer() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => {
      if (!parseGateHash(location.hash)) { location.reload(); return; }
      setHash(location.hash);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const app = parseGateHash(hash)?.app ?? null;
  return (
    <div className="min-h-[100dvh] bg-bg text-txt flex flex-col"
      style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-[520px] mx-auto px-4 flex-1 flex flex-col">
        {app ? <Gate key={app.slug} app={app} /> : <Setup />}
      </div>
    </div>
  );
}

// ---- the door ---------------------------------------------------------------

type Phase = 'loading' | 'cards' | 'done' | 'closed';

function Gate({ app }: { app: GateApp }) {
  const [items, setItems] = useState<SessionItem[] | null>(null);
  useEffect(() => {
    let live = true;
    // Drills need the example sentences before the queue is built (see Review).
    loadDetailFor([...levels()].map((level) => ({ level }))).then(() => {
      if (!live) return;
      const queue = buildMixedSession({ kind: 'custom', name: 'Today’s session', ids: buildBriefing().ids });
      setItems(pickGateItems(queue));
    });
    return () => { live = false; };
  }, []);

  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  useEffect(() => {
    if (items) setPhase(items.length ? 'cards' : 'done');
  }, [items]);
  const item = items?.[i];

  const next = () => {
    const n = i + 1;
    setI(n);
    if (items && n >= items.length) setPhase('done');
  };
  const gradeFlip = (g: Grade) => {
    if (!item) return;
    review(item.srsId, g);
    haptic(g === Rating.Again ? 'wrong' : 'grade');
    next();
  };
  const gradeDrill = (ok: boolean, detail?: Parameters<typeof logMiss>[2]) => {
    if (!item || item.type === 'flip') return;
    review(item.srsId, ok ? Rating.Good : Rating.Again);
    logAttempt(MODE_TAG[item.type]);
    if (!ok) logMiss(MODE_TAG[item.type], item.word.term, detail);
    haptic(ok ? 'grade' : 'wrong');
    next();
  };

  const letIn = (event: 'door' | 'skip') => {
    recordGate(store, event, i);
    location.href = passUrl(app);
  };
  const close = () => {
    recordGate(store, 'close', i);
    setPhase('closed');
  };

  if (phase === 'closed') return <Closed app={app} day={todayAtDoor(store)} />;

  if (phase === 'done') {
    const n = items?.length ?? 0;
    return (
      <div className="flex-1 flex flex-col">
        <div className="mt-10 flex flex-col gap-2">
          <Kicker>Türsteher</Kicker>
          <h1 className="display text-3xl leading-tight">{app.name} is open for {PASS_MINUTES} minutes.</h1>
          <p className="text-dim text-sm">
            {n === 0
              ? 'Nothing is due right now, so the door is open.'
              : `${n} ${n === 1 ? 'word' : 'words'} reviewed. They’re in your schedule now.`}
          </p>
        </div>
        <div className="mt-auto flex flex-col items-center gap-2 pt-8">
          <Button block size="lg" onClick={() => letIn('door')}>Open {app.name}</Button>
          <button onClick={close} className="tap-44 text-sm text-dim underline underline-offset-4">Close it, I’m done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" role="progressbar" aria-label="Cards answered"
          aria-valuemin={0} aria-valuemax={items?.length ?? 0} aria-valuenow={i}>
          {(items ?? []).map((_, k) => (
            <span key={k} className={`h-1.5 w-6 rounded-full ${k < i ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
        <button onClick={() => letIn('skip')} className="tap-44 text-sm text-dim">Skip</button>
      </div>

      <div className="mt-4">
        <h1 lang="de" className="display text-2xl leading-tight">Drei Wörter, dann {app.name}</h1>
        <p className="text-dim text-sm mt-1">Three words, then {app.name} is open for {PASS_MINUTES} minutes.</p>
      </div>

      <div className="mt-5 flex-1 flex flex-col">
        {phase === 'loading' || !item
          ? <p className="text-dim text-sm">Finding your words…</p>
          : item.type === 'flip'
          ? <Flip key={`${i}:${item.srsId}`} item={item} onGrade={gradeFlip} />
          : <ModeItem key={`${i}:${item.srsId}`} mode={item.type} word={item.word}
              forms={inflections()?.[item.word.id]} onGrade={gradeDrill} />}
      </div>

      <button onClick={close} className="tap-44 mt-4 self-center text-sm text-dim underline underline-offset-4">
        Close {app.name}
      </button>
    </div>
  );
}

/** A flip, as small as it can be: the word, then its meaning, then how it went. */
function Flip({ item, onGrade }: { item: SessionItem; onGrade: (g: Grade) => void }) {
  const [open, setOpen] = useState(false);
  const w = item.word;
  const first = statusOf(item.srsId) === 'new';
  const ex = w.ex?.[0];
  return (
    <div className="flex-1 flex flex-col">
      <Card tone="card" pad="lg" className="flex flex-col items-center text-center gap-3">
        <Kicker>{first ? 'New word' : `${w.pos} · ${w.level}`}</Kicker>
        <GenderTerm term={w.term} gender={w.gender} fit className="headword hw-front font-bold leading-tight" />
        <SpeakButton text={w.term} />
        {open && (
          <>
            <p className="text-lg leading-snug">{w.en}</p>
            {ex?.de && <p lang="de" className="text-dim italic">{ex.de}</p>}
          </>
        )}
      </Card>
      <div className="mt-auto pt-6">
        {!open
          ? <Button block size="lg" onClick={() => setOpen(true)}>Show answer</Button>
          : (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" onClick={() => onGrade(Rating.Again)}>
                <X size={16} aria-hidden /> {first ? 'Still learning' : 'Didn’t know'}
              </Button>
              <Button size="lg" onClick={() => onGrade(Rating.Good)}>
                <Check size={16} aria-hidden /> {first ? 'Got it' : 'Knew it'}
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}

function tallyLine(day: GateDay): string {
  const part = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return [part(day.doors, 'door', 'doors'), part(day.words, 'word', 'words'), `${day.closes} closed`, part(day.skips, 'skip', 'skips')].join(' · ');
}

function Closed({ app, day }: { app: GateApp; day: GateDay }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
      <h1 lang="de" className="display text-3xl">{app.name} bleibt zu.</h1>
      <p className="text-dim text-sm">{app.name} stays closed.</p>
      <p className="font-mono text-2xs text-dim tabular-nums">Today · {tallyLine(day)}</p>
      <Button variant="secondary" onClick={leaveToLexi}>Open Lexi</Button>
    </div>
  );
}

// ---- the setup guide ----------------------------------------------------------

function CopyField({ id, value }: { id: string; value: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => setDone(true), () => {
      (document.getElementById(id) as HTMLInputElement | null)?.select();
    });
  };
  return (
    <div className="flex items-center gap-2 mt-2">
      <input id={id} readOnly value={value} aria-label="Text to copy"
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-0 font-mono text-xs bg-panel2 rounded-md px-2.5 py-2 border border-line" />
      <button onClick={copy} className="tap-44 grid place-items-center w-[44px] h-[44px] rounded-full text-accent"
        aria-label={done ? 'Copied' : 'Copy'}>
        {done ? <Check size={18} /> : <Copy size={18} />}
      </button>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5 mt-5">
      <h2 className="font-semibold text-base"><span className="font-mono text-accent mr-2">{n}</span>{title}</h2>
      <div className="mt-2 text-sm leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  );
}

const A = ({ children }: { children: React.ReactNode }) => <b className="font-semibold">{children}</b>;

function Setup() {
  const base = `${location.origin}${location.pathname}`;
  const day = useMemo(() => todayAtDoor(store), []);
  return (
    <div className="pb-10">
      <Kicker className="mt-6 block">Türsteher · setup</Kicker>
      <h1 lang="de" className="display text-4xl leading-tight mt-1">Der Türsteher</h1>
      <p className="text-dim mt-2">
        Open Reddit, Instagram or YouTube and Lexi asks three words first, then lets you in
        for {PASS_MINUTES} minutes. Two shortcuts and an automation do the work. It takes about
        ten minutes, once.
      </p>
      <p className="text-sm mt-3 bg-panel2 rounded-md px-3 py-2.5">
        The door opens Lexi in <A>Safari</A>, which keeps its own copy of your progress, separate
        from Lexi on your Home Screen. To study with the same words, export a backup from the Home
        Screen app and import it here in Safari.
      </p>

      <Step n={1} title={`The shortcut “${PASS_SHORTCUT}”`}>
        <p>Lexi runs this one when you finish. In Shortcuts, tap <A>+</A> and name it exactly:</p>
        <CopyField id="tuer-pass-name" value={PASS_SHORTCUT} />
        <p>Add these actions, in order:</p>
        <ol className="list-decimal pl-5 flex flex-col gap-1">
          <li><A>Adjust Date</A>: Add {PASS_MINUTES} minutes to Current Date.</li>
          <li><A>Format Date</A>: the Adjusted Date, Date Format <A>ISO 8601</A>.</li>
          <li><A>Save File</A>: the Formatted Date. Turn off Ask Where to Save, set the path to <code>lexi-pass.txt</code>, and turn on Overwrite If File Exists.</li>
          <li><A>Open URLs</A>: Shortcut Input.</li>
        </ol>
      </Step>

      <Step n={2} title={`The shortcut “${GATE_SHORTCUT}”`}>
        <p>The automation runs this one. Name it exactly:</p>
        <CopyField id="tuer-gate-name" value={GATE_SHORTCUT} />
        <ol className="list-decimal pl-5 flex flex-col gap-1">
          <li><A>Get File</A>: from the Shortcuts folder, path <code>lexi-pass.txt</code>. Turn off Error If Not Found.</li>
          <li><A>Get Dates from Input</A>: the File.</li>
          <li><A>If</A> Dates <A>is after</A> Current Date: add <A>Stop This Shortcut</A> inside the If.</li>
          <li><A>Text</A>: paste this, then add Shortcut Input at the very end:</li>
        </ol>
        <CopyField id="tuer-gate-url" value={gateUrl(base)} />
        <ol start={5} className="list-decimal pl-5">
          <li><A>Open URLs</A>: the Text.</li>
        </ol>
      </Step>

      <Step n={3} title="One automation per app">
        <p>In Shortcuts, open <A>Automation</A>, tap <A>+</A>, choose <A>App</A>, pick Reddit, tick <A>Is Opened</A> and <A>Run Immediately</A>. Then:</p>
        <ol className="list-decimal pl-5 flex flex-col gap-1">
          <li><A>Text</A>: <code>reddit</code></li>
          <li><A>Run Shortcut</A>: {GATE_SHORTCUT}, with the Text as its input.</li>
        </ol>
        <p>Repeat for each app, with its own word:</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
          {GATE_APPS.map((a) => <li key={a.slug}>{a.name}: {a.slug}</li>)}
        </ul>
      </Step>

      <Step n={4} title="Try it">
        <p>Open Reddit. Lexi should appear with three words. Answer them, tap <A>Open Reddit</A>, and Reddit should open again and stay open for {PASS_MINUTES} minutes.</p>
        <p>Or try the door here first, without leaving Lexi:</p>
        <div><Button variant="secondary" onClick={() => { location.hash = '#/tuer/reddit'; }}>Try the door</Button></div>
      </Step>

      <section className="border-t border-line pt-5 mt-5">
        <Kicker>Today at the door</Kicker>
        <p className="font-mono text-xs text-dim mt-1 tabular-nums">{tallyLine(day)}</p>
        <button onClick={leaveToLexi} className="tap-44 mt-4 text-sm text-accent underline underline-offset-4">Back to Lexi</button>
      </section>
    </div>
  );
}
