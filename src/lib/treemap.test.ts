import { describe, it, expect } from 'vitest';
import { squarify, type TreeItem } from './treemap.ts';

const items = (vals: number[]): TreeItem<number>[] => vals.map((v) => ({ value: v, data: v }));
const area = (t: { w: number; h: number }) => t.w * t.h;

describe('squarify', () => {
  it('lays out one tile per positive item, area proportional to value', () => {
    const W = 400, H = 300;
    const tiles = squarify(items([50, 30, 20]), 0, 0, W, H);
    expect(tiles.length).toBe(3);
    const total = W * H;
    for (const t of tiles) {
      const expected = (t.value / 100) * total;
      expect(area(t)).toBeCloseTo(expected, 4);
    }
  });

  it('fills the rectangle with no gaps (areas sum to w*h)', () => {
    const W = 640, H = 480;
    const tiles = squarify(items([12, 7, 5, 3, 2, 1]), 0, 0, W, H);
    const sum = tiles.reduce((s, t) => s + area(t), 0);
    expect(sum).toBeCloseTo(W * H, 3);
  });

  it('keeps every tile within the bounding rect', () => {
    const W = 500, H = 500;
    const tiles = squarify(items([9, 8, 7, 6, 5, 4, 3, 2, 1]), 0, 0, W, H);
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(-1e-6);
      expect(t.y).toBeGreaterThanOrEqual(-1e-6);
      expect(t.x + t.w).toBeLessThanOrEqual(W + 1e-6);
      expect(t.y + t.h).toBeLessThanOrEqual(H + 1e-6);
    }
  });

  it('produces non-overlapping tiles', () => {
    const tiles = squarify(items([40, 25, 20, 15]), 0, 0, 300, 200);
    const overlaps = (a: typeof tiles[0], b: typeof tiles[0]) =>
      a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 &&
      a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;
    for (let i = 0; i < tiles.length; i++)
      for (let j = i + 1; j < tiles.length; j++)
        expect(overlaps(tiles[i], tiles[j])).toBe(false);
  });

  it('ignores zero/negative values and handles the empty case', () => {
    expect(squarify(items([0, 0]), 0, 0, 100, 100)).toEqual([]);
    expect(squarify([], 0, 0, 100, 100)).toEqual([]);
    expect(squarify(items([5, 0, 5]), 0, 0, 100, 100).length).toBe(2);
  });
});
