import { describe, it, expect } from 'vitest';
import { correctionDiff } from './diff.ts';

const changed = (a: string, b: string) => correctionDiff(a, b).filter((p) => p.changed).map((p) => p.text);

describe('correctionDiff', () => {
  it('flags nothing when the learner was right', () => {
    expect(changed('Ich finde das gut.', 'Ich finde das gut.')).toEqual([]);
  });
  it('flags only the words the correction changed — and both halves of a word-order fix', () => {
    // Verb-final in the dass-clause moves *hat* and *recht*; both are the lesson.
    expect(changed('Ich denke dass die Regierung hat recht.', 'Ich denke, dass die Regierung recht hat.'))
      .toEqual(['denke,', 'recht', 'hat.']);
  });
  it('treats a changed ending as a changed word — the ending is the lesson', () => {
    expect(changed('wegen dem Wetter', 'wegen des Wetters')).toEqual(['des', 'Wetters']);
  });
  it('keeps every character of the corrected text', () => {
    const b = 'Das  ist\nrichtig.';
    expect(correctionDiff('Das ist falsch.', b).map((p) => p.text).join('')).toBe(b);
  });
});
