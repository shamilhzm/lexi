import { describe, it, expect } from 'vitest';
import { validatePicto } from './picto.ts';

// The grammar's three worked examples (panel 03) must pass as written.
const TASSE = '<path d="M12 20V30A8 8 0 0 0 20 38H24A8 8 0 0 0 32 30V20Z"/><path d="M32 23A4 4 0 0 1 32 31"/><path d="M10 42H34"/><path d="M19 16L21 14L19 12L21 10"/><path d="M25 16L27 14L25 12L27 10"/>';
const LAUFEN = '<circle cx="31" cy="9" r="3" fill="currentColor"/><path d="M28 15L23 25"/><path d="M27 17L31 21L35 17"/><path d="M27 17L21 20L19 16"/><path d="M23 25L31 29L27 37"/><path d="M23 25L19 33L11 37"/><path d="M6 42H42"/>';
const HOCH = '<path d="M28 42V16L33 11L38 16V42Z" fill="currentColor"/><path d="M10 42V33L14 29L18 33V42"/><path d="M6 42H42"/>';

describe('pictogram validator', () => {
  it('passes the grammar’s worked examples', () => {
    expect(validatePicto(TASSE)).toEqual([]);
    expect(validatePicto(LAUFEN)).toEqual([]);
    expect(validatePicto(HOCH)).toEqual([]);
  });

  it('is the security boundary: no script, no handler, no foreign element', () => {
    expect(validatePicto('<script>alert(1)</script>')).not.toEqual([]);
    expect(validatePicto('<path d="M10 10H20" onload="x()"/>')).not.toEqual([]);
    expect(validatePicto('<image href="x.png"/>')).not.toEqual([]);
    expect(validatePicto('<path d="M10 10H20"/><g></g>')).not.toEqual([]);
  });

  it('keeps colour on the page, not in the asset', () => {
    expect(validatePicto('<path d="M10 10H20" fill="#f00"/>')).not.toEqual([]);
    expect(validatePicto('<path d="M10 10H20" stroke="red"/>')).not.toEqual([]);
  });

  it('holds the geometry: integers, live area, directions, arcs', () => {
    expect(validatePicto('<path d="M10.5 10H20"/>')).not.toEqual([]);
    expect(validatePicto('<path d="M2 10H20"/>')).not.toEqual([]);
    expect(validatePicto('<path d="M10 10L13 20"/>')).not.toEqual([]);   // 3:10 — off the set
    expect(validatePicto('<path d="M10 10C12 12 14 14 16 16"/>')).not.toEqual([]);
    expect(validatePicto('<path d="M10 20A5 5 0 0 1 15 25"/>')).not.toEqual([]); // r=5 not allowed
    expect(validatePicto('<path d="m10 10h10"/>')).not.toEqual([]);      // relative commands
  });

  it('caps solids at two', () => {
    const three = '<circle cx="10" cy="10" r="2" fill="currentColor"/>'.repeat(3);
    expect(validatePicto(three).some((e) => e.includes('solid'))).toBe(true);
  });
});
