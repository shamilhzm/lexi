// npm run screens — redraw public/screenshots/*.jpg, the phone pictures the install
// sheet shows (manifest.webmanifest → screenshots).
//
// **Why a script** *(2026-11-26)*. The three that shipped were taken by hand on
// 2026-10-12 and still showed the card box, a speaker button and the Hören
// headphones, all of which had gone: an install sheet advertising features the app no
// longer has. Taken by a script, they can be retaken whenever the look moves.
//
// How: headless Chrome over the DevTools protocol (no dependency; Node's own
// WebSocket), a 360×649 phone viewport at 2×, light theme, reduced motion, against a
// running dev server seeded with a persona (`?seed=`, dev only, src/lib/devseed.ts).
//
//   npm run dev            # in another terminal
//   npm run screens        # LEXI_DEV_URL=http://localhost:5173/lexi by default
//
// Maintainer's machine only; the JPEGs are committed. Set CHROME_PATH if needed.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root = process.cwd();
const BASE = (process.env.LEXI_DEV_URL || 'http://localhost:5173/lexi').replace(/\/$/, '');
const W = 360, H = 649, DPR = 2;
const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].find((p): p is string => !!p && existsSync(p));
if (!CHROME) { console.error('screens: no Chrome found (set CHROME_PATH).'); process.exit(1); }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'lexi-screens-'));
  const chrome = spawn(CHROME!, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--disable-extensions', '--disable-background-networking',
    `--user-data-dir=${dir}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    // Chrome writes the port it chose into the profile.
    const portFile = join(dir, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
    const port = readFileSync(portFile, 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as { type: string; webSocketDebuggerUrl: string }[];
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('no page target');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0;
    const pending = new Map<number, (v: any) => void>();
    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data));
      if (m.id && pending.has(m.id)) { pending.get(m.id)!(m); pending.delete(m.id); }
    };
    const send = (method: string, params: object = {}) => new Promise<any>((r) => {
      const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params }));
    }).then((m) => { if (m.error) throw new Error(`${method}: ${m.error.message}`); return m.result; });
    const evaluate = async (expression: string) =>
      (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
    const until = async (expression: string, ms = 15000) => {
      for (let t = 0; t < ms; t += 150) { if (await evaluate(expression)) return; await sleep(150); }
      throw new Error(`timed out waiting for ${expression}`);
    };
    const shoot = async (name: string) => {
      await evaluate('document.fonts.ready.then(() => true)');
      await sleep(600);
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
      const out = join(root, 'public', 'screenshots', `${name}.jpg`);
      writeFileSync(out, Buffer.from(data, 'base64'));
      console.log(`screens: ${name} → ${out}`);
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Emulation.setEmulatedMedia', { features: [
      { name: 'prefers-color-scheme', value: 'light' },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ] });

    // 1 · the feed, for a B1 learner three weeks in.
    await send('Page.navigate', { url: `${BASE}/?seed=b1#/` });
    await until(`!!document.querySelector('[data-word]') && !location.search.includes('seed')`);
    await shoot('feed-word');

    // 2 · search: a card and a dictionary entry under one box.
    await evaluate(`document.querySelector('button[data-tour="search"]')?.click(), true`);
    await until(`!!document.querySelector('input[type="search"]')`);
    await evaluate(`(() => {
      const i = document.querySelector('input[type="search"]');
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(i, 'Haus'); i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); return true;
    })()`);
    await sleep(900);
    await shoot('search');
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true`);

    // 3 · Fortschritt: the sky.
    await evaluate(`location.hash = '#/progress', true`);
    await until(`location.hash === '#/progress' && [...document.querySelectorAll('h2')].some((h) => h.textContent === 'Dein Deutsch')`);
    // The sky is the picture; the headline number sits above the fold without it.
    await evaluate(`[...document.querySelectorAll('h2')].find((h) => h.textContent === 'Dein Deutsch').scrollIntoView({ block: 'start' }), window.scrollBy(0, -12), true`);
    await sleep(900);
    await shoot('progress-sky');

    // 4 · Prüfung: the room.
    await evaluate(`location.hash = '#/exam', true`);
    await until(`location.hash === '#/exam' && document.body.innerText.includes('Prüfung')`);
    await sleep(900);
    await shoot('exam-room');
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((e) => { console.error(`screens: ${(e as Error).message}`); process.exit(1); });
