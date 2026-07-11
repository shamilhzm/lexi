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
