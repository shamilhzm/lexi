// The optional tutor's key. See lib/ai.ts for what it does and does not do.
import { useState } from 'react';
import { Sparkles, Check, Loader2, Trash2 } from 'lucide-react';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import { aiConfig, aiKeyHint, setAi, testAi, AiError, DEFAULT_MODEL, type Provider } from '../lib/ai.ts';

const PROVIDERS: { id: Provider; label: string; hint: string; keyUrl: string }[] = [
  { id: 'anthropic', label: 'Anthropic', hint: 'Claude, direct. Key starts with sk-ant-.', keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'openrouter', label: 'OpenRouter', hint: 'One key, many models. Key starts with sk-or-.', keyUrl: 'https://openrouter.ai/keys' },
];

export default function AiSettings() {
  const cfg = aiConfig();
  const [provider, setProvider] = useState<Provider>(cfg?.provider ?? 'anthropic');
  const [model, setModel] = useState(cfg?.model ?? DEFAULT_MODEL[provider]);
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | string>('idle');
  const hint = aiKeyHint();

  const pick = (p: Provider) => {
    setProvider(p);
    // Keep a model the learner typed; swap only the default for the other provider's.
    if (!model || model === DEFAULT_MODEL[provider]) setModel(DEFAULT_MODEL[p]);
  };

  const save = async () => {
    setAi({ provider, model: model.trim() || DEFAULT_MODEL[provider] }, key.trim() ? key : undefined);
    setKey('');
    setStatus('testing');
    try { await testAi(); setStatus('ok'); } catch (e) { setStatus(e instanceof AiError ? e.message : 'The test failed.'); }
  };

  return (
    <Card as="section" className="mb-4">
      <div className="flex items-center gap-2 mb-1"><Sparkles size={16} className="text-accent" /><h3 className="text-base font-semibold">Tutor (optional)</h3></div>
      <p className="text-dim text-xs mb-3">
        With your own AI key, Lexi can explain a sentence you’re reading and check what you write back.
        Your key stays in this browser and goes only to the provider you pick — Lexi has no server, and the key is never in your backup file.
        Without a key, none of your reading or writing goes to an AI, and everything else works.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {PROVIDERS.map((p) => (
          <button key={p.id} onClick={() => pick(p.id)} aria-pressed={provider === p.id}
            className={`tap-44 flex flex-col items-start text-left rounded-md px-3.5 py-2 border transition-colors ${provider === p.id ? 'border-accent bg-panel2' : 'border-line hover:border-accent'}`}>
            <span className={`text-sm font-semibold ${provider === p.id ? 'text-accent' : ''}`}>{p.label}</span>
            <span className="text-2xs text-dim">{p.hint}</span>
          </button>
        ))}
      </div>

      <label className="block text-xs text-dim mb-1" htmlFor="ai-key">
        API key {hint && <span>(saved, ending …{hint} — leave blank to keep it)</span>}
      </label>
      <input id="ai-key" type="password" autoComplete="off" spellCheck={false} value={key} onChange={(e) => setKey(e.target.value)}
        placeholder={hint ? '••••••••' : 'Paste your key'}
        className="w-full rounded-md bg-panel2 border border-line px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none" />
      <p className="text-2xs text-dim mt-1">
        Get one at <a className="underline decoration-dotted hover:text-accent" href={PROVIDERS.find((p) => p.id === provider)!.keyUrl} target="_blank" rel="noopener noreferrer">
          {provider === 'anthropic' ? 'console.anthropic.com' : 'openrouter.ai'}</a>. A day’s reading and writing costs cents.
      </p>

      <label className="block text-xs text-dim mb-1 mt-3" htmlFor="ai-model">Model</label>
      <input id="ai-model" value={model} onChange={(e) => setModel(e.target.value)} spellCheck={false}
        className="w-full rounded-md bg-panel2 border border-line px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none" />

      <div className="flex items-center gap-3 flex-wrap mt-3">
        <Button size="sm" onClick={save} disabled={(!key.trim() && !hint) || status === 'testing'}>
          {status === 'testing' ? <><Loader2 size={13} className="animate-spin" /> Testing…</> : 'Save and test'}
        </Button>
        {status === 'ok' && <span className="flex items-center gap-1 text-xs text-green"><Check size={14} /> Working</span>}
        {status !== 'idle' && status !== 'ok' && status !== 'testing' && <span className="text-xs text-red-txt">{status}</span>}
        {cfg && hint && (
          <button onClick={() => { setAi(null); setStatus('idle'); setKey(''); }}
            className="ml-auto inline-flex items-center gap-1 text-xs text-dim hover:text-red-txt">
            <Trash2 size={13} /> Remove key
          </button>
        )}
      </div>
    </Card>
  );
}
