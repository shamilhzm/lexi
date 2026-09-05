import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initData } from './data/index.ts';
import { hydrate, applyTextScale } from './store.ts';
import { applyTheme, watchSystemTheme } from './theme.ts';

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
    root.render(
      <div style={{ display: 'grid', placeItems: 'center', height: '100dvh', padding: 24, textAlign: 'center', color: '#e6edf3', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#8b97a7' }}>Couldn’t load the lexicon. Check your connection and reload.</p>
        <button onClick={() => location.reload()}
          style={{ marginTop: 16, padding: '10px 18px', borderRadius: 999, border: 0, fontWeight: 700, cursor: 'pointer' }}>
          Reload
        </button>
      </div>,
    );
  });

// Register the service worker for offline use (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
