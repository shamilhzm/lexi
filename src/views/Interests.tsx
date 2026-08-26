// Onboarding step (after placement, before the first session): pick a few topics
// you care about. weakestSectors() then draws fresh vocabulary from those groups
// first. Fully optional — you can continue with none and change them in Profile.
import { Compass, ArrowRight } from 'lucide-react';
import { interests } from '../store.ts';
import { useStore } from '../useStore.ts';
import TopicPicker from '../components/TopicPicker.tsx';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Kicker from '../components/ui/Kicker.tsx';

export default function Interests({ onDone }: { onDone: () => void }) {
  useStore();
  const count = interests().size;
  return (
    <div className="w-full max-w-[560px] mx-auto">
      <Card pad="none" className="px-6 py-8">
        <Kicker tone="accent" className="flex items-center gap-1.5 mb-2">
          <Compass size={14} /> Personalise
        </Kicker>
        <h1 className="display text-3xl sm:text-4xl mb-1.5 mt-2">What do you want to talk about?</h1>
        <p className="text-dim text-base mb-5 max-w-[48ch]">
          Pick a few topics you care about and Lexi will pull your new words from them first.
          Optional — you can change these anytime in your profile.
        </p>
        <TopicPicker />
        <Button size="lg" className="mt-7" onClick={onDone}>
          {count ? `Continue with ${count} topic${count === 1 ? '' : 's'}` : 'Skip for now'}
          <ArrowRight size={15} />
        </Button>
      </Card>
    </div>
  );
}
