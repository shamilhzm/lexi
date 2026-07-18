// Einstellungen — device-local settings: appearance, review intensity, the HD
// German voice (Piper Thorsten, downloaded once and run in-browser), and backup /
// restore. Everything here lives in localStorage / the browser; nothing is sent
// anywhere.
import { useState, useRef, type ChangeEvent } from 'react';
import { Volume2, Check, Loader2, Download, Upload, Archive, X, Palette, Sun, Moon, Monitor, Gauge, Type, Music } from 'lucide-react';
import { hdVoice, setHdVoice, retention, setRetentionTarget, exportData, importData, textScale, setTextScale, sound, setSound } from '../store.ts';
import { useStore } from '../useStore.ts';
import { ensureHdVoice, speakHd, speak } from '../lib/tts.ts';
import { themePref, setThemePref, type ThemePref } from '../theme.ts';

const THEMES: { id: ThemePref; label: string; icon: any }[] = [
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

  const [dl, setDl] = useState<number | null>(null);
  const [hdErr, setHdErr] = useState('');

  const [theme, setTheme] = useState<ThemePref>(themePref());
  const pickTheme = (p: ThemePref) => { setThemePref(p); setTheme(p); };

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

  const enableHd = async () => {
    setHdErr(''); setDl(0);
    try {
      await ensureHdVoice((f) => setDl(Math.round(f * 100)));
      // Only turn it on if synthesis actually works on this device.
      await speakHd('Hallo! Das ist die neue deutsche Stimme.');
      setHdVoice(true); setDl(null);
    } catch (e: any) {
      setHdErr(e?.message || 'Could not start the voice on this device.'); setDl(null);
    }
  };

  return (
    <div className="max-w-[640px] mx-auto">
      <h1 className="text-[1.25rem] font-bold mb-4">Settings</h1>

      {/* Appearance */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2 mb-1"><Palette size={16} className="text-amber" /><h2 className="text-[0.9375rem] font-semibold">Appearance</h2></div>
        <p className="text-dim text-[0.8125rem] mb-3">The terminal runs dark by default. Pick a fixed theme or follow your system.</p>
        <div className="flex flex-wrap gap-2">
          {THEMES.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => pickTheme(id)}
              className={`flex items-center gap-2 text-[0.8125rem] rounded-[10px] px-3.5 py-2 border transition-colors ${theme === id ? 'border-amber text-amber bg-panel2' : 'border-line text-dim hover:border-amber'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Text size — the rem ramp scales from the root. "Standard" defers to the
          browser/OS preference (incl. iOS Dynamic Type); a choice overrides it. */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2 mb-1"><Type size={16} className="text-amber" /><h2 className="text-[0.9375rem] font-semibold">Text size</h2></div>
        <p className="text-dim text-[0.8125rem] mb-3">Standard follows your device's text-size setting.</p>
        <div className="flex flex-wrap gap-2">
          {[{ v: 0.875, label: 'Compact' }, { v: 1, label: 'Standard' }, { v: 1.125, label: 'Large' }, { v: 1.25, label: 'Larger' }].map(({ v, label }) => (
            <button key={v} onClick={() => setTextScale(v)}
              className={`text-[0.8125rem] rounded-[10px] px-3.5 py-2 border transition-colors ${textScale() === v ? 'border-amber text-amber bg-panel2' : 'border-line text-dim hover:border-amber'}`}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Sound — feedback ticks, off by default. */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2 mb-1"><Music size={16} className="text-amber" /><h2 className="text-[0.9375rem] font-semibold">Sound</h2></div>
        <p className="text-dim text-[0.8125rem] mb-3">A soft tick on correct answers and a two-note chime at session end.</p>
        <button onClick={() => setSound(!sound())}
          className={`text-[0.8125rem] rounded-[10px] px-3.5 py-2 border transition-colors ${sound() ? 'border-amber text-amber bg-panel2' : 'border-line text-dim hover:border-amber'}`}>
          {sound() ? 'Sound on' : 'Sound off'}
        </button>
      </section>

      {/* Review intensity (FSRS desired retention) */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2 mb-1"><Gauge size={16} className="text-amber" /><h2 className="text-[0.9375rem] font-semibold">Review intensity</h2></div>
        <p className="text-dim text-[0.8125rem] mb-3">
          How hard the scheduler pushes. Higher retention means shorter intervals and
          more reviews per day, but you forget less. 90% is the recommended balance.
        </p>
        <div className="flex flex-wrap gap-2">
          {RETENTIONS.map(({ v, label, hint }) => (
            <button key={v} onClick={() => pickRet(v)}
              className={`flex flex-col items-start gap-0.5 text-left rounded-[10px] px-3.5 py-2.5 border transition-colors min-w-[132px] ${ret === v ? 'border-amber bg-panel2' : 'border-line hover:border-amber'}`}>
              <span className={`text-[0.9375rem] font-semibold ${ret === v ? 'text-amber' : ''}`}>{label}</span>
              <span className="text-[0.6875rem] text-dim leading-tight">{hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* HD voice */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2 mb-1"><Volume2 size={16} className="text-amber" /><h2 className="text-[0.9375rem] font-semibold">German voice</h2></div>
        <p className="text-dim text-[0.8125rem] mb-3">
          The HD voice is a native-German neural voice (Piper “Thorsten”) that runs on your device.
          It downloads once (~25 MB), then works offline — far better than the built-in browser voice.
        </p>
        {hdVoice() ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-green text-[0.8125rem]"><Check size={15} /> HD voice on</span>
            <button onClick={() => speak('Guten Tag! Wie geht es dir heute?')} className="text-[0.8125rem] text-dim hover:text-amber">Test</button>
            <button onClick={() => setHdVoice(false)} className="text-[0.8125rem] text-dim hover:text-red-txt ml-auto">Turn off</button>
          </div>
        ) : dl !== null ? (
          <div className="flex items-center gap-2 text-[0.8125rem] text-dim"><Loader2 size={15} className="animate-spin" /> Downloading voice… {dl}%</div>
        ) : (
          <button onClick={enableHd} className="flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-4 py-2.5 text-[0.9375rem] hover:brightness-105">
            <Download size={15} /> Enable HD German voice
          </button>
        )}
        {hdErr && <p className="text-red-txt text-[0.8125rem] mt-2">{hdErr}</p>}
      </section>

      {/* Your data — backup & restore (local-first insurance) */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mt-4">
        <div className="flex items-center gap-2 mb-1"><Archive size={16} className="text-amber" /><h2 className="text-[0.9375rem] font-semibold">Your data</h2></div>
        <p className="text-dim text-[0.8125rem] mb-3">
          Everything lives on this device. Export a backup to keep your cards, streak,
          and progress safe — or to move to another device. Importing replaces what's
          on this device, so export first if unsure.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={doExport} className="flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-4 py-2.5 text-[0.9375rem] hover:brightness-105">
            <Download size={15} /> Export backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-panel2 border border-line rounded-[10px] px-4 py-2.5 text-[0.8125rem] hover:border-amber">
            <Upload size={14} className="text-amber" /> Import backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onRestoreFile} className="hidden" />
        </div>
        {restoreErr && <p className="text-red-txt text-[0.8125rem] mt-2 flex items-center gap-1.5"><X size={14} /> {restoreErr}</p>}
      </section>
    </div>
  );
}
