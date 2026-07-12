// Toggleable chips for the 16 fine-group interest topics. Shared by the
// onboarding step and Profile. Selection persists in the store; weakestSectors()
// floats chosen topics to the front of the daily fresh-vocabulary pick.
import { Check } from 'lucide-react';
import { topicOptions, interests, toggleInterest } from '../store.ts';
import { useStore } from '../useStore.ts';

export default function TopicPicker() {
  useStore();
  const picks = interests();
  return (
    <div className="flex flex-wrap gap-2">
      {topicOptions().map(({ name, cards }) => {
        const on = picks.has(name);
        return (
          <button key={name} onClick={() => toggleInterest(name)} aria-pressed={on}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
              on ? 'bg-amber text-bg border-amber font-semibold' : 'bg-panel2 border-line hover:border-amber'}`}>
            {on && <Check size={13} />}
            {name}
            <span className={`font-mono text-[11px] ${on ? 'opacity-80' : 'text-dim'}`}>{cards}</span>
          </button>
        );
      })}
    </div>
  );
}
