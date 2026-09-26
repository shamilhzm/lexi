// The tutor's one-time question: may this text go to your AI provider?
//
// Shown in place of the first explanation or correction for a provider the
// learner has not agreed to yet (`aiConsented`). The words come from
// `aiDisclosure`, the same paragraph Settings shows, so the prompt can never
// describe a different flow from the one it gates. See lib/ai.ts, *consent*.
import { Sparkles } from 'lucide-react';
import { aiConfig, aiDisclosure, setAiConsent } from '../lib/ai.ts';

const pill = 'tap-44 inline-flex items-center gap-1.5 rounded-full px-4 h-11 text-sm font-semibold active:scale-95 transition';

export default function AiConsent({ onAllow, onCancel }: { onAllow: () => void; onCancel: () => void }) {
  const cfg = aiConfig();
  if (!cfg) return null;
  return (
    <div role="group" aria-labelledby="ai-consent-h" className="rounded-lg bg-panel2 border border-line px-3.5 py-3">
      <p id="ai-consent-h" className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles size={14} className="text-accent" /> Before the first request
      </p>
      <p className="mt-1.5 text-xs text-dim leading-relaxed">
        {aiDisclosure(cfg.provider)}{' '}
        <a href="./legal.html#tutor" target="_blank" rel="noopener" className="underline decoration-dotted hover:text-accent">What leaves this device</a>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => { setAiConsent(cfg.provider); onAllow(); }} className={`${pill} bg-accent text-bg`}>OK, send it</button>
        <button onClick={onCancel} className={`${pill} glass`}>Not now</button>
      </div>
    </div>
  );
}
