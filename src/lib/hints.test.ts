import { describe, it, expect, beforeEach } from 'vitest';
import { tourSeen, markTourSeen, resetTours } from './hints.ts';

describe('first-visit tours', () => {
  beforeEach(() => localStorage.clear());

  it('shows each tour until it is marked, and only that one', () => {
    expect(tourSeen('feed')).toBe(false);
    markTourSeen('feed');
    expect(tourSeen('feed')).toBe(true);
    expect(tourSeen('session')).toBe(false);
  });

  it('brings every tour back on reset', () => {
    markTourSeen('feed');
    markTourSeen('progress');
    resetTours();
    expect(tourSeen('feed')).toBe(false);
    expect(tourSeen('progress')).toBe(false);
  });

  it('survives a corrupt key', () => {
    localStorage.setItem('lexi.hints.v1', '{not json');
    expect(tourSeen('feed')).toBe(false);
    markTourSeen('feed');
    expect(tourSeen('feed')).toBe(true);
  });
});
