// The layer stack's order. React runs a child's effects before its parent's, so a
// sheet and the entry inside it that open in one commit (a word link) register
// child first. The stack has to put the entry on top anyway, or the entry is made
// `inert` under an invisible sheet (LESSONS, 2026-11-21).
import { describe, it, expect } from 'vitest';
import { stackIndex } from './Layer.tsx';

type E = { name: string; parent: E | null };
const layer = (name: string, parent: E | null = null): E => ({ name, parent });

/** Register in the given order, as the effects would. */
function build(order: E[]): string[] {
  const stack: E[] = [];
  for (const e of order) stack.splice(stackIndex(stack, e), 0, e);
  return stack.map((e) => e.name);
}

describe('the layer stack', () => {
  it('puts each new layer on top when nothing it holds is open', () => {
    const film = layer('film');
    const search = layer('search');
    expect(build([film, search])).toEqual(['film', 'search']);
  });

  it('keeps an entry above the sheet that holds it, even when the entry registers first', () => {
    const sheet = layer('sheet');
    const entry = layer('entry', sheet);
    expect(build([entry, sheet])).toEqual(['sheet', 'entry']);
    expect(build([sheet, entry])).toEqual(['sheet', 'entry']);
  });

  it('goes below a grandchild as well as a child', () => {
    const sheet = layer('sheet');
    const entry = layer('entry', sheet);
    const drill = layer('drill', entry);
    expect(build([drill, entry, sheet])).toEqual(['sheet', 'entry', 'drill']);
  });

  it('leaves a layer it does not hold where it was', () => {
    const film = layer('film');
    const sheet = layer('sheet');
    const entry = layer('entry', sheet);
    expect(build([film, entry, sheet])).toEqual(['film', 'sheet', 'entry']);
  });
});
