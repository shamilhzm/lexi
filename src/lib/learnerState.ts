// FSRS state → the three buckets the meter reasons about. Shared by every reading
// surface so "known" means one thing across the app.
//
// `learning` deliberately does **not** count toward coverage: a word you are
// still getting wrong is not one you can read past. It is shown separately so the
// learner can see the number is about to move on its own.
import { cardOf } from '../store.ts';
import { State } from '../srs.ts';
import type { WordState } from './coverage.ts';
import type { Word } from '../types.ts';

export function stateOf(w: Word): WordState {
  const c = cardOf(w.id);
  if (!c || c.state === State.New) return 'new';
  return c.state === State.Review ? 'known' : 'learning';
}
