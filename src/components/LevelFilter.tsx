// Shared CEFR level filter — toggles the global level scope used by the market,
// decks, and study sessions. Wraps on small screens.
import { levels, toggleLevel } from '../store.ts';
import { useStore } from '../useStore.ts';
import { ALL_LEVELS } from '../types.ts';

export default function LevelFilter({ compact = false }: { compact?: boolean }) {
  useStore();
  const lv = levels();
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ALL_LEVELS.map((l) => {
        const on = lv.has(l);
        return (
          <button key={l} onClick={() => toggleLevel(l)} aria-pressed={on}
            className={`font-mono px-2 py-1 rounded-md border transition-colors ${compact ? 'text-[0.6875rem]' : 'text-[0.6875rem]'} ${
              on ? 'border-amber text-amber bg-panel2' : 'border-line text-dim hover:text-txt'}`}>{l}</button>
        );
      })}
    </div>
  );
}
