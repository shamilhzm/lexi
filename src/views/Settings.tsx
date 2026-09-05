// Einstellungen — device-local settings: appearance, review intensity, the HD
// German voice (Piper Thorsten, downloaded once and run in-browser), and backup /
// restore. Everything here lives in localStorage / the browser; nothing is sent
// anywhere.
import { useState, useRef, type ChangeEvent } from 'react';
import { Volume2, Check, Loader2, Download, Upload, Archive, X, Palette, Sun, Moon, Monitor, Gauge, Type, Music, CalendarClock, List, Layers, RefreshCw, Info, History, ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { hdVoice, setHdVoice, retention, setRetentionTarget, exportData, importData, textScale, setTextScale, sound, setSound, pace, setPace, PACE, statusOf, mutedModes, toggleDrillMode, setAllDrillModes, type Pace } from '../store.ts';
import { MODE_TAG, MODES, type Mode } from './drills.tsx';
import { WORDS } from '../data/index.ts';
import { useStore } from '../useStore.ts';
import { speak } from '../lib/tts.ts';
import { useHdVoice } from '../lib/useHdVoice.ts';
import { themePref, setThemePref, type ThemePref } from '../theme.ts';
import { BUILD, PREVIOUS_BUILD, buildLabel, checkForUpdate, updateNow, type UpdateState } from '../lib/build.ts';
import Card from '../components/ui/Card.tsx';
import Button, { buttonClass } from '../components/ui/Button.tsx';
import IconButton from '../components/ui/IconButton.tsx';

/** The one segmented-control style, shared by every toggle group on this page.
 *  Previously each group re-typed it with a slightly different "off" hover. */
const toggle = (on: boolean) =>
  // `tap-44` here reaches every toggle group on the page at once — theme, text
  // size and pace were all 33px, and Settings is the surface most likely to be
  // used one-handed on a phone.
  `tap-44 flex items-center gap-2 text-xs rounded-md px-3.5 py-2 border transition-colors ${
    on ? 'border-accent text-accent bg-panel2' : 'border-line text-dim hover:border-accent'}`;

const THEMES: { id: ThemePref; label: string; icon: LucideIcon }[] = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

const RETENTIONS: { v: number; label: string; hint: string }[] = [
  { v: 0.85, label: '85% · Relaxed', hint: 'Fewer reviews, a little more forgetting.' },
  { v: 0.9, label: '90% · Balanced', hint: 'The recommended sweet spot.' },
  { v: 0.95, label: '95% · Intensive', hint: 'More reviews, minimal forgetting.' },
];

/** Every drill a session can weave in. `MODES` is the source of truth, so this
 *  list cannot fall behind the drills that exist. */
const DRILL_MODES: Mode[] = MODES.map((m) => m.m);

export default function Settings({ onExit }: { onExit: () => void }) {
  useStore();
  const muted = mutedModes();
  const [update, setUpdate] = useState<UpdateState | null>(null);
  const [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true);
    setUpdate(await checkForUpdate());
    setChecking(false);
  };

  const { percent: dl, phase: hdPhase, error: hdErr, enable: enableHd } = useHdVoice();

  const [theme, setTheme] = useState<ThemePref>(themePref());
  const pickTheme = (p: ThemePref) => { setThemePref(p); setTheme(p); };

  const [pc, setPc] = useState<Pace>(pace());
  const pickPace = (p: Pace) => { setPace(p); setPc(p); };

  // A plain word list, for the tools Lexi is not: a spreadsheet, Anki, a printout
  // for the fridge. exportData() is a backup blob meant only for Lexi to read
  // back; this is the same knowledge in a format anything can open.
  const exportWordList = () => {
    const rows = [['German', 'English', 'Level', 'Status', 'Topic'].join('\t')];
    for (const w of WORDS) {
      if (w.kind !== 'word') continue;
      const st = statusOf(w.id);
      if (st === 'new') continue;   // a list of what you know, not the whole corpus
      rows.push([w.term, w.en, w.level, st, w.field].map((c) => String(c).replace(/\t/g, ' ')).join('\t'));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lexi-words-${new Date().toISOString().slice(0, 10)}.tsv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const [ret, setRet] = useState(retention());
  const pickRet = (r: number) => { setRetentionTarget(r); setRet(r); };

  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreErr, setRestoreErr] = useState('');
  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lexi-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  const onRestoreFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again later
    if (!file) return;
    if (!confirm('Restore this backup? It replaces the cards, streak, and progress on this device.')) return;
    setRestoreErr('');
    try {
      await importData(await file.text());
      location.reload(); // re-hydrate cleanly from the restored data
    } catch (err: any) {
      setRestoreErr(err?.message || 'Could not read that backup file.');
    }
  };

  return (
    <div className="w-full max-w-[640px] mx-auto">
      {/* Its own page since 2026-09-05, so its own h1 — it used to render inside
          Profile, which owned the heading and left this an h2 in the middle of
          somebody else's document. */}
      <div className="flex items-center gap-1.5 mb-4">
        <IconButton label="Back to profile" pull onClick={onExit}><ArrowLeft size={18} /></IconButton>
        <h1 className="text-xl font-bold ml-1.5">Settings</h1>
      </div>

      {/* Appearance */}
      <Card as="section" className="mb-4">
        <div className="flex items-center gap-2 mb-1"><Palette size={16} className="text-accent" /><h3 className="text-base font-semibold">Appearance</h3></div>
        <p className="text-dim text-xs mb-3">Lexi runs light by default — it’s a thing you read. Pick a fixed theme or follow your system.</p>
        <div className="flex flex-wrap gap-2">
          {THEMES.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => pickTheme(id)} aria-pressed={theme === id} className={toggle(theme === id)}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Text size — the rem ramp scales from the root. "Standard" defers to the
          browser/OS preference (incl. iOS Dynamic Type); a choice overrides it. */}
      <Card as="section" className="mb-4">
        <div className="flex items-center gap-2 mb-1"><Type size={16} className="text-accent" /><h3 className="text-base font-semibold">Text size</h3></div>
        <p className="text-dim text-xs mb-3">Standard follows your device’s text-size setting.</p>
        <div className="flex flex-wrap gap-2">
          {[{ v: 0.875, label: 'Compact' }, { v: 1, label: 'Standard' }, { v: 1.125, label: 'Large' }, { v: 1.25, label: 'Larger' }].map(({ v, label }) => (
            <button key={v} onClick={() => setTextScale(v)} aria-pressed={textScale() === v} className={toggle(textScale() === v)}>
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Sound — feedback cues, on by default; also mutable from the session header. */}
      <Card as="section" className="mb-4">
        <div className="flex items-center gap-2 mb-1"><Music size={16} className="text-accent" /><h3 className="text-base font-semibold">Sound</h3></div>
        <p className="text-dim text-xs mb-3">Soft cues as you answer — a tick when you’re right, a quieter falling note when you’re not, and a chime at the end of a session. You can also mute mid-session from the header.</p>
        <button onClick={() => setSound(!sound())} aria-pressed={sound()} className={toggle(sound())}>
          {sound() ? 'Sound on' : 'Sound off'}
        </button>
      </Card>

      {/* Review intensity (FSRS desired retention) */}
      <Card as="section" className="mb-4">
        <div className="flex items-center gap-2 mb-1"><Gauge size={16} className="text-accent" /><h3 className="text-base font-semibold">Review intensity</h3></div>
        <p className="text-dim text-xs mb-3">
          How hard the scheduler pushes. Higher retention means shorter intervals and
          more reviews per day, but you forget less. 90% is the recommended balance.
        </p>
        <div className="flex flex-wrap gap-2">
          {RETENTIONS.map(({ v, label, hint }) => (
            <button key={v} onClick={() => pickRet(v)} aria-pressed={ret === v}
              className={`flex flex-col items-start gap-0.5 text-left rounded-md px-3.5 py-2.5 border transition-colors min-w-[132px] ${ret === v ? 'border-accent bg-panel2' : 'border-line hover:border-accent'}`}>
              <span className={`text-base font-semibold ${ret === v ? 'text-accent' : ''}`}>{label}</span>
              <span className="text-2xs text-dim leading-tight">{hint}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* HD voice */}
      <Card as="section" className="mb-4">
        <div className="flex items-center gap-2 mb-1"><Volume2 size={16} className="text-accent" /><h3 className="text-base font-semibold">German voice</h3></div>
        <p className="text-dim text-xs mb-3">
          The HD voice is a native-German neural voice (Piper “Thorsten”) that runs on your device.
          It downloads once (~25 MB), then works offline — far better than the built-in browser voice.
          {/* Lexi says it works offline, and that is true of everything except this
              one step: enabling the voice fetches both a library and the voice
              itself over the network. Saying so here is cheaper than a learner
              discovering it on a train. */}
          <span className="block mt-1">
            Setting it up needs a connection and a few minutes — do it on wi-fi, not on the way to class.
            Until then Lexi uses your device’s built-in German voice, which works offline straight away.
          </span>
        </p>
        {hdVoice() ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-green text-xs"><Check size={15} /> HD voice on</span>
            <button onClick={() => speak('Guten Tag! Wie geht es dir heute?')} className="text-xs text-dim hover:text-accent">Test</button>
            <button onClick={() => setHdVoice(false)} className="text-xs text-dim hover:text-red-txt ml-auto">Turn off</button>
          </div>
        ) : hdPhase !== null ? (
          <div className="flex items-center gap-2 text-xs text-dim"><Loader2 size={15} className="animate-spin" />{' '}
            {hdPhase === 'downloading' ? `Downloading voice… ${dl ?? 0}%`
              : hdPhase === 'preparing' ? 'Unpacking the voice…'
              : 'Testing the voice…'}</div>
        ) : (
          <Button onClick={enableHd}><Download size={15} /> Enable HD German voice</Button>
        )}
        {hdErr && <p className="text-red-txt text-xs mt-2">{hdErr}</p>}
      </Card>

      {/* Your data — backup & restore (local-first insurance) */}
      <Card as="section" className="mt-4">
        <div className="flex items-center gap-2 mb-1"><Archive size={16} className="text-accent" /><h3 className="text-base font-semibold">Your data</h3></div>
        <p className="text-dim text-xs mb-3">
          Everything lives on this device. Export a backup to keep your cards, streak,
          and progress safe — or to move to another device. Importing replaces what’s
          on this device, so export first if unsure.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={doExport}><Download size={15} /> Export backup</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={14} className="text-accent" /> Import backup
          </Button>
          {/* A backup is only readable by Lexi. This is the same knowledge in a
              format a spreadsheet, Anki or a printout can open. */}
          <Button variant="quiet" onClick={exportWordList}>
            <List size={14} /> Export word list
          </Button>
          {/* Hidden, and driven by the button above — but it is still a real
              control in the tree, so it still needs a name. */}
          <input ref={fileRef} type="file" accept="application/json,.json" aria-label="Choose a Lexi backup file to import"
            onChange={onRestoreFile} className="hidden" tabIndex={-1} />
        </div>
        {restoreErr && <p className="text-red-txt text-xs mt-2 flex items-center gap-1.5"><X size={14} /> {restoreErr}</p>}
      </Card>

      {/* Which build is on this device.
          An offline-first service worker serves the shell from cache, so "is the
          phone running the fix that just shipped?" could only be answered by
          reloading and hoping — a fix that landed and a fix that did not looked
          identical. The stamp says what is running; the check asks the server what
          is deployed and compares. See lib/build.ts. */}
      <Card pad="none" className="p-4">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1"><Info size={16} className="text-accent" /> Version</h3>
        <p className="text-dim text-xs mb-3 max-w-[60ch]">
          What this device is running. If you’ve just been sent a fix, check here before
          deciding whether it worked.
        </p>
        <dl className="text-xs font-mono mb-3">
          <div className="flex gap-2"><dt className="text-dim w-16">built</dt><dd>{buildLabel()}</dd></div>
          <div className="flex gap-2"><dt className="text-dim w-16">commit</dt><dd>{BUILD.sha}</dd></div>
        </dl>

        {/* The version before the redesign, kept openable.
            A Vercel deployment URL is immutable, so "let me see how it used to
            work" costs a link rather than a feature flag, two UIs in one bundle,
            or a rollback nobody can undo.
            The caveat is stated rather than discovered: it is a different origin,
            so browser storage does not follow — that build opens empty. It is a
            place to compare the *experience*. Anyone who wants the comparison
            with real data has Backup and Restore a few centimetres above. */}
        <div className="border-t border-line pt-3 mt-1">
          <p className="text-xs font-semibold mb-1">Compare with the previous version</p>
          <p className="text-dim text-2xs mb-2.5 max-w-[56ch] leading-relaxed">
            The build from {PREVIOUS_BUILD.label}. It opens in a new tab and — because browser
            storage belongs to one address — it starts empty: your progress stays here. To compare
            like for like, back up above and restore into it.
          </p>
          <a href={PREVIOUS_BUILD.url} target="_blank" rel="noopener noreferrer"
            className={`${buttonClass('secondary', 'sm')} no-underline`}>
            <History size={14} /> Open the old version
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={check} disabled={checking}>
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {checking ? 'Checking…' : 'Check for updates'}
          </Button>
          {update?.kind === 'stale' && (
            <Button size="sm" onClick={() => { void updateNow(); }}>Update now</Button>
          )}
        </div>
        {update && (
          <p className={`text-xs mt-2.5 ${update.kind === 'current' ? 'text-green' : update.kind === 'stale' ? 'text-accent' : 'text-dim'}`}>
            {update.kind === 'current' && 'You’re on the latest version.'}
            {update.kind === 'stale' && (
              <>A newer version is available ({update.sha}
              {update.builtAt ? `, built ${buildLabel(update.builtAt)}` : ''}). Updating clears the
              cached app — your progress is stored separately and is not affected.</>
            )}
            {update.kind === 'unknown' && update.why}
          </p>
        )}
      </Card>

      {/* What a session is made of.
          "Sometimes I just want to casually flick through new words" — and there
          was no way to say so. A mixed session weaves generated drills between the
          flip cards, which is the right default and the wrong thing when you are
          browsing. Switching them all off leaves a pure flip session, which is a
          real way to study and not a degenerate case.

          Governs *sessions only*: opening a drill by name from Blind spots still
          drills it, because there you asked for it. */}
      <Card pad="none" className="p-4">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1"><Layers size={16} className="text-accent" /> What’s in a session</h3>
        <p className="text-dim text-xs mb-3 max-w-[60ch]">
          Flip cards are always there. These are the drills woven between them — the same word
          asked the other way round. Switch any off and it stops appearing in sessions; turn them
          all off to just flick through words. Blind spots on Fortschritt still runs any of them
          on request.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setAllDrillModes(DRILL_MODES, true)} className={toggle(muted.size === 0)}
            aria-pressed={muted.size === 0}>Everything</button>
          <button onClick={() => setAllDrillModes(DRILL_MODES, false)} className={toggle(muted.size === DRILL_MODES.length)}
            aria-pressed={muted.size === DRILL_MODES.length}>Flip cards only</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {DRILL_MODES.map((m) => {
            const on = !muted.has(m);
            return (
              <button key={m} onClick={() => toggleDrillMode(m)} aria-pressed={on} className={toggle(on)}>
                {on && <Check size={13} aria-hidden className="inline-block mr-1 -mt-0.5" />}
                {MODE_TAG[m]}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Daily pace. The caps were good defaults and also a ceiling with no
          override — an exam in three weeks could not ask for more. */}
      <Card pad="none" className="p-4">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1"><CalendarClock size={16} className="text-accent" /> Daily pace</h3>
        <p className="text-dim text-xs mb-3 max-w-[60ch]">
          How many new words a day, and how much of a backlog one day serves. The scheduler
          is unaffected — FSRS tolerates delay by design, and a bigger budget only front-loads
          what it would have shown you anyway.
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PACE) as Pace[]).map((p) => (
            <button key={p} onClick={() => pickPace(p)} aria-pressed={pc === p} className={toggle(pc === p)}>
              {PACE[p].label}
              <span className="font-mono text-2xs opacity-70">{PACE[p].fresh} new · {PACE[p].due} due</span>
            </button>
          ))}
        </div>
      </Card>

    </div>
  );
}
