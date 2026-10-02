import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initData } from './data/index.ts';
import { hydrate, applyTextScale } from './store.ts';
import { applyTheme, watchSystemTheme } from './theme.ts';
import { shouldReloadForChunk } from './lib/chunkReload.ts';
import { audioBusy } from './lib/player.ts';
import { dropRefParam } from './lib/ref.ts';

// The splash watchdog in `index.html` stands down the moment this module runs.
// From here on the boot has its own budgets (below) and its own error screen; the
// watchdog exists for the case where none of this code ever loaded.
(window as Window & { __lexiBooted?: boolean }).__lexiBooted = true;

// A `?ref=` campaign tag is for the host's request log and nothing else — see
// lib/ref.ts. First, before any code reads `location`.
dropRefParam();
applyTheme();
watchSystemTheme();
applyTextScale(); // rem ramp: apply the learner’s text-size choice before paint

const root = createRoot(document.getElementById('root')!);

/** How long the boot waits for stored progress before painting without it.
 *  Well past a real hydrate (tens of milliseconds, even for a large card map)
 *  and well short of the point where somebody force-quits. */
const HYDRATE_BUDGET_MS = 4000;

/** How long the boot waits for the corpus before giving up and saying so.
 *  Generous — this is three fetches over whatever connection a phone has on a
 *  train — but finite, because the alternative is a splash with no end. */
const LEXICON_BUDGET_MS = 15000;

// Ask the browser to mark our storage durable. Progress is local-first, so
// eviction (notably Safari’s 7-day ITP cleanup for non-installed sites) is
// total data loss. Chrome grants silently on engagement; installed PWAs get
// durability anyway; a refusal is harmless — the install nudge + backups are
// the fallback.
navigator.storage?.persist?.().catch(() => {});

// Persona seeding, development only. `import.meta.env.DEV` is replaced with a
// literal at build time, so the whole branch and the module it imports are
// dropped from a production bundle — verified with
// `npm run build && grep -c devseed dist/assets/*.js`.
//
// Runs *before* `hydrate()`, because it writes the store that hydrate is about
// to read — and then simply falls through to it. No reload: see the note in
// devseed on why one loops on Safari.
async function boot() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('seed')) {
    const [{ applySeedFromUrl }, store] = await Promise.all([
      import('./lib/devseed.ts'),
      import('./store.ts'),
    ]);
    await initData();                       // the seeder picks words out of the lexicon
    // Budgeted like the hydrate below and for the same reason: a wedged store
    // must not be able to hold the splash open, not even in a dev branch.
    await Promise.race([
      applySeedFromUrl(store.importData),
      new Promise((r) => setTimeout(r, HYDRATE_BUDGET_MS)),
    ]);
  }
  // The lexicon is not optional — without it there is no app. But "not optional"
  // is a reason to **fail**, not a reason to hang: an unbudgeted `await` on three
  // `fetch`es is a splash that can stay up forever, and a learner staring at a
  // logo has no idea whether to wait or reload. Budgeted so the failure becomes
  // the error screen below, which at least says what to do.
  await Promise.race([
    initData(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('lexicon-timeout')), LEXICON_BUDGET_MS)),
  ]);

  // **Progress is optional to *start*.** `hydrate()` reads IndexedDB, and the
  // one thing this app must never do is sit on its boot splash forever: the
  // learner's history is on disk either way, and an app that will not open is
  // worse than one that opens without it.
  //
  // `lib/idb.ts` already bounds a *hung open request*. This bounds the rest —
  // a blocked transaction, a wedged origin, a storage layer that accepts the
  // open and then never answers. Caught on an iOS Simulator whose site data had
  // been left half-written: the splash animated forever, with no error to show
  // and no fallback reached, because nothing had rejected.
  //
  // A late hydrate is harmless: the store emits and React re-renders.
  await Promise.race([
    hydrate(),
    new Promise((r) => setTimeout(r, HYDRATE_BUDGET_MS)),
  ]);
  root.render(<StrictMode><App /></StrictMode>);
}

