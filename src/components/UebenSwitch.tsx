// Üben's two halves (2026-11-27): *Heute*, the day's session the scheduler builds,
// and *Kurs*, the path a learner walks on purpose. Both are study, so they share a
// door; the switch says which half you are in and moves between them.
//
// Taps only. A swipe between the halves would be a second horizontal axis, and the
// one axis there is belongs to the word (CLAUDE.md, the gesture grammar).
//
// The pills keep their drawn 34px and take a 44px hit area from `tap-hit`. Side by
// side, the halos grow only vertically, so they cannot overlap each other.
//
// It sits 25px below the column's top in every state of both halves (the session's
// header row centres it at 16 + 8 + 1; Kurs and the empty day give it `mt-[9px]`), so
// switching halves never moves the control under the thumb.
export type UebenHalf = 'heute' | 'kurs';

const LABEL: Record<UebenHalf, string> = { heute: 'Heute', kurs: 'Kurs' };
const HINT: Record<UebenHalf, string> = { heute: 'Today’s session', kurs: 'The course, A1 to C2' };

export default function UebenSwitch({ at, onGo, className = '' }: {
  at: UebenHalf;
  onGo: (half: UebenHalf) => void;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label="Üben" className={`inline-flex flex-shrink-0 p-[3px] rounded-full bg-panel2 border border-line ${className}`}>
      {(['heute', 'kurs'] as const).map((k) => (
        <button key={k} role="tab" aria-selected={at === k} title={HINT[k]}
          onClick={() => { if (at !== k) onGo(k); }}
          className={`tap-hit h-[34px] px-3.5 rounded-full text-sm font-semibold transition-colors ${
            at === k ? 'bg-key text-key-ink' : 'text-dim hover:text-txt'}`}>
          <span lang="de" translate="no">{LABEL[k]}</span>
        </button>
      ))}
    </div>
  );
}
