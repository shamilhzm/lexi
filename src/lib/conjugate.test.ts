import { describe, it, expect } from 'vitest';
import { conjugate, canConjugate } from './conjugate.ts';

describe('conjugate — irregular table', () => {
  it('sein', () => {
    const c = conjugate('sein');
    expect(c.praesens).toEqual(['bin', 'bist', 'ist', 'sind', 'seid', 'sind']);
    expect(c.praeteritum[0]).toBe('war');
    expect(c.partizip).toBe('gewesen');
    expect(c.aux).toBe('sein');
    expect(c.reliable).toBe(true);
  });

  it('haben', () => {
    const c = conjugate('haben');
    expect(c.praesens[0]).toBe('habe');
    expect(c.praeteritum[0]).toBe('hatte');
    expect(c.partizip).toBe('gehabt');
    expect(c.perfekt[0]).toBe('habe gehabt');
  });

  it('gehen (aux sein)', () => {
    const c = conjugate('gehen');
    expect(c.praeteritum[0]).toBe('ging');
    expect(c.partizip).toBe('gegangen');
    expect(c.aux).toBe('sein');
    expect(c.perfekt[2]).toBe('ist gegangen');
  });
});

describe('conjugate — regular (weak) generation', () => {
  it('machen', () => {
    const c = conjugate('machen');
    expect(c.praesens).toEqual(['mache', 'machst', 'macht', 'machen', 'macht', 'machen']);
    expect(c.praeteritum[0]).toBe('machte');
    expect(c.partizip).toBe('gemacht');
    expect(c.source).toBe('regular');
    expect(c.reliable).toBe(true);
  });

  it('arbeiten inserts the -e- (arbeitest / arbeitete)', () => {
    const c = conjugate('arbeiten');
    expect(c.praesens[1]).toBe('arbeitest'); // du
    expect(c.praesens[2]).toBe('arbeitet');  // er
    expect(c.praeteritum[0]).toBe('arbeitete');
    expect(c.partizip).toBe('gearbeitet');
  });

  it('studieren drops the ge- (studiert)', () => {
    expect(conjugate('studieren').partizip).toBe('studiert');
  });
});

describe('conjugate — separable & reflexive', () => {
  it('aufstehen: prefix detaches, aux sein', () => {
    const c = conjugate('aufstehen');
    expect(c.separable).toBe('auf');
    expect(c.praesens[0]).toBe('stehe auf');
    expect(c.partizip).toBe('aufgestanden');
    expect(c.aux).toBe('sein');
  });

  it('sich freuen: reflexive perfekt carries the pronoun', () => {
    const c = conjugate('sich freuen');
    expect(c.reflexive).toBe(true);
    expect(c.perfekt[0]).toBe('habe mich gefreut');
  });
});

describe('conjugate — Futur I (werden + infinitive)', () => {
  it('regular: ich werde machen / du wirst machen', () => {
    const c = conjugate('machen');
    expect(c.futur1[0]).toBe('werde machen');
    expect(c.futur1[1]).toBe('wirst machen');
    expect(c.futur1[2]).toBe('wird machen');
  });

  it('separable verb keeps its prefix attached (werde aufstehen)', () => {
    expect(conjugate('aufstehen').futur1[0]).toBe('werde aufstehen');
  });

  it('reflexive carries the pronoun (werde mich freuen)', () => {
    expect(conjugate('sich freuen').futur1[0]).toBe('werde mich freuen');
  });
});

describe('conjugate — Konjunktiv II', () => {
  it('regular verb uses the analytic würde-form', () => {
    const c = conjugate('machen');
    expect(c.konjunktiv2[0]).toBe('würde machen');
    expect(c.konjunktiv2[1]).toBe('würdest machen');
  });

  it('sein / haben / modals keep their synthetic forms', () => {
    expect(conjugate('sein').konjunktiv2[0]).toBe('wäre');
    expect(conjugate('haben').konjunktiv2[0]).toBe('hätte');
    expect(conjugate('können').konjunktiv2[0]).toBe('könnte');
    expect(conjugate('werden').konjunktiv2[2]).toBe('würde');
  });

  it('reflexive analytic carries the pronoun (würde mich freuen)', () => {
    expect(conjugate('sich freuen').konjunktiv2[0]).toBe('würde mich freuen');
  });
});

describe('canConjugate — reliability gate', () => {
  it('accepts known regulars and table verbs', () => {
    expect(canConjugate('machen')).toBe(true);
    expect(canConjugate('gehen')).toBe(true);
  });

  it('rejects a separable verb whose base is unknown (aufräumen)', () => {
    // räumen isn't in the table/known set, so a generated participle would be wrong.
    expect(canConjugate('aufräumen')).toBe(false);
  });

  it('rejects a non-verb-shaped token', () => {
    expect(canConjugate('xyz')).toBe(false);
  });
});
