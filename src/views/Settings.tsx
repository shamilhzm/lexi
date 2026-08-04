// Einstellungen — device-local settings: appearance, review intensity, the HD
// German voice (Piper Thorsten, downloaded once and run in-browser), and backup /
// restore. Everything here lives in localStorage / the browser; nothing is sent
// anywhere.
import { useState, useRef, type ChangeEvent } from 'react';
import { Volume2, Check, Loader2, Download, Upload, Archive, X, Palette, Sun, Moon, Monitor, Gauge, Type, Music, Users, CalendarClock, List, Crosshair } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { hdVoice, setHdVoice, retention, setRetentionTarget, exportData, importData, textScale, setTextScale, sound, setSound, addUserWords, pace, setPace, PACE, statusOf, type Pace } from '../store.ts';
import { WORDS } from '../data/index.ts';
import { parsePack } from '../lib/classpack.ts';
import { focusTense, setFocusTense } from '../store.ts';
import { useStore } from '../useStore.ts';
import { speak } from '../lib/tts.ts';
import { useHdVoice } from '../lib/useHdVoice.ts';
import { themePref, setThemePref, type ThemePref } from '../theme.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';

/** The one segmented-control style, shared by every toggle group on this page.
 *  Previously each group re-typed it with a slightly different "off" hover. */
const toggle = (on: boolean) =>
  `flex items-center gap-2 text-xs rounded-md px-3.5 py-2 border transition-colors ${
    on ? 'border-amber text-amber bg-panel2' : 'border-line text-dim hover:border-amber'}`;

/** The tenses a learner can lean on. Keys match TENSE_POINT, so a focus always
 *  names something the drills can actually target and the rule behind it exists. */
export const FOCUS_CHOICES: { key: string; label: string }[] = [
  { key: 'praesens', label: 'Präsens' },
  { key: 'perfekt', label: 'Perfekt' },
  { key: 'praeteritum', label: 'Präteritum' },
  { key: 'futur1', label: 'Futur I' },
  { key: 'konjunktiv2', label: 'Konjunktiv II' },
];

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

