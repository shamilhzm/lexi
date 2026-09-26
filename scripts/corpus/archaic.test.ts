import { describe, it, expect } from 'vitest';
import { ARCHAIC_SPELLING } from './lib.ts';

describe('pre-1996 spelling check', () => {
  it('flags the old ß spellings', () => {
    for (const s of ['Er muß gehen.', 'Ich weiß, daß du kommst.', 'Muß ich?', 'Sie mußte warten.']) {
      expect(ARCHAIC_SPELLING.test(s), s).toBe(true);
    }
  });
  it('leaves modern ß alone — Muße keeps its ß after a long vowel', () => {
    for (const s of ['Kunst braucht Muße.', 'Die Mußestunde war kurz.', 'Das Maß ist voll.']) {
      expect(ARCHAIC_SPELLING.test(s), s).toBe(false);
    }
  });
});
