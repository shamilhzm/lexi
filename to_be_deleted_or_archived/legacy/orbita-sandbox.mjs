// Test harness: load the real orbita.html <script> into a Node vm sandbox.
//
// orbita.html is a single-file browser app with no module exports, and it boots
// immediately at the bottom of its <script>. To unit-test the *real shipped code*
// (not a copy), we run that script inside a vm context with an in-memory
// localStorage and a universal no-op DOM proxy, so boot completes without a
// browser.
//
// Top-level `function` declarations (srsRate, cefrIndexOf, hashStr, seedDecks,
// srsStats, ...) attach to the context global and are callable as sandbox.<name>.
// Top-level `const`/`let` (STATE, ENERGY_DECK, ...) are NOT exposed — assert via
// the functions' return values and observers (e.g. srsStats) instead.

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function extractScript(html) {
  const open = html.indexOf('<script>');
  if (open === -1) throw new Error('orbita.html: no <script> block found');
  const start = html.indexOf('>', open) + 1;
  const end = html.lastIndexOf('</script>');
  if (end <= start) throw new Error('orbita.html: no closing </script> found');
  return html.slice(start, end);
}

// A value that absorbs any property access or call without throwing — stands in
// for every DOM node / element list the boot sequence touches.
function makeNoop() {
  const noop = new Proxy(function () {}, {
    get(_t, p) {
      if (p === Symbol.iterator) return function* () {};
      if (p === Symbol.toPrimitive) return () => '';
      if (p === 'toString' || p === 'valueOf') return () => '';
      if (p === 'length') return 0;
      return noop;
    },
    set() { return true; },
    apply() { return noop; },
    construct() { return noop; },
    has() { return true; },
  });
  return noop;
}

export function loadOrbita(htmlUrl = new URL('../app/orbita.html', import.meta.url)) {
  const code = extractScript(readFileSync(htmlUrl, 'utf8'));
  const noop = makeNoop();

  const store = new Map();
  const localStorage = {
    getItem: k => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => { store.set(String(k), String(v)); },
    removeItem: k => { store.delete(String(k)); },
    clear: () => store.clear(),
    key: i => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };

  const document = new Proxy({}, {
    get(_t, p) {
      if (p === 'addEventListener' || p === 'removeEventListener') return () => {};
      if (p === 'createElement' || p === 'createElementNS' || p === 'createTextNode') return () => makeNoop();
      if (p === 'getElementById' || p === 'querySelector') return () => makeNoop();
      if (p === 'querySelectorAll' || p === 'getElementsByClassName' || p === 'getElementsByTagName') return () => makeNoop();
      if (p === 'cookie') return '';
      return noop;
    },
    set() { return true; },
  });

  class FileReader { readAsText() {} readAsDataURL() {} addEventListener() {} }

  const sandbox = {
    console,
    localStorage,
    document,
    navigator: { userAgent: 'node-test', language: 'de', languages: ['de'] },
    location: { href: 'file:///orbita.html', search: '', hash: '', pathname: '/orbita.html', reload() {} },
    history: { pushState() {}, replaceState() {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    queueMicrotask: globalThis.queueMicrotask,
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    fetch: () => Promise.reject(new Error('network disabled in tests')),
    alert: () => {}, confirm: () => false, prompt: () => null,
    URL: globalThis.URL, URLSearchParams: globalThis.URLSearchParams,
    Blob: globalThis.Blob, File: globalThis.File, FileReader,
    TextEncoder: globalThis.TextEncoder, TextDecoder: globalThis.TextDecoder,
    crypto: globalThis.crypto, performance: globalThis.performance,
    structuredClone: globalThis.structuredClone,
    atob: globalThis.atob, btoa: globalThis.btoa,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.top = sandbox;
  sandbox.parent = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(code, context, { filename: 'app/orbita.html#script' });
  return sandbox;
}

// Mirror of srsCreateOrUpdate's card shape, for exercising srsRate in isolation.
export function newCard(over = {}) {
  return {
    id: 'test', type: 'vocab', lang: 'de', payload: {},
    created: Date.now(), lastReviewed: null, due: Date.now(),
    interval: 0, ease: 2.5, reps: 0, lapses: 0,
    status: 'new', sourceArticleId: null, history: [], ...over,
  };
}
