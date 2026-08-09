// One line in the recap: where tonight's work landed on the map.
//
// This is the brain earning its place in the daily loop rather than being a
// room you visit. A recap that only counts cards describes the *session*; naming
// the regions describes what the session built, which is the thing the map is
// for — and it is the same fact the hero is about to ignite when you land back
// on Today. Two views of one thing, in the order they happen.
//
// Deliberately a sentence, not another tile. The recap already has a row of
// numbers; a fourth number would say less than three names do.
import { REGION_BY_ID } from '../../lib/brain/atlas.ts';
import { HEX } from '../../lib/brain/palette.ts';
import { peekChangedRegions } from './useBrain.ts';

/** Beyond three the sentence stops being readable and starts being a list. */
const MAX_NAMED = 3;

export default function WhereItLanded({ onOpen }: { onOpen?: () => void }) {
  const touched = peekChangedRegions();
  if (touched.length === 0) return null;

  const named = touched.slice(0, MAX_NAMED);
  const rest = touched.length - named.length;

  const body = (
    <>
      Tonight's work landed in{' '}
      {named.map((t, i) => {
        const r = REGION_BY_ID.get(t.id);
        if (!r) return null;
        return (
          <span key={t.id} className="whitespace-nowrap">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1"
              style={{ background: HEX[t.id], boxShadow: `0 0 6px ${HEX[t.id]}` }}
            />
            <span className="text-txt font-semibold">{r.short}</span>
            {i < named.length - 1 && <span className="text-dim">{i === named.length - 2 && !rest ? ' and ' : ', '}</span>}
          </span>
        );
      })}
      {rest > 0 && <span className="text-dim"> and {rest} more</span>}
      <span className="text-dim">.</span>
    </>
  );

  // A button only when there is somewhere to go. The recap is also rendered in
  // contexts that have no navigation to hand.
  return onOpen ? (
    <button
      onClick={onOpen}
      className="tap-44 w-full text-left text-xs text-dim leading-relaxed rounded-md px-2 py-2 -mx-2
        hover:bg-panel2 transition-colors">
      {body} <span className="text-amber">See the map →</span>
    </button>
  ) : (
    <p className="text-xs text-dim leading-relaxed">{body}</p>
  );
}
