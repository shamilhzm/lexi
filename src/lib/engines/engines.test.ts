// The seam for local models (2026-11-27): the policy admits what VISION allows,
// every registry verdict agrees with the policy, the probe never needs a permission,
// and nothing in the app speaks or listens through a closed model.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { admissible, LEARNER_SUPPLIED } from './policy.ts';
import { ENGINES } from './registry.ts';
import { probe, missing, type ProbeHost } from './probe.ts';
import { installed, readiness } from './index.ts';
import type { EngineSpec } from './types.ts';

const spec = (o: Partial<EngineSpec>): EngineSpec => ({
  id: 't', kind: 'voice', name: 't', by: 't', where: 'device', ships: 'download',
  licence: { code: 'MIT', weights: 'CC0-1.0' }, needs: [], german: '', source: '', status: 'candidate', ...o,
});

describe('the licence policy', () => {
  it('admits open code with open weights', () => {
    expect(admissible(spec({})).ok).toBe(true);
    expect(admissible(spec({ licence: { code: 'Apache-2.0', weights: 'CC-BY-4.0' } })).ok).toBe(true);
  });
  it('refuses weights that forbid commercial use, derivatives, or carry use terms', () => {
    for (const weights of ['CC-BY-NC-4.0', 'CC-BY-ND-4.0', 'LicenseRef-Llama-Community', 'proprietary', '']) {
      expect(admissible(spec({ licence: { code: 'MIT', weights } })).ok, weights).toBe(false);
    }
  });
  it('lets GPL code run at build time and never ship', () => {
    const gpl = { code: 'GPL-3.0-or-later', weights: 'CC0-1.0' };
    expect(admissible(spec({ licence: gpl, where: 'build-time', ships: 'build-time' })).ok).toBe(true);
    expect(admissible(spec({ licence: gpl, ships: 'download' })).ok).toBe(false);
    expect(admissible(spec({ licence: gpl, ships: 'bundle' })).ok).toBe(false);
  });
  it('treats the learner’s own server as theirs, and only that', () => {
    const own = { code: LEARNER_SUPPLIED, weights: LEARNER_SUPPLIED };
    expect(admissible(spec({ kind: 'tutor', where: 'local-server', ships: 'external', licence: own })).ok).toBe(true);
    // A model Lexi would download is Lexi's to vet, whoever chose it.
    expect(admissible(spec({ kind: 'tutor', licence: own })).ok).toBe(false);
    // And a "local server" Lexi shipped would be Lexi's software.
    expect(admissible(spec({ kind: 'tutor', where: 'local-server', ships: 'download', licence: own })).ok).toBe(false);
  });
});

describe('the registry', () => {
  it('agrees with the policy on every verdict', () => {
    for (const e of ENGINES) {
      const v = admissible(e);
      expect(v.ok, `${e.id}: ${v.ok ? '' : v.why}`).toBe(e.status !== 'refused');
    }
  });
  it('names a source for every entry, and no id twice', () => {
    expect(new Set(ENGINES.map((e) => e.id)).size).toBe(ENGINES.length);
    for (const e of ENGINES) expect(e.source, e.id).toMatch(/^https:\/\//);
  });
  it('switches nothing on: Lexi is silent until the owner admits a voice', () => {
    expect(installed()).toEqual([]);
  });
});

describe('the probe', () => {
  const bare: ProbeHost = { hasWasm: false, isolated: false };
  it('reads a device with none of the APIs as able to run nothing, without throwing', async () => {
    const c = await probe(bare);
    expect(c).toEqual({ webgpu: false, wasm: false, wasmThreads: false, storageMB: null, microphone: false });
  });
  it('reads a capable device, and never calls getUserMedia', async () => {
    let asked = false;
    const c = await probe({
      hasWasm: true, isolated: false,
      gpu: { requestAdapter: async () => ({}) },
      storage: { estimate: async () => ({ quota: 4 * 1_048_576 * 1024, usage: 1_048_576 * 24 }) },
      mediaDevices: { getUserMedia: () => { asked = true; } },
    });
    expect(c.webgpu && c.wasm && c.microphone).toBe(true);
    expect(c.wasmThreads).toBe(false);
    expect(c.storageMB).toBe(4096 - 24);
    expect(asked).toBe(false);
  });
  it('gives up on an adapter request that hangs', async () => {
    const c = await probe({ hasWasm: true, isolated: false, gpu: { requestAdapter: () => new Promise(() => {}) } });
    expect(c.webgpu).toBe(false);
  }, 4000);
  it('says which needs are unmet, and counts unknown storage as room', () => {
    const c = { webgpu: false, wasm: true, wasmThreads: false, storageMB: null, microphone: true };
    expect(missing(spec({ needs: ['webgpu', 'storage-1gb', 'wasm'] }), c)).toEqual(['webgpu']);
    expect(missing(spec({ needs: ['local-server'] }), c)).toEqual(['local-server']);
    expect(missing(spec({ needs: ['local-server'] }), c, { localServer: true })).toEqual([]);
  });
  it('offers only admissible, unrefused engines a device can run', () => {
    const strong = { webgpu: true, wasm: true, wasmThreads: false, storageMB: 8000, microphone: true };
    const ears = readiness('ears', strong);
    expect(ears.could.map((e) => e.id)).toEqual(expect.arrayContaining(['whisper-web']));
    const voice = readiness('voice', strong);
    // The build-time voice is not something a device runs; the refused ones never appear.
    expect([...voice.could, ...voice.blocked.map((b) => b.spec)].every((e) => e.status !== 'refused' && e.where !== 'build-time')).toBe(true);
  });
});

describe('silence (VISION, A closed voice)', () => {
  // The device's own speech synthesis and recognition are closed models. Lexi went
  // silent rather than use them, and a later convenience must not quietly undo it.
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(join(import.meta.dirname, '..', '..'));
  it('reaches no closed voice and no closed recogniser anywhere in src/', () => {
    const used = /speechSynthesis\s*\.|new\s+SpeechSynthesisUtterance|(?:webkit)?SpeechRecognition\s*\(/;
    const hits = files.filter((f) => used.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
