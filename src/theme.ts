// Device-local appearance: light / dark / follow-system. Persisted to
// localStorage and applied as a class on <html>. An inline script in index.html
// sets the class before first paint (avoids a flash); this module keeps it in
// sync afterwards and reacts to system changes when following the system.
const KEY = 'lexi.theme.v1';
export type ThemePref = 'system' | 'light' | 'dark';

export function themePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
}

export function resolvedTheme(): 'light' | 'dark' {
  const p = themePref();
  return p === 'system' ? (prefersDark() ? 'dark' : 'light') : p;
}

/** Sync the <html> class + status-bar colour to the current preference. */
export function applyTheme() {
  const t = resolvedTheme();
  const el = document.documentElement;
  el.classList.toggle('light', t === 'light');
  el.classList.toggle('dark', t === 'dark');
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', t === 'light' ? '#faf6e8' : '#0a0d12');
}

export function setThemePref(p: ThemePref) {
  if (p === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, p);
  applyTheme();
}

/** Re-apply when the OS theme flips, but only while following the system. */
export function watchSystemTheme() {
  window.matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', () => { if (themePref() === 'system') applyTheme(); });
}
