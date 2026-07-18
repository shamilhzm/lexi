// Onboarding step (after placement, before the first session): pick a few topics
// you care about. weakestSectors() then draws fresh vocabulary from those groups
// first. Fully optional — you can continue with none and change them in Profile.
import { Compass, Sparkles } from 'lucide-react';
import { interests } from '../store.ts';
import { useStore } from '../useStore.ts';
import TopicPicker from '../components/TopicPicker.tsx';

export default function Interests({ onDone }: { onDone: () => void }) {
  useStore();
  const count = interests().size;
  return (
    <div className="max-w-[560px] mx-auto">
      <div className="bg-panel border border-line rounded-[16px] px-6 py-8">
        <div className="flex items-center gap-1.5 text-amber text-[0.6875rem] uppercase tracking-[2px] font-semibold mb-2">
          <Compass size={14} /> Personalize
        </div>
        <h1 className="text-[1.25rem] sm:text-[1.375rem] font-bold mb-1.5">What do you want to talk about?</h1>
        <p className="text-dim text-[0.9375rem] mb-5 max-w-[48ch]">
          Pick a few topics you care about and Lexi will pull your new words from them first.
          Optional — you can change these anytime in your profile.
        </p>
        <TopicPicker />
        <button onClick={onDone}
          className="mt-7 flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-6 py-3 hover:brightness-105">
          <Sparkles size={16} />
          {count ? `Continue with ${count} topic${count === 1 ? '' : 's'}` : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}
