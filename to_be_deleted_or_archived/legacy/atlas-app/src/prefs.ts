// Tiny dependency-free prefs (separate from the review store so model.ts can
// import it without a cycle): which Explore decks the learner has added to
// their galaxy.
const KEY = 'orbita_prefs_v1';

interface Prefs { addedDecks: string[]; railCollapsed: boolean; marginalOpen: boolean; }

// typeof guard: model.ts (and its tests) import this under Node, no localStorage.
function load(): Prefs {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    const p = JSON.parse(raw || '{}');
    return {
      addedDecks: Array.isArray(p.addedDecks) ? p.addedDecks : [],
      railCollapsed: p.railCollapsed === true,
      marginalOpen: p.marginalOpen === true
    };
  } catch {
    return { addedDecks: [], railCollapsed: false, marginalOpen: false };
  }
}
let P = load();
function persist() { try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* quota */ } }

// Shell layout prefs — Claude-style collapsible panels (left rail + right Marginal).
export function railCollapsed(): boolean { return P.railCollapsed; }
export function setRailCollapsed(on: boolean) { P.railCollapsed = on; persist(); }
export function marginalOpen(): boolean { return P.marginalOpen; }
export function setMarginalOpen(on: boolean) { P.marginalOpen = on; persist(); }

export function addedDecks(): string[] { return P.addedDecks; }
export function isDeckAdded(id: string): boolean { return P.addedDecks.includes(id); }
export function setDeckAdded(id: string, on: boolean) {
  P.addedDecks = on ? [...new Set([...P.addedDecks, id])] : P.addedDecks.filter((d) => d !== id);
  persist();
}
