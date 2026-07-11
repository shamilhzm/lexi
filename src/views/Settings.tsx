// Einstellungen — device-local settings: the HD German voice (Piper Thorsten,
// downloaded once and run in-browser) and the AI provider used for sentence-
// mining enrichment. Everything here lives in
// localStorage / the browser; nothing is sent anywhere except your chosen API.
import { useState, useRef, type ChangeEvent } from 'react';
import { Volume2, Cpu, Check, Loader2, Download, Upload, Archive, Plug, X, Palette, Sun, Moon, Monitor, Gauge } from 'lucide-react';
import { hdVoice, setHdVoice, aiConfig, setAiConfig, retention, setRetentionTarget, exportData, importData } from '../store.ts';
import { useStore } from '../useStore.ts';
import { ensureHdVoice, speakHd, speak } from '../lib/tts.ts';
import { chat } from '../lib/ai.ts';
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

const PRESETS: Record<string, { baseUrl: string; model: string; note: string }> = {
  'OpenRouter (free)': { baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free', note: 'Free Llama 3.3 70B · one key, no card. Recommended start.' },
  'OpenAI': { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', note: 'Paid. Highest consistency.' },
  'Mistral (EU)': { baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest', note: 'European, open-weight, strong on German.' },
  'Ollama (local)': { baseUrl: 'http://localhost:11434/v1', model: 'llama3.1', note: 'Self-hosted, fully offline & free. No key needed.' },
};

export default function Settings() {
  useStore();
  const cfg = aiConfig();
  const [base, setBase] = useState(cfg.baseUrl);
  const [model, setModel] = useState(cfg.model);
  const [key, setKey] = useState(cfg.key);
  const [savedMsg, setSavedMsg] = useState(false);

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

  type TestState = { s: 'idle' | 'testing' | 'ok' | 'err'; ms?: number; model?: string; msg?: string };
  const [test, setTest] = useState<TestState>({ s: 'idle' });

  const applyPreset = (name: string) => {
    const p = PRESETS[name]; if (!p) return;
    setBase(p.baseUrl); setModel(p.model); setTest({ s: 'idle' });
  };
  const saveAi = () => { setAiConfig({ baseUrl: base, model, key }); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 1800); };

  // Ping the current (unsaved) settings with a 1-token request to confirm the
  // key + model work before relying on them mid-session.
  const testConnection = async () => {
    setTest({ s: 'testing' });
    const t0 = performance.now();
    try {
      await chat([{ role: 'user', content: 'ping' }], { baseUrl: base, model, key }, { maxTokens: 1, temperature: 0 });
      setTest({ s: 'ok', ms: Math.round(performance.now() - t0), model });
    } catch (e: any) {
      setTest({ s: 'err', msg: e?.message || 'Connection failed.' });
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
      <h1 className="text-[20px] font-bold mb-4">Settings</h1>

      {/* Appearance */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2 mb-1"><Palette size={16} className="text-amber" /><h2 className="text-[15px] font-semibold">Appearance</h2></div>
        <p className="text-dim text-[13px] mb-3">The terminal runs dark by default. Pick a fixed theme or follow your system.</p>
        <div className="flex flex-wrap gap-2">
          {THEMES.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => pickTheme(id)}
              className={`flex items-center gap-2 text-[13px] rounded-[10px] px-3.5 py-2 border transition-colors ${theme === id ? 'border-amber text-amber bg-panel2' : 'border-line text-dim hover:border-amber'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Review intensity (FSRS desired retention) */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2 mb-1"><Gauge size={16} className="text-amber" /><h2 className="text-[15px] font-semibold">Review intensity</h2></div>
        <p className="text-dim text-[13px] mb-3">
          How hard the scheduler pushes. Higher retention means shorter intervals and
          more reviews per day, but you forget less. 90% is the recommended balance.
        </p>
        <div className="flex flex-wrap gap-2">
          {RETENTIONS.map(({ v, label, hint }) => (
            <button key={v} onClick={() => pickRet(v)}
              className={`flex flex-col items-start gap-0.5 text-left rounded-[10px] px-3.5 py-2.5 border transition-colors min-w-[132px] ${ret === v ? 'border-amber bg-panel2' : 'border-line hover:border-amber'}`}>
              <span className={`text-[15px] font-semibold ${ret === v ? 'text-amber' : ''}`}>{label}</span>
              <span className="text-[11px] text-dim leading-tight">{hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* HD voice */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2 mb-1"><Volume2 size={16} className="text-amber" /><h2 className="text-[15px] font-semibold">German voice</h2></div>
        <p className="text-dim text-[13px] mb-3">
          The HD voice is a native-German neural voice (Piper “Thorsten”) that runs on your device.
          It downloads once (~25 MB), then works offline — far better than the built-in browser voice.
        </p>
        {hdVoice() ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-green text-[13px]"><Check size={15} /> HD voice on</span>
            <button onClick={() => speak('Guten Tag! Wie geht es dir heute?')} className="text-[13px] text-dim hover:text-amber">Test</button>
            <button onClick={() => setHdVoice(false)} className="text-[13px] text-dim hover:text-red-txt ml-auto">Turn off</button>
          </div>
        ) : dl !== null ? (
          <div className="flex items-center gap-2 text-[13px] text-dim"><Loader2 size={15} className="animate-spin" /> Downloading voice… {dl}%</div>
        ) : (
          <button onClick={enableHd} className="flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-4 py-2.5 text-[15px] hover:brightness-105">
            <Download size={15} /> Enable HD German voice
          </button>
        )}
        {hdErr && <p className="text-red-txt text-[13px] mt-2">{hdErr}</p>}
      </section>

      {/* AI provider */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1"><Cpu size={16} className="text-amber" /><h2 className="text-[15px] font-semibold">AI provider</h2></div>
        <p className="text-dim text-[13px] mb-3">
          Used to enrich words you mine that aren’t in the lexicon.
          Any OpenAI-compatible API works. Your key is stored only on this device.
        </p>

        <label className="text-[13px] text-dim block mb-1">Preset</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.keys(PRESETS).map((name) => (
            <button key={name} onClick={() => applyPreset(name)}
              className={`text-[13px] rounded-full px-3 py-1.5 border transition-colors ${base === PRESETS[name].baseUrl ? 'border-amber text-amber' : 'border-line text-dim hover:border-amber'}`}>
              {name}
            </button>
          ))}
        </div>

        <Field label="Base URL" value={base} onChange={setBase} placeholder="https://openrouter.ai/api/v1" mono />
        <Field label="Model" value={model} onChange={setModel} placeholder="meta-llama/llama-3.3-70b-instruct:free" mono />
        <p className="text-dim text-[12px] -mt-2 mb-3">
          Free on OpenRouter (capped per day). If it’s busy or gone, try <code className="text-amber">openrouter/free</code> (auto-routes
          to any available free model), or browse <span className="text-amber">openrouter.ai/models</span>.
        </p>
        <Field label="API key" value={key} onChange={setKey} placeholder="sk-… / or leave blank for local Ollama" mono password />

        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <button onClick={saveAi} className="bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 text-[15px] hover:brightness-105">Save</button>
          <button onClick={testConnection} disabled={test.s === 'testing'}
            className="flex items-center gap-2 bg-panel2 border border-line rounded-[10px] px-4 py-2.5 text-[13px] hover:border-amber disabled:opacity-50">
            {test.s === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} className="text-amber" />}
            {test.s === 'testing' ? 'Testing…' : 'Test connection'}
          </button>
          {savedMsg && <span className="text-green text-[13px] flex items-center gap-1"><Check size={14} /> Saved</span>}
        </div>
        {test.s === 'ok' && (
          <p className="text-green text-[13px] mt-2 flex items-center gap-1.5">
            <Check size={14} /> Connected to <span className="font-mono">{test.model}</span> · {test.ms} ms
          </p>
        )}
        {test.s === 'err' && (
          <p className="text-red-txt text-[13px] mt-2 flex items-center gap-1.5"><X size={14} /> {test.msg}</p>
        )}
      </section>

      {/* Your data — backup & restore (local-first insurance) */}
      <section className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mt-4">
        <div className="flex items-center gap-2 mb-1"><Archive size={16} className="text-amber" /><h2 className="text-[15px] font-semibold">Your data</h2></div>
        <p className="text-dim text-[13px] mb-3">
          Everything lives on this device. Export a backup to keep your cards, streak,
          and progress safe — or to move to another device. Importing replaces what's
          on this device, so export first if unsure.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={doExport} className="flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-4 py-2.5 text-[15px] hover:brightness-105">
            <Download size={15} /> Export backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-panel2 border border-line rounded-[10px] px-4 py-2.5 text-[13px] hover:border-amber">
            <Upload size={14} className="text-amber" /> Import backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onRestoreFile} className="hidden" />
        </div>
        {restoreErr && <p className="text-red-txt text-[13px] mt-2 flex items-center gap-1.5"><X size={14} /> {restoreErr}</p>}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, mono, password }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; password?: boolean }) {
  return (
    <div className="mb-3">
      <label className="text-[13px] text-dim block mb-1">{label}</label>
      <input type={password ? 'password' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-panel2 border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-amber ${mono ? 'font-mono' : ''}`} />
    </div>
  );
}
