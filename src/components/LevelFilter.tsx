// Shared CEFR level filter — toggles the global level scope used by the market,
// decks, and study sessions.
//
// ## Why it collapses on a phone
//
// Six chips at 44×44 are a **284px row**, and on Progress that row was one of four
// the heatmap card's header wrapped into: measured 2026-08-16 at 375px, the header
// was **200px tall and the first tile did not appear until 465px of an 812px
// viewport** — 57% of the screen spent before the map the surface exists to show
// (BACKLOG #30). The chips cannot simply be made smaller; they are 44×44 because
// the touch-target sweep put them there, and shrinking them re-opens a defect that
// was closed.
//
// So on a phone the row collapses to one control that *states the current scope*
// — "All levels", "A1–B1", "A2, C1" — and expands to the six chips on tap. That is
// strictly more legible than six chips whose selection you have to read off their
// borders, and it is one tap away from the same control. From `sm:` up nothing
// changes: the chips are always shown, because the room is there.
//
// Deliberately not hidden behind an icon. The labels on the Karte/Liste toggle
// were hidden below `sm` once and restored, because unlabelled controls are worst
// exactly where the screen is smallest; the summary keeps a word on screen.
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { levels, toggleLevel } from '../store.ts';
import { useStore } from '../useStore.ts';
import { ALL_LEVELS, type CEFR } from '../types.ts';

/** The current scope in words. Contiguous runs read as a range, which is what a
 *  CEFR selection almost always is; anything else lists the levels, and only a
 *  long non-contiguous selection falls back to a count. */
export function levelSummary(on: Set<CEFR>): string {
  const sel = ALL_LEVELS.filter((l) => on.has(l));
  if (sel.length === 0) return 'No levels';
  if (sel.length === ALL_LEVELS.length) return 'All levels';
  if (sel.length === 1) return sel[0];
  const first = ALL_LEVELS.indexOf(sel[0]);
  const last = ALL_LEVELS.indexOf(sel[sel.length - 1]);
  if (last - first + 1 === sel.length) return `${sel[0]}–${sel[sel.length - 1]}`;
  return sel.length <= 3 ? sel.join(', ') : `${sel.length} levels`;
}

export default function LevelFilter() {
  useStore();
  const [open, setOpen] = useState(false);
  const lv = levels();
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="sm:hidden tap-44 inline-flex items-center gap-1 rounded-md border border-line
          px-2 py-1 font-mono text-2xs text-dim hover:text-txt transition-colors">
        {levelSummary(lv)}
        <ChevronDown size={12} aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${open ? 'flex' : 'hidden'} sm:flex items-center gap-1 flex-wrap`}>
        {ALL_LEVELS.map((l) => {
          const on = lv.has(l);
          return (
            <button key={l} onClick={() => toggleLevel(l)} aria-pressed={on}
              className={`tap-44-sq inline-flex items-center justify-center font-mono text-2xs px-2 py-1
                rounded-md border transition-colors ${
                on ? 'border-accent text-accent bg-panel2' : 'border-line text-dim hover:text-txt'}`}>{l}</button>
          );
        })}
      </div>
    </div>
  );
}
