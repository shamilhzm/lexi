// The tutor's client half, driven rather than read.
//
// The properties: **no request leaves without a yes**, every request goes to
// Lexi's own endpoint and nowhere else, and **no AI key is kept in this browser** —
// including the ones the bring-your-own-key era left behind. Enforced in the
// transport, so these tests go through the public calls with `fetch` replaced and
// assert what reached the network, not what a component chose to do.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
  idbReady: async () => true,
}));

import { setTutorCode, aiConsented, setAiConsent, explainSentence, testAi, aiDisclosure, TUTOR_ENDPOINT } from './ai.ts';

const sent: { url: string; init?: RequestInit }[] = [];
let reply: { status: number; body: unknown } = { status: 200, body: { ok: true, result: { translation: 't', points: [] } } };

beforeEach(() => {
  localStorage.clear();
  sent.length = 0;
  reply = { status: 200, body: { ok: true, result: { translation: 't', points: [] } } };
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    sent.push({ url, init });
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
});

const ask = () => explainSentence({ sentence: 'Das ist gut.', paragraph: 'Das ist gut.', title: 'T', level: 'B1' });

describe('the tutor asks before it sends', () => {
  it('sends nothing without an access code', async () => {
    setAiConsent();
    await expect(ask()).rejects.toMatchObject({ kind: 'no-key' });
    expect(sent).toEqual([]);
  });

  it('sends nothing with a code but no consent', async () => {
    setTutorCode('code-123');
    expect(aiConsented()).toBe(false);
    await expect(ask()).rejects.toMatchObject({ kind: 'consent' });
    expect(sent).toEqual([]);
  });

  it('sends to Lexi’s own endpoint, with the code in a header — and nowhere else', async () => {
    setTutorCode('code-123');
    setAiConsent();
    expect((await ask()).translation).toBe('t');
    expect(sent.map((s) => s.url)).toEqual([TUTOR_ENDPOINT]);
    const headers = sent[0].init?.headers as Record<string, string>;
    expect(headers['X-Lexi-Access']).toBe('code-123');
    expect(JSON.parse(String(sent[0].init?.body))).toMatchObject({ task: 'explain', sentence: 'Das ist gut.', level: 'B1' });
  });

  it('does not accept a yes given to the old bring-your-own-key flow', () => {
    localStorage.setItem('lexi.ai.consent.v1', JSON.stringify({ provider: 'anthropic', at: 1 }));
    expect(aiConsented()).toBe(false);
  });

  it('forgets the yes with the code', () => {
    setTutorCode('code-123');
    setAiConsent();
    setTutorCode(null);
    setTutorCode('code-123');
    expect(aiConsented()).toBe(false);
  });

  it('names where the text goes and every kind of text it sends', () => {
    const d = aiDisclosure();
    for (const part of ['sentence', 'paragraph', 'title', 'what you wrote', 'level', 'Lexi’s own server', 'Anthropic']) expect(d).toContain(part);
  });

  it('tests the setup with a ping that carries no learner text, and needs no consent', async () => {
    setTutorCode('code-123');
    reply = { status: 200, body: { ok: true, result: { model: 'm' } } };
    await testAi();
    expect(JSON.parse(String(sent[0].init?.body))).toEqual({ task: 'ping' });
  });

  it('carries the server’s reason back', async () => {
    setTutorCode('wrong');
    setAiConsent();
    reply = { status: 401, body: { ok: false, kind: 'auth', message: 'The access code was not accepted.' } };
    await expect(ask()).rejects.toMatchObject({ kind: 'auth', message: 'The access code was not accepted.' });
    reply = { status: 503, body: { ok: false, kind: 'not-configured', message: 'The tutor is not set up on this server.' } };
    await expect(ask()).rejects.toMatchObject({ kind: 'not-configured' });
  });
});

describe('no AI key in this browser', () => {
  it('removes the key and config the bring-your-own-key era stored', async () => {
    localStorage.setItem('lexi.ai.key.v1', 'sk-ant-old');
    localStorage.setItem('lexi.ai.v1', JSON.stringify({ provider: 'anthropic', model: 'm' }));
    vi.resetModules();
    await import('./ai.ts');
    expect(localStorage.getItem('lexi.ai.key.v1')).toBeNull();
    expect(localStorage.getItem('lexi.ai.v1')).toBeNull();
  });

  it('never puts the access code or the consent in the backup', async () => {
    setTutorCode('code-123');
    setAiConsent();
    const store = await import('../store.ts');
    const backup = store.exportData();
    expect(backup).not.toContain('code-123');
    expect(backup).not.toContain('lexi.tutor.code.v1');
    expect(backup).not.toContain('lexi.ai.consent.v1');
  });
});
