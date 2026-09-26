// The tutor's consent gate, driven rather than read.
//
// The property: **no request leaves without a yes that names the provider.** It
// is enforced in the transport (`complete`), so these tests go through the public
// calls with `fetch` replaced and assert what reached the network, not what a
// component chose to do.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
  idbReady: async () => true,
}));

import { setAi, aiConsented, setAiConsent, explainSentence, AiError, aiDisclosure } from './ai.ts';

const sent: string[] = [];
beforeEach(() => {
  localStorage.clear();
  sent.length = 0;
  vi.stubGlobal('location', { origin: 'https://lexi.test' });
  vi.stubGlobal('fetch', async (url: string) => {
    sent.push(url);
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"translation":"t","points":[]}' } }] }), { status: 200 });
  });
});

const ask = () => explainSentence({ sentence: 'Das ist gut.', paragraph: 'Das ist gut.', title: 'T', level: 'B1' });

describe('the tutor asks before it sends', () => {
  it('refuses to send with a key but no consent — and nothing reaches the network', async () => {
    setAi({ provider: 'openrouter', model: 'm' }, 'sk-or-test');
    expect(aiConsented()).toBe(false);
    await expect(ask()).rejects.toMatchObject({ kind: 'consent' });
    expect(sent).toEqual([]);
  });

  it('sends once the learner has agreed for this provider', async () => {
    setAi({ provider: 'openrouter', model: 'm' }, 'sk-or-test');
    setAiConsent('openrouter');
    expect((await ask()).translation).toBe('t');
    expect(sent).toEqual(['https://openrouter.ai/api/v1/chat/completions']);
  });

  it('asks again when the provider changes — a yes to one company is not a yes to another', async () => {
    setAi({ provider: 'openrouter', model: 'm' }, 'sk-or-test');
    setAiConsent('openrouter');
    setAi({ provider: 'anthropic', model: 'm' });
    expect(aiConsented()).toBe(false);
    await expect(ask()).rejects.toBeInstanceOf(AiError);
  });

  it('forgets the yes with the key', () => {
    setAi({ provider: 'openrouter', model: 'm' }, 'sk-or-test');
    setAiConsent('openrouter');
    setAi(null);
    setAi({ provider: 'openrouter', model: 'm' }, 'sk-or-test');
    expect(aiConsented()).toBe(false);
  });

  it('names the provider and every kind of text it sends', () => {
    const d = aiDisclosure('openrouter');
    for (const part of ['sentence', 'paragraph', 'title', 'what you wrote', 'level', 'OpenRouter']) expect(d).toContain(part);
  });
});

describe('the backup', () => {
  it('never carries the consent, as it never carries the key', async () => {
    setAi({ provider: 'openrouter', model: 'm' }, 'sk-or-test');
    setAiConsent('openrouter');
    const store = await import('../store.ts');
    expect(store.exportData()).not.toContain('lexi.ai.consent.v1');
  });
});
