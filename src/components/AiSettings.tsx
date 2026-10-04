// The optional tutor's access code. See lib/ai.ts for what it does and does not
// do, and api/tutor.ts for the server half: the AI key lives there, never here.
import { useState } from 'react';
import { Sparkles, Check, Loader2, Trash2 } from 'lucide-react';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import { tutorCode, setTutorCode, testAi, AiError, aiConsented, setAiConsent, aiDisclosure } from '../lib/ai.ts';

export default function AiSettings() {
  const [code, setCode] = useState('');
  const [has, setHas] = useState(!!tutorCode());
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | string>('idle');
  // Saving here is the moment the learner reads what will be sent, so the yes is
  // given here. The test itself sends no learner text (`testAi` is a ping).
  const agreedAlready = aiConsented();
  const [agree, setAgree] = useState(false);

  const save = async () => {
    if (code.trim()) setTutorCode(code);
    if (agree) setAiConsent();
    setCode('');
    setHas(!!tutorCode());
    setStatus('testing');
    try { await testAi(); setStatus('ok'); } catch (e) { setStatus(e instanceof AiError ? e.message : 'The test failed.'); }
  };

  return (
    <Card as="section" className="mb-4">
      <div className="flex items-center gap-2 mb-1"><Sparkles size={16} className="text-accent" /><h2 className="text-base font-semibold">Tutor (optional)</h2></div>
      <p className="text-dim text-xs mb-3">
        Lexi can explain a sentence you’re reading, with Claude, through Lexi’s own server. No AI key is kept in this
        browser — only an access code that works for Lexi’s tutor and nothing else, from whoever runs this Lexi.
        Without it, none of your reading goes to an AI, and everything else works.
      </p>
      <p className="text-dim text-xs mb-3" id="ai-disclosure">
        {aiDisclosure()}{' '}
        <a href="./legal.html#tutor" target="_blank" rel="noopener" className="underline decoration-dotted hover:text-accent">What leaves this device</a>
      </p>

      <label className="block text-xs text-dim mb-1" htmlFor="ai-code">
        Access code {has && <span>(saved — leave blank to keep it)</span>}
      </label>
      <input id="ai-code" type="password" autoComplete="off" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)}
        placeholder={has ? '••••••••' : 'Paste the access code'}
        className="w-full rounded-md bg-panel2 border border-line px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none" />

      {!agreedAlready && (
        <label className="flex items-start gap-2 mt-3 text-xs">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
            aria-describedby="ai-disclosure" className="mt-0.5 accent-accent w-4 h-4 flex-shrink-0" />
          <span>I’ve read what is sent, and to whom, and I’m OK with it.</span>
        </label>
      )}

      <div className="flex items-center gap-3 flex-wrap mt-3">
        <Button size="sm" onClick={save} disabled={(!code.trim() && !has) || (!agreedAlready && !agree) || status === 'testing'}>
          {status === 'testing' ? <><Loader2 size={13} className="animate-spin" /> Testing…</> : 'Save and test'}
        </Button>
        {status === 'ok' && <span className="flex items-center gap-1 text-xs text-green"><Check size={14} /> Working</span>}
        {status !== 'idle' && status !== 'ok' && status !== 'testing' && <span className="text-xs text-red-txt">{status}</span>}
        {has && (
          <button onClick={() => { setTutorCode(null); setHas(false); setStatus('idle'); setCode(''); setAgree(false); }}
            className="ml-auto inline-flex items-center gap-1 text-xs text-dim hover:text-red-txt">
            <Trash2 size={13} /> Remove code
          </button>
        )}
      </div>
    </Card>
  );
}