// Load the lexicon and hydrate the learner’s progress (IndexedDB) before first
// paint, so the app renders with real data in one shot.
boot()
  .catch((err) => {
    console.error('Failed to load lexicon', err);
    // Tokens, not hex. The old literals (#e6edf3 on #8b97a7) were written for the
    // dark console theme and read at roughly 2.5:1 on the warm paper ground the
    // app has used since 2026-08-26 — the one screen that has to be legible.
    //
    // The second button is for a cache that is itself the problem: it clears the
    // worker and Cache Storage (`updateNow`) and never touches progress.
    const btn = { marginTop: 12, padding: '10px 18px', borderRadius: 999, fontWeight: 700, cursor: 'pointer', font: 'inherit' } as const;
    root.render(
      <div role="alert" style={{ display: 'grid', placeItems: 'center', alignContent: 'center', gap: 4, height: '100dvh', padding: 24, textAlign: 'center', color: 'var(--color-txt)', fontFamily: 'var(--font-sans)' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Couldn’t load the lexicon.</p>
        <p style={{ margin: 0, color: 'var(--color-dim)' }}>Check your connection and reload. Your progress is still on this device.</p>
        <button onClick={() => location.reload()}
          style={{ ...btn, border: 0, background: 'var(--color-accent)', color: 'var(--color-bg)' }}>
          Reload
        </button>
        <button onClick={() => { void import('./lib/build.ts').then((m) => m.updateNow()); }}
          style={{ ...btn, border: '1px solid var(--color-line)', background: 'transparent', color: 'var(--color-txt)' }}>
          Reload without the cache
        </button>
      </div>,
    );
  });

// A lazy chunk of this build that the server no longer has — see lib/chunkReload.ts.
// Only the reload decision lives there; `preventDefault` tells Vite not to rethrow,
// because the page is about to be replaced. When the answer is no, the error
// reaches the view's ErrorBoundary as before.
window.addEventListener('vite:preloadError', (event) => {
  // Not while Hören or Practise aloud is playing: a reload would end the programme
  // in somebody's pocket. The view's ErrorBoundary says what happened instead.
  if (audioBusy()) return;
  const reload = shouldReloadForChunk({
    now: Date.now(),
    online: navigator.onLine !== false,
    storage: (() => { try { return sessionStorage; } catch { return null; } })(),
  });
  if (!reload) return;
  event.preventDefault();
  location.reload();
});

// Register the service worker for offline use (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

// Take the newest build, once, while booting. The decision lives in
// `lib/build.ts` — it has three guards against a reload loop and they are worth
// a test, which a module side effect is not. Fired on `load` and behind a
// dynamic import so it cannot delay the first word on the screen; that is the
// whole point of the cache-first worker it exists to complete.
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  const check = async () => {
    const { reloadIfBuildMoved } = await import('./lib/build.ts');
    await reloadIfBuildMoved({
      now: () => performance.now(),
      storage: (() => { try { return sessionStorage; } catch { return null; } })(),
      // A new build waits for the programme to end (lib/player.ts); the next
      // launch picks it up.
      reload: () => { if (!audioBusy()) location.reload(); },
    });
  };
  if (document.readyState === 'complete') void check();
  else window.addEventListener('load', () => { void check(); }, { once: true });
}

// The attested inflection table, after first paint and never before it.
//
// Nothing on the feed uses the matcher, so this is 370 KB the common session
// does not have to wait for; the matcher rebuilds itself when it lands. Fired on
// `load` rather than immediately for the same reason the service worker is —
// whatever is still fetching for the first screen should finish first.
if (typeof window !== 'undefined') {
  const kick = () => { void import('./lib/inflections.ts').then((m) => m.loadInflections()); };
  if (document.readyState === 'complete') kick();
  else window.addEventListener('load', kick, { once: true });
}