export default function Settings() {
  useStore();

  const { percent: dl, error: hdErr, enable: enableHd } = useHdVoice();

  const [theme, setTheme] = useState<ThemePref>(themePref());
  const pickTheme = (p: ThemePref) => { setThemePref(p); setTheme(p); };

  const [pc, setPc] = useState<Pace>(pace());
  const [focus, setFocus] = useState<string | null>(focusTense());
  const pickFocus = (k: string | null) => { setFocusTense(k); setFocus(k); };
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

  // A word pack is someone else's deck, not a backup: it *adds* cards and never
  // touches progress, so unlike a restore it needs no confirmation and no reload.
  const packRef = useRef<HTMLInputElement>(null);
  const [packMsg, setPackMsg] = useState('');
  const [packErr, setPackErr] = useState('');
  const onPackFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPackErr(''); setPackMsg('');
    const { pack, error, dropped } = parsePack(await file.text());
    if (!pack) { setPackErr(error ?? 'Could not read that pack.'); return; }
    const added = addUserWords(pack.cards);
    const already = pack.cards.length - added.length;
    setPackMsg(
      `Added ${added.length} card${added.length === 1 ? '' : 's'} from “${pack.name}”`
      + (pack.from ? ` by ${pack.from}` : '') + '.'
      + (already ? ` ${already} you already had.` : '')
      + (dropped ? ` ${dropped} couldn’t be read.` : ''));
  };

  return (
    <div className="w-full max-w-[640px] mx-auto">
      {/* h2, not h1: Settings only ever renders inside Profile, which owns the
          page’s h1. Two h1s on one page breaks heading navigation. */}
      <h2 className="text-xl font-bold mb-4 mt-6">Settings</h2>

      {/* Appearance */}
      <Card as="section" className="mb-4">
        <div className="flex items-center gap-2 mb-1"><Palette size={16} className="text-amber" /><h3 className="text-base font-semibold">Appearance</h3></div>
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
        <div className="flex items-center gap-2 mb-1"><Type size={16} className="text-amber" /><h3 className="text-base font-semibold">Text size</h3></div>
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
        <div className="flex items-center gap-2 mb-1"><Music size={16} className="text-amber" /><h3 className="text-base font-semibold">Sound</h3></div>
        <p className="text-dim text-xs mb-3">Soft cues as you answer — a tick when you’re right, a quieter falling note when you’re not, and a chime at the end of a session. You can also mute mid-session from the header.</p>
        <button onClick={() => setSound(!sound())} aria-pressed={sound()} className={toggle(sound())}>
          {sound() ? 'Sound on' : 'Sound off'}
        </button>
      </Card>

      {/* Review intensity (FSRS desired retention) */}
      <Card as="section" className="mb-4">
        <div className="flex items-center gap-2 mb-1"><Gauge size={16} className="text-amber" /><h3 className="text-base font-semibold">Review intensity</h3></div>
        <p className="text-dim text-xs mb-3">
          How hard the scheduler pushes. Higher retention means shorter intervals and
          more reviews per day, but you forget less. 90% is the recommended balance.
        </p>
        <div className="flex flex-wrap gap-2">
          {RETENTIONS.map(({ v, label, hint }) => (
            <button key={v} onClick={() => pickRet(v)} aria-pressed={ret === v}
              className={`flex flex-col items-start gap-0.5 text-left rounded-md px-3.5 py-2.5 border transition-colors min-w-[132px] ${ret === v ? 'border-amber bg-panel2' : 'border-line hover:border-amber'}`}>
              <span className={`text-base font-semibold ${ret === v ? 'text-amber' : ''}`}>{label}</span>
              <span className="text-2xs text-dim leading-tight">{hint}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* HD voice */}
      <Card as="section" className="mb-4">
        <div className="flex items-center gap-2 mb-1"><Volume2 size={16} className="text-amber" /><h3 className="text-base font-semibold">German voice</h3></div>
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
            <button onClick={() => speak('Guten Tag! Wie geht es dir heute?')} className="text-xs text-dim hover:text-amber">Test</button>
            <button onClick={() => setHdVoice(false)} className="text-xs text-dim hover:text-red-txt ml-auto">Turn off</button>
          </div>
        ) : dl !== null ? (
          <div className="flex items-center gap-2 text-xs text-dim"><Loader2 size={15} className="animate-spin" /> Downloading voice… {dl}%</div>
        ) : (
          <Button onClick={enableHd}><Download size={15} /> Enable HD German voice</Button>
        )}
        {hdErr && <p className="text-red-txt text-xs mt-2">{hdErr}</p>}
      </Card>

      {/* Your data — backup & restore (local-first insurance) */}
      <Card as="section" className="mt-4">
        <div className="flex items-center gap-2 mb-1"><Archive size={16} className="text-amber" /><h3 className="text-base font-semibold">Your data</h3></div>
        <p className="text-dim text-xs mb-3">
          Everything lives on this device. Export a backup to keep your cards, streak,
          and progress safe — or to move to another device. Importing replaces what’s
          on this device, so export first if unsure.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={doExport}><Download size={15} /> Export backup</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={14} className="text-amber" /> Import backup
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

      {/* This week's focus. A course moves through one thing at a time; the drills
          were choosing their tense at random, so a learner spending a month on the
          Perfekt met it a quarter of the time and had no way to say so. */}
      <Card pad="none" className="p-4">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1"><Crosshair size={16} className="text-amber" /> This week I’m working on</h3>
        <p className="text-dim text-xs mb-3 max-w-[60ch]">
          Weights which tense the conjugation and transformation drills ask for. A lean, not a
          filter — the others keep coming round, or you’d quietly lose them.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => pickFocus(null)} aria-pressed={focus === null} className={toggle(focus === null)}>
            No focus
          </button>
          {FOCUS_CHOICES.map((f) => (
            <button key={f.key} onClick={() => pickFocus(f.key)} aria-pressed={focus === f.key} className={toggle(focus === f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Daily pace. The caps were good defaults and also a ceiling with no
          override — an exam in three weeks could not ask for more. */}
      <Card pad="none" className="p-4">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1"><CalendarClock size={16} className="text-amber" /> Daily pace</h3>
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

      {/* Class packs. Local-first means there is no class to join — a file is the
          honest bridge, and it costs no backend. Export lives on each deck in
          Progress; this is the receiving end. */}
      <Card pad="none" className="p-4">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1"><Users size={16} className="text-amber" /> Word packs</h3>
        <p className="text-dim text-xs mb-3 max-w-[60ch]">
          A pack is a deck someone shared with you — a file, no account. Importing adds its
          cards to your lexicon; it never changes your progress. Export a deck from
          Progress → Decks to share one back.
        </p>
        <Button variant="secondary" onClick={() => packRef.current?.click()}>
          <Upload size={14} className="text-amber" /> Import a word pack
        </Button>
        <input ref={packRef} type="file" accept="application/json,.json" aria-label="Choose a Lexi word pack to import"
          onChange={onPackFile} className="hidden" tabIndex={-1} />
        {packMsg && <p className="text-green text-xs mt-2 flex items-center gap-1.5"><Check size={14} /> {packMsg}</p>}
        {packErr && <p className="text-red-txt text-xs mt-2 flex items-center gap-1.5"><X size={14} /> {packErr}</p>}
      </Card>
    </div>
  );
}
