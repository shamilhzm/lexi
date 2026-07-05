// Einstellungen — device-local settings: the HD German voice (Piper Thorsten,
// downloaded once and run in-browser) and the AI provider used for sentence-
// mining enrichment (and, later, the tutor). Everything here lives in
// localStorage / the browser; nothing is sent anywhere except your chosen API.
import { useState } from 'react';
import { Volume2, Cpu, Check, Loader2, Download } from 'lucide-react';
import { hdVoice, setHdVoice, aiConfig, setAiConfig } from '../store.ts';
import { useStore } from '../useStore.ts';
import { ensureHdVoice, speakHd, speak } from '../lib/tts.ts';

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

  const applyPreset = (name: string) => {
    const p = PRESETS[name]; if (!p) return;
    setBase(p.baseUrl); setModel(p.model);
  };
  const saveAi = () => { setAiConfig({ baseUrl: base, model, key }); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 1800); };

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
          Used to enrich words you mine that aren’t in the lexicon (and, soon, the speaking/writing tutor).
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
        <Field label="API key" value={key} onChange={setKey} placeholder="sk-… / or leave blank for local Ollama" mono password />

        <div className="flex items-center gap-3 mt-1">
          <button onClick={saveAi} className="bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 text-[15px] hover:brightness-105">Save</button>
          {savedMsg && <span className="text-green text-[13px] flex items-center gap-1"><Check size={14} /> Saved</span>}
        </div>
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
